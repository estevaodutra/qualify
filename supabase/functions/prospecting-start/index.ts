import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logProspectingEvent } from "../_shared/prospecting-events.ts";
import { notifyProspecting } from "../_shared/prospecting-alerts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StartRequest {
  prospectingCampaignId: string;
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

    const body: StartRequest = await req.json();
    if (!body.prospectingCampaignId) {
      return new Response(JSON.stringify({ error: "prospectingCampaignId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("prospecting_campaigns")
      .select("*")
      .eq("id", body.prospectingCampaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campanha de prospecção não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Defense in depth: RLS already governs the row the client could have
    // inserted, but re-verify company membership here too since this
    // function runs with the service-role client (bypasses RLS).
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

    await supabase
      .from("prospecting_campaigns")
      .update({ status: "extracting" })
      .eq("id", campaign.id);

    await logProspectingEvent(supabase, {
      companyId: campaign.company_id,
      campaignId: campaign.id,
      eventType: "prospecting.started",
    });

    await notifyProspecting(supabase, {
      companyId: campaign.company_id,
      userId: user.id,
      severity: "info",
      title: "Prospecção iniciada",
      description: "Estamos buscando empresas no Google Maps.",
      entity: `prospecting_campaign:${campaign.id}`,
    });

    const n8nWebhookUrl = Deno.env.get("N8N_PROSPECTING_WEBHOOK_URL");
    if (!n8nWebhookUrl) {
      console.error("[ProspectingStart] N8N_PROSPECTING_WEBHOOK_URL is not configured");
      await supabase
        .from("prospecting_campaigns")
        .update({ status: "failed" })
        .eq("id", campaign.id);
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.failed",
        payload: { reason: "missing_webhook_url" },
      });
      return new Response(
        JSON.stringify({ error: "Webhook de prospecção não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enrichmentLayers = Array.isArray(campaign.enrichment_layers)
      ? campaign.enrichment_layers
      : ["google_maps"];

    const payload = {
      event: "prospecting.started",
      company_id: campaign.company_id,
      user_id: campaign.user_id,
      prospecting_campaign_id: campaign.id,
      callback_url: `${supabaseUrl}/functions/v1/prospecting-callback`,
      search: {
        name: campaign.name,
        query: campaign.search_terms,
        location: campaign.places,
        quantity: campaign.quantity,
        category: campaign.category,
        strict_match: campaign.exact_names,
      },
      enrichment_layers: enrichmentLayers,
      destination: {
        mode: campaign.destination_mode,
        require_approval: campaign.destination_mode === "review_before_start",
        automation_id: campaign.automation_sequence_id,
        instance_id: campaign.instance_id,
      },
      queue_policy: campaign.queue_policy,
    };

    // Fire-and-forget: n8n is expected to acknowledge immediately and call
    // prospecting-callback back when the scrape finishes, so this tab/request
    // never has to stay open for the extraction itself.
    fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(async (err) => {
      console.error("[ProspectingStart] Failed to reach n8n webhook:", err);
      await supabase
        .from("prospecting_campaigns")
        .update({ status: "failed" })
        .eq("id", campaign.id);
      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.failed",
        payload: { reason: "webhook_unreachable", error: String(err) },
      });
    });

    return new Response(JSON.stringify({ success: true, campaignId: campaign.id }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ProspectingStart] Unhandled error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
