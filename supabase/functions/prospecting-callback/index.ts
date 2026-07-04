import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logProspectingEvent } from "../_shared/prospecting-events.ts";
import { notifyProspecting } from "../_shared/prospecting-alerts.ts";
import { enqueueProspectingLeads } from "../_shared/prospecting-queue.ts";
import { scoreLead } from "../_shared/prospecting-qualification.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CallbackLead {
  name?: string;
  title?: string;
  phone?: string;
  phoneUnformatted?: string;
  website?: string;
  categoryName?: string;
  category?: string;
  address?: string;
  totalScore?: number;
  reviewsCount?: number;
  [key: string]: unknown;
}

interface CallbackRequest {
  prospecting_campaign_id: string;
  totals?: {
    requested?: number;
    found?: number;
    valid?: number;
    invalid?: number;
    duplicates?: number;
  };
  leads?: CallbackLead[];
  errors?: unknown[];
  execution_time?: number;
}

// Statuses at or beyond which a second callback for the same campaign
// must be treated as a duplicate and ignored (idempotency guard).
const PAST_EXTRACTION_STATUSES = [
  "validating", "enriching", "awaiting_approval", "preparing_queue",
  "dispatching", "paused", "completed", "partially_completed", "failed", "cancelled",
];

const isValidPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CallbackRequest = await req.json();
    if (!body.prospecting_campaign_id) {
      return new Response(JSON.stringify({ error: "prospecting_campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("prospecting_campaigns")
      .select("*")
      .eq("id", body.prospecting_campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campanha não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (PAST_EXTRACTION_STATUSES.includes(campaign.status)) {
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.duplicate_callback_ignored",
      });
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("prospecting_campaigns").update({ status: "validating" }).eq("id", campaign.id);
    await logProspectingEvent(supabase, {
      companyId: campaign.company_id,
      campaignId: campaign.id,
      eventType: "prospecting.extraction_completed",
      payload: { totals: body.totals ?? {} },
    });

    const rawLeads = body.leads ?? [];
    if (rawLeads.length === 0) {
      await supabase.from("prospecting_campaigns").update({ status: "failed" }).eq("id", campaign.id);
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.failed",
        payload: { reason: "no_leads_returned" },
      });
      await notifyProspecting(supabase, {
        companyId: campaign.company_id,
        userId: campaign.user_id,
        severity: "error",
        title: "Falha na prospecção",
        description: "Nenhum contato foi retornado pela busca.",
        entity: `prospecting_campaign:${campaign.id}`,
      });
      return new Response(JSON.stringify({ success: true, leadsProcessed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const savedLeadIds: string[] = [];
    const enrichmentLayers: string[] = Array.isArray(campaign.enrichment_layers)
      ? campaign.enrichment_layers
      : ["google_maps"];
    const websiteLayerEnabled = enrichmentLayers.includes("website");

    for (const rawLead of rawLeads) {
      const phone = rawLead.phone || rawLead.phoneUnformatted || null;
      if (!isValidPhone(phone)) {
        await logProspectingEvent(supabase, {
          companyId: campaign.company_id,
          campaignId: campaign.id,
          eventType: "prospecting.lead_failed",
          payload: { reason: "invalid_phone", raw: rawLead },
        });
        continue;
      }

      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.lead_found",
        payload: { name: rawLead.name || rawLead.title },
      });

      let leadId: string;

      const { data: existingLead } = await supabase
        .from("leads")
        .select("id, custom_fields, active_campaign_id")
        .eq("company_id", campaign.company_id)
        .eq("phone", phone)
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
        const mergedCustomFields = { ...(existingLead.custom_fields || {}), ...rawLead };
        await supabase
          .from("leads")
          .update({
            custom_fields: mergedCustomFields,
            active_campaign_id: existingLead.active_campaign_id ?? campaign.id,
            source_campaign_id: campaign.id,
          })
          .eq("id", leadId);
        await logProspectingEvent(supabase, {
          companyId: campaign.company_id,
          campaignId: campaign.id,
          leadId,
          eventType: "prospecting.lead_deduplicated",
        });
      } else {
        const { data: newLead, error: insertError } = await supabase
          .from("leads")
          .insert({
            user_id: campaign.user_id,
            company_id: campaign.company_id,
            name: rawLead.name || rawLead.title || "Sem nome",
            phone,
            custom_fields: rawLead,
            active_campaign_id: campaign.id,
            active_campaign_type: "prospecting",
            source_type: "prospecting",
            source_name: "Google Maps",
            source_campaign_id: campaign.id,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("[ProspectingCallback] Failed to insert lead:", insertError);
          await logProspectingEvent(supabase, {
            companyId: campaign.company_id,
            campaignId: campaign.id,
            eventType: "prospecting.lead_failed",
            payload: { reason: "insert_failed", error: insertError.message },
          });
          continue;
        }
        leadId = newLead.id;
      }

      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        leadId,
        eventType: "prospecting.lead_validated",
      });

      // Google Maps layer is already fully resolved by the extraction itself.
      await supabase.from("prospecting_enrichment_jobs").upsert(
        {
          company_id: campaign.company_id,
          prospecting_campaign_id: campaign.id,
          lead_id: leadId,
          layer_type: "google_maps",
          status: "completed",
          result_data: rawLead,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "lead_id,layer_type,prospecting_campaign_id" }
      );

      // Initial qualification pass using only google_maps signals; the
      // website enrichment function (if triggered below) recomputes this
      // once its own layer completes, folding in email/whatsapp/social signals.
      const initialScore = scoreLead(rawLead, null);
      await supabase
        .from("leads")
        .update({ qualification_score: initialScore.score, qualification_label: initialScore.label })
        .eq("id", leadId);

      savedLeadIds.push(leadId);

      if (websiteLayerEnabled && rawLead.website) {
        // Fire-and-forget: a failure enriching one lead's website must never
        // block/invalidate the rest of the batch or the google_maps data.
        fetch(`${supabaseUrl}/functions/v1/prospecting-enrich-website`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            leadId,
            prospectingCampaignId: campaign.id,
            url: rawLead.website,
          }),
        }).catch((err) => console.error("[ProspectingCallback] website enrichment dispatch failed:", err));
      }
    }

    await supabase.from("prospecting_campaigns").update({ status: "enriching" }).eq("id", campaign.id);
    await logProspectingEvent(supabase, {
      companyId: campaign.company_id,
      campaignId: campaign.id,
      eventType: "prospecting.enrichment_started",
      payload: { layers: enrichmentLayers },
    });

    if (savedLeadIds.length === 0) {
      await supabase.from("prospecting_campaigns").update({ status: "failed" }).eq("id", campaign.id);
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.failed",
        payload: { reason: "no_valid_leads" },
      });
      return new Response(JSON.stringify({ success: true, leadsProcessed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logProspectingEvent(supabase, {
      companyId: campaign.company_id,
      campaignId: campaign.id,
      eventType: "prospecting.enrichment_completed",
      payload: { leadsEnriched: savedLeadIds.length },
    });

    for (const err of body.errors ?? []) {
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.lead_failed",
        payload: { error: err },
      });
    }

    // Branch on destination_mode
    if (campaign.destination_mode === "save_only") {
      await supabase.from("prospecting_campaigns").update({ status: "completed" }).eq("id", campaign.id);
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.completed",
      });
      await notifyProspecting(supabase, {
        companyId: campaign.company_id,
        userId: campaign.user_id,
        severity: "success",
        title: "Prospecção concluída",
        description: `Encontramos ${savedLeadIds.length} contatos válidos.`,
        entity: `prospecting_campaign:${campaign.id}`,
      });
    } else if (campaign.destination_mode === "review_before_start") {
      await supabase.from("prospecting_campaigns").update({ status: "awaiting_approval" }).eq("id", campaign.id);
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.awaiting_approval",
      });
      await notifyProspecting(supabase, {
        companyId: campaign.company_id,
        userId: campaign.user_id,
        severity: "info",
        title: "Prospecção aguardando aprovação",
        description: `Encontramos ${savedLeadIds.length} contatos válidos. Revise os leads antes de iniciar a automação.`,
        entity: `prospecting_campaign:${campaign.id}`,
      });
    } else if (campaign.destination_mode === "auto_start") {
      await supabase.from("prospecting_campaigns").update({ status: "preparing_queue" }).eq("id", campaign.id);
      const { queued } = await enqueueProspectingLeads(supabase, {
        campaign: campaign as any,
        leadIds: savedLeadIds,
      });
      await supabase.from("prospecting_campaigns").update({ status: "dispatching" }).eq("id", campaign.id);
      await notifyProspecting(supabase, {
        companyId: campaign.company_id,
        userId: campaign.user_id,
        severity: "success",
        title: "Automação iniciada",
        description: `${queued} leads foram adicionados à fila.`,
        entity: `prospecting_campaign:${campaign.id}`,
      });
    }

    return new Response(
      JSON.stringify({ success: true, leadsProcessed: savedLeadIds.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ProspectingCallback] Unhandled error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
