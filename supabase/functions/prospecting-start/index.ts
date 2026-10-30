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

    // Validação de acesso à empresa
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

    // 1. Obter Token e Ator da Apify via platform_settings (Super Admin), variável de ambiente ou company_credentials
    let apifyToken = Deno.env.get("APIFY_TOKEN");
    let actorId = "compass~crawler-google-places";

    const { data: platformSetting } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "apify_config")
      .maybeSingle();

    if (platformSetting?.value?.api_key) {
      if (!apifyToken) {
        apifyToken = platformSetting.value.api_key;
      }
      if (platformSetting.value.actor_id) {
        actorId = String(platformSetting.value.actor_id).replace("/", "~");
      }
    }

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
      throw new Error("Token da Apify não configurado nas credenciais da plataforma (Super Admin > Integrações > Apify).");
    }

    // 2. Preparar inputs para o crawler do Google Places da Apify
    const searchQuery = campaign.search_terms || "";
    const location = campaign.places || "";
    const searchString = location ? `${searchQuery} in ${location}` : searchQuery;

    const defaultLang = platformSetting?.value?.default_language || "pt-BR";

    const actorInput = {
      searchStringsArray: [searchString],
      locationQuery: location || undefined,
      maxCrawledPlacesPerSearch: campaign.quantity || platformSetting?.value?.default_max_places || 50,
      maxCrawledPlaces: campaign.quantity || platformSetting?.value?.default_max_places || 50,
      language: defaultLang,
      exportPlaceUrls: false,
      includeHistogram: false,
      includeOpeningHours: platformSetting?.value?.extract_hours ?? true,
      includePeopleAlsoSearch: false,
      maxImages: 0,
    };

    // 3. Montar Webhook ad-hoc na Apify para chamar de volta a função prospecting-callback
    const publicSupabaseUrl =
      Deno.env.get("PUBLIC_SUPABASE_URL") ||
      Deno.env.get("API_EXTERNAL_URL") ||
      "https://qualify-supabase.d2x.site";

    const callbackUrl = `${publicSupabaseUrl}/functions/v1/prospecting-callback?campaign_id=${campaign.id}&token=${encodeURIComponent(apifyToken)}`;
    const webhooks = [
      {
        eventTypes: ["ACTOR.RUN.SUCCEEDED"],
        requestUrl: callbackUrl,
      },
      {
        eventTypes: ["ACTOR.RUN.FAILED", "ACTOR.RUN.TIMED_OUT", "ACTOR.RUN.ABORTED"],
        requestUrl: `${callbackUrl}&status=failed`,
      },
    ];

    const base64Webhooks = btoa(JSON.stringify(webhooks));
    const normalizedActor = actorId.replace("/", "~");
    const apifyUrl = `https://api.apify.com/v2/acts/${normalizedActor}/runs?token=${encodeURIComponent(apifyToken)}&webhooks=${encodeURIComponent(base64Webhooks)}`;

    console.log(`[ProspectingStart] Disparando Apify Actor (${normalizedActor}) para campanha ${campaign.id}...`);

    const apifyRes = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput),
    });

    if (!apifyRes.ok) {
      const errText = await apifyRes.text();
      console.error("[ProspectingStart] Falha no disparo Apify:", apifyRes.status, errText);

      await supabase
        .from("prospecting_campaigns")
        .update({ status: "failed" })
        .eq("id", campaign.id);

      await logProspectingEvent(supabase, {
        companyId: campaign.company_id,
        campaignId: campaign.id,
        eventType: "prospecting.failed",
        payload: { reason: "apify_error", status: apifyRes.status, error: errText },
      });

      return new Response(
        JSON.stringify({ error: `Erro no Apify (${apifyRes.status}): ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const runData = await apifyRes.json();
    const runId = runData.data?.id;

    console.log(`[ProspectingStart] Apify Run iniciada com sucesso. Run ID: ${runId}`);

    // Atualizar status para extracting
    await supabase
      .from("prospecting_campaigns")
      .update({ status: "extracting" })
      .eq("id", campaign.id);

    await logProspectingEvent(supabase, {
      companyId: campaign.company_id,
      campaignId: campaign.id,
      eventType: "prospecting.started",
      payload: { apify_run_id: runId, search_terms: searchString, quantity: campaign.quantity },
    });

    await notifyProspecting(supabase, {
      companyId: campaign.company_id,
      userId: user.id,
      severity: "info",
      title: "Prospecção iniciada no Google Maps",
      description: `Buscando ${campaign.quantity} empresas para "${searchString}".`,
      entity: `prospecting_campaign:${campaign.id}`,
    });

    return new Response(
      JSON.stringify({ success: true, campaignId: campaign.id, apifyRunId: runId }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[ProspectingStart] Erro inesperado:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
