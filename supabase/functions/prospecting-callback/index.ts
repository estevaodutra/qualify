import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logProspectingEvent } from "../_shared/prospecting-events.ts";
import { notifyProspecting } from "../_shared/prospecting-alerts.ts";
import { enqueueProspectingLeads } from "../_shared/prospecting-queue.ts";
import { scoreLead } from "../_shared/prospecting-qualification.ts";
import { resolveLeadPhones, cleanPhoneDigits } from "../_shared/prospecting-phone-parser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CallbackLead {
  name?: string;
  title?: string;
  phone?: string;
  phoneUnformatted?: string;
  whatsapp?: string;
  mobile?: string;
  phones?: string[];
  website?: string;
  categoryName?: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  totalScore?: number;
  reviewsCount?: number;
  url?: string;
  googleUrl?: string;
  location?: { lat?: number; lng?: number };
  [key: string]: unknown;
}

interface CallbackRequest {
  prospecting_campaign_id?: string;
  campaign_id?: string;
  leads?: CallbackLead[];
  totals?: {
    received?: number;
    valid?: number;
    invalid?: number;
  };
  eventType?: string;
  eventData?: {
    actorId?: string;
    actorRunId?: string;
    defaultDatasetId?: string;
  };
  resource?: {
    id?: string;
    defaultDatasetId?: string;
    status?: string;
  };
}

const PAST_EXTRACTION_STATUSES = [
  "validating",
  "dispatching",
  "awaiting_approval",
  "completed",
  "paused",
];

const isValidPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const digits = cleanPhoneDigits(phone);
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

    const url = new URL(req.url);

    let body: CallbackRequest = {};
    try {
      body = await req.json();
    } catch {
      // Body vazio ou não-JSON
    }

    const campaignId =
      url.searchParams.get("campaign_id") ||
      body.prospecting_campaign_id ||
      body.campaign_id;

    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaign_id or prospecting_campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("prospecting_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campanha não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Tratamento de falhas do Apify ──
    const isApifyFailed =
      body.eventType === "ACTOR.RUN.FAILED" ||
      body.eventType === "ACTOR.RUN.TIMED_OUT" ||
      body.eventType === "ACTOR.RUN.ABORTED" ||
      url.searchParams.get("status") === "failed" ||
      body.resource?.status === "FAILED";

    if (isApifyFailed) {
      console.warn(`[ProspectingCallback] Apify Run falhou para a campanha ${campaign.id}`);
      await supabase.from("prospecting_campaigns").update({ status: "failed" }).eq("id", campaign.id);
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.failed",
        payload: { reason: "apify_run_failed", eventType: body.eventType, resource: body.resource },
      });
      await notifyProspecting(supabase, {
        companyId: campaign.company_id,
        userId: campaign.user_id,
        severity: "error",
        title: "Falha na prospecção",
        description: "A execução da raspagem no Apify falhou ou expirou.",
        entity: `prospecting_campaign:${campaign.id}`,
      });
      return new Response(JSON.stringify({ success: true, status: "failed" }), {
        status: 200,
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

    // ── Obtenção dos Leads (seja por dataset Apify ou por payload direto) ──
    let rawLeads: CallbackLead[] = [];
    const datasetId = body.resource?.defaultDatasetId || body.eventData?.defaultDatasetId;

    if (datasetId) {
      let apifyToken = url.searchParams.get("token") || Deno.env.get("APIFY_TOKEN");

      if (!apifyToken && campaign.company_id) {
        const { data: cred } = await supabase
          .from("company_credentials")
          .select("encrypted_key")
          .eq("company_id", campaign.company_id)
          .eq("service_name", "apify")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cred?.encrypted_key) {
          apifyToken = cred.encrypted_key;
        }
      }

      if (!apifyToken) {
        const { data: globalCred } = await supabase
          .from("company_credentials")
          .select("encrypted_key")
          .eq("service_name", "apify")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (globalCred?.encrypted_key) {
          apifyToken = globalCred.encrypted_key;
        }
      }

      if (!apifyToken) {
        throw new Error("Token da Apify não encontrado para baixar o dataset.");
      }

      console.log(`[ProspectingCallback] Baixando dataset ${datasetId} da Apify...`);
      const datasetRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${encodeURIComponent(apifyToken)}&clean=true`
      );

      if (!datasetRes.ok) {
        const errText = await datasetRes.text();
        console.error("[ProspectingCallback] Erro ao baixar dataset da Apify:", datasetRes.status, errText);
        throw new Error(`Erro ao baixar dataset da Apify (${datasetRes.status}): ${errText}`);
      }

      rawLeads = await datasetRes.json();
      console.log(`[ProspectingCallback] ${rawLeads.length} itens recebidos da Apify.`);
    } else {
      rawLeads = body.leads ?? [];
    }

    await logProspectingEvent(supabase, {
      companyId: campaign.company_id,
      campaignId: campaign.id,
      eventType: "prospecting.extraction_completed",
      payload: { totals: body.totals ?? { received: rawLeads.length } },
    });

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

    // Resolver a etapa da pipeline se a campanha estiver configurada para enviar para CRM
    const targetPipelineId: string | null =
      campaign.pipeline_id || (campaign.queue_policy as any)?.pipeline_id || null;
    let defaultPipelineStageId: string | null =
      campaign.stage_id || (campaign.queue_policy as any)?.stage_id || null;
    if (targetPipelineId && !defaultPipelineStageId) {
      const { data: firstStage } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("pipeline_id", targetPipelineId)
        .order("order_index", { ascending: true })
        .limit(1)
        .maybeSingle();
      defaultPipelineStageId = firstStage?.id || null;
    }

    const savedLeadIds: string[] = [];
    const enrichmentLayers: string[] = Array.isArray(campaign.enrichment_layers)
      ? campaign.enrichment_layers
      : ["google_maps"];
    const websiteLayerEnabled = enrichmentLayers.includes("website");

    for (const rawLead of rawLeads) {
      // ── Classificação inteligente e automática de telefones (Fixo vs WhatsApp) ──
      const resolved = resolveLeadPhones(rawLead);
      const rawFallbackPhone = rawLead.phone || rawLead.phoneUnformatted || null;

      const mainPhone = resolved.mainPhone || rawFallbackPhone;
      const telefoneFixo = resolved.telefoneFixo || null;

      if (!isValidPhone(mainPhone) && !isValidPhone(telefoneFixo)) {
        await logProspectingEvent(supabase, {
          companyId: campaign.company_id,
          campaignId: campaign.id,
          eventType: "prospecting.lead_discarded_no_phone",
          payload: { name: rawLead.name || rawLead.title, rawLead },
        });
        continue;
      }

      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.lead_found",
        payload: { name: rawLead.name || rawLead.title, phone: mainPhone, telefone_fixo: telefoneFixo },
      });

      let leadId: string;

      // ── Busca de lead existente (deduplicação por telefone principal ou fixo) ──
      let existingLead = null;
      if (mainPhone) {
        const { data: byMain } = await supabase
          .from("leads")
          .select("id, custom_fields, active_campaign_id, phone, telefone_fixo")
          .eq("company_id", campaign.company_id)
          .eq("phone", mainPhone)
          .maybeSingle();
        existingLead = byMain;
      }

      if (!existingLead && telefoneFixo) {
        const { data: byFixo } = await supabase
          .from("leads")
          .select("id, custom_fields, active_campaign_id, phone, telefone_fixo")
          .eq("company_id", campaign.company_id)
          .eq("telefone_fixo", telefoneFixo)
          .maybeSingle();
        existingLead = byFixo;
      }

      const leadName = rawLead.name || rawLead.title || "Novo Lead";
      const leadAddress =
        rawLead.address ||
        [rawLead.street, rawLead.city, rawLead.state].filter(Boolean).join(", ") ||
        null;

      const mergedCustomFields = {
        ...(existingLead?.custom_fields || {}),
        ...rawLead,
        telefone_fixo: telefoneFixo || existingLead?.telefone_fixo || null,
        is_whatsapp: resolved.isWhatsapp,
        phone_type: resolved.type,
        address: leadAddress,
        website: rawLead.website || null,
        google_maps_url: rawLead.url || rawLead.googleUrl || null,
      };

      if (existingLead) {
        leadId = existingLead.id;
        const updatePayload: Record<string, unknown> = {
          custom_fields: mergedCustomFields,
          active_campaign_id: existingLead.active_campaign_id ?? campaign.id,
          source_campaign_id: campaign.id,
          company_name: leadName,
          website: rawLead.website || null,
        };

        if (telefoneFixo && !existingLead.telefone_fixo) {
          updatePayload.telefone_fixo = telefoneFixo;
        }

        // Se o lead existente só tinha telefone fixo e agora temos WhatsApp
        if (resolved.isWhatsapp && existingLead.phone !== mainPhone) {
          if (!existingLead.telefone_fixo) {
            updatePayload.telefone_fixo = existingLead.phone;
          }
          updatePayload.phone = mainPhone;
        }

        await supabase
          .from("leads")
          .update(updatePayload)
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
            name: leadName,
            company_name: leadName,
            website: rawLead.website || null,
            phone: mainPhone,
            telefone_fixo: telefoneFixo,
            custom_fields: mergedCustomFields,
            active_campaign_id: campaign.id,
            active_campaign_type: "prospecting",
            source_type: "prospecting",
            source_name: "Google Maps (Apify)",
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

      // ── Criação automática de Card na Pipeline do CRM ──
      if (targetPipelineId && defaultPipelineStageId) {
        try {
          const { data: existingDeal } = await supabase
            .from("deals")
            .select("id")
            .eq("lead_id", leadId)
            .eq("pipeline_id", targetPipelineId)
            .maybeSingle();

          if (!existingDeal) {
            await supabase.from("deals").insert({
              company_id: campaign.company_id,
              lead_id: leadId,
              pipeline_id: targetPipelineId,
              stage_id: defaultPipelineStageId,
              title: leadName,
              status: "open",
              priority: "medium",
              value: 0,
              currency: "BRL",
            });

            await logProspectingEvent(supabase, {
              companyId: campaign.company_id,
              campaignId: campaign.id,
              leadId,
              eventType: "prospecting.deal_created",
              payload: { pipeline_id: targetPipelineId, stage_id: defaultPipelineStageId },
            });
          }
        } catch (dealErr) {
          console.error("[ProspectingCallback] Erro ao criar card de negócio:", dealErr);
        }
      }

      // Registro do job de enriquecimento do Google Maps
      await supabase.from("prospecting_enrichment_jobs").upsert(
        {
          company_id: campaign.company_id,
          prospecting_campaign_id: campaign.id,
          lead_id: leadId,
          layer_type: "google_maps",
          status: "completed",
          result_data: rawLead,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
        { onConflict: "prospecting_campaign_id,lead_id,layer_type" }
      );

      // Qualificação automática inicial
      try {
        const score = scoreLead(rawLead);
        await supabase
          .from("leads")
          .update({
            qualification_score: score.score,
            qualification_label: score.label,
          })
          .eq("id", leadId);
      } catch (scoreErr) {
        console.warn("[ProspectingCallback] Score calculation failed:", scoreErr);
      }

      // Se enriquecimento de website estiver ativo e houver website, agenda job
      if (websiteLayerEnabled && rawLead.website) {
        try {
          const { data: job } = await supabase
            .from("prospecting_enrichment_jobs")
            .insert({
              company_id: campaign.company_id,
              prospecting_campaign_id: campaign.id,
              lead_id: leadId,
              layer_type: "website",
              status: "pending",
            })
            .select("id")
            .single();

          if (job) {
            // Disparo não-bloqueante da função de website
            fetch(`${supabaseUrl}/functions/v1/prospecting-enrich-website`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                jobId: job.id,
                websiteUrl: rawLead.website,
                leadId,
                campaignId: campaign.id,
                companyId: campaign.company_id,
              }),
            }).catch((err) => console.error("[ProspectingCallback] Website enrich trigger error:", err));
          }
        } catch (jobErr) {
          console.error("[ProspectingCallback] Failed to create website enrichment job:", jobErr);
        }
      }

      savedLeadIds.push(leadId);
    }

    // ── Transição de status final da campanha ──
    if (campaign.destination_mode === "direct_to_queue") {
      await supabase.from("prospecting_campaigns").update({ status: "dispatching" }).eq("id", campaign.id);
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.status_changed",
        payload: { from: "extracting", to: "dispatching" },
      });

      if (savedLeadIds.length > 0) {
        await enqueueProspectingLeads(supabase, {
          companyId: campaign.company_id,
          campaignId: campaign.id,
          leadIds: savedLeadIds,
          automationSequenceId: campaign.automation_sequence_id,
          instanceId: campaign.instance_id,
          queuePolicy: campaign.queue_policy,
        });
      }

      await notifyProspecting(supabase, {
        companyId: campaign.company_id,
        userId: campaign.user_id,
        severity: "success",
        title: "Prospecção concluída",
        description: `Encontramos ${savedLeadIds.length} contatos válidos${targetPipelineId ? " e adicionamos cards na Pipeline" : ""}.`,
        entity: `prospecting_campaign:${campaign.id}`,
      });
    } else if (campaign.destination_mode === "review_before_start") {
      await supabase.from("prospecting_campaigns").update({ status: "awaiting_approval" }).eq("id", campaign.id);
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.status_changed",
        payload: { from: "extracting", to: "awaiting_approval" },
      });
      await notifyProspecting(supabase, {
        companyId: campaign.company_id,
        userId: campaign.user_id,
        severity: "info",
        title: "Aguardando aprovação",
        description: `${savedLeadIds.length} leads prontos para sua revisão antes do disparo.`,
        entity: `prospecting_campaign:${campaign.id}`,
      });
    } else {
      // save_only: Apenas salva os leads no CRM
      await supabase.from("prospecting_campaigns").update({ status: "completed" }).eq("id", campaign.id);
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.completed",
        payload: { leadsCount: savedLeadIds.length },
      });
      await notifyProspecting(supabase, {
        companyId: campaign.company_id,
        userId: campaign.user_id,
        severity: "success",
        title: "Busca concluída",
        description: `${savedLeadIds.length} novos contatos salvos no sistema${targetPipelineId ? " com cards na Pipeline" : ""}.`,
        entity: `prospecting_campaign:${campaign.id}`,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaignId: campaign.id,
        leadsProcessed: savedLeadIds.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[ProspectingCallback] Unhandled error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
