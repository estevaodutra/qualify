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
  automationCampaignId: string;
  automationSequenceId: string;
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
    if (!body.prospectingCampaignId || !body.automationCampaignId || !body.automationSequenceId) {
      return new Response(
        JSON.stringify({ error: "prospectingCampaignId, automationCampaignId e automationSequenceId são obrigatórios" }),
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

    // Also allowed on an already-dispatching campaign: this is how the
    // monitoring page's "adicionar leads à fila" control enqueues newly
    // selected leads into a campaign whose automation is already running.
    if (!["awaiting_approval", "dispatching"].includes(campaign.status)) {
      return new Response(
        JSON.stringify({ error: "Esta campanha não está aguardando aprovação nem em automação" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        automation_campaign_id: body.automationCampaignId,
        automation_sequence_id: body.automationSequenceId,
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
