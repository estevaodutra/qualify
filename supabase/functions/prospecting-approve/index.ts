import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logProspectingEvent } from "../_shared/prospecting-events.ts";
import { notifyProspecting } from "../_shared/prospecting-alerts.ts";
import { enqueueProspectingLeads } from "../_shared/prospecting-queue.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApproveRequest {
  prospectingCampaignId: string;
  selectedLeadIds: string[];
  automationCampaignId?: string;
  automationSequenceId?: string;
  instanceId?: string;
  queuePolicy?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ApproveRequest = await req.json();
    const effectiveSequenceId = body.automationSequenceId || body.automationCampaignId;
    if (!body.prospectingCampaignId || !effectiveSequenceId) {
      return new Response(
        JSON.stringify({ error: "prospectingCampaignId e automação (sequência) são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("prospecting_campaigns")
      .select("*")
      .eq("id", body.prospectingCampaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campanha não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (campaign.company_id) {
      const { data: membership } = await supabase
        .from("company_members")
        .select("id")
        .eq("company_id", campaign.company_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: "Sem acesso a esta campanha" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (campaign.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Sem acesso a esta campanha" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mergedQueuePolicy = { ...(campaign.queue_policy || {}), ...(body.queuePolicy || {}) };

    const { data: updatedCampaign, error: updateError } = await supabase
      .from("prospecting_campaigns")
      .update({
        automation_campaign_id: body.automationCampaignId || null,
        automation_sequence_id: effectiveSequenceId,
        instance_id: body.instanceId ?? campaign.instance_id,
        queue_policy: mergedQueuePolicy,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        status: "preparing_queue",
      })
      .eq("id", campaign.id)
      .select("*")
      .single();

    if (updateError || !updatedCampaign) {
      throw updateError ?? new Error("Falha ao atualizar a campanha");
    }

    // Se a campanha tiver pipeline associada, garantir criação dos cards dos leads selecionados
    if (campaign.pipeline_id) {
      try {
        let targetStageId = campaign.stage_id;
        if (!targetStageId) {
          const { data: firstStage } = await supabase
            .from("pipeline_stages")
            .select("id")
            .eq("pipeline_id", campaign.pipeline_id)
            .order("order_index", { ascending: true })
            .limit(1)
            .maybeSingle();
          targetStageId = firstStage?.id || null;
        }

        if (targetStageId) {
          for (const leadId of body.selectedLeadIds) {
            const { data: existingDeal } = await supabase
              .from("deals")
              .select("id")
              .eq("lead_id", leadId)
              .eq("pipeline_id", campaign.pipeline_id)
              .maybeSingle();

            if (!existingDeal) {
              const { data: leadData } = await supabase
                .from("leads")
                .select("name, phone, company_name")
                .eq("id", leadId)
                .maybeSingle();

              await supabase.from("deals").insert({
                company_id: campaign.company_id,
                lead_id: leadId,
                pipeline_id: campaign.pipeline_id,
                stage_id: targetStageId,
                title: leadData?.company_name || leadData?.name || "Novo Lead Prospectado",
                status: "open",
                priority: "medium",
                value: 0,
                currency: "BRL",
              });
            }
          }
        }
      } catch (dealErr) {
        console.error("[ProspectingApprove] Erro ao sincronizar cards na pipeline:", dealErr);
      }
    }

    await logProspectingEvent(supabase, {
      companyId: campaign.company_id,
      campaignId: campaign.id,
      eventType: "prospecting.approved",
      payload: { selectedLeads: body.selectedLeadIds.length },
    });

    const { queued } = await enqueueProspectingLeads(supabase, {
      campaign: updatedCampaign as any,
      leadIds: body.selectedLeadIds,
    });

    await supabase.from("prospecting_campaigns").update({ status: "dispatching" }).eq("id", campaign.id);

    await notifyProspecting(supabase, {
      companyId: campaign.company_id,
      userId: user.id,
      severity: "success",
      title: "Automação iniciada",
      description: `${queued} leads foram adicionados à fila.`,
      entity: `prospecting_campaign:${campaign.id}`,
    });

    return new Response(JSON.stringify({ success: true, queued }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ProspectingApprove] Unhandled error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
