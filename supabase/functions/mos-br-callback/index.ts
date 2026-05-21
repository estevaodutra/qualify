import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callback = payload.callbackTvozRequest ?? payload.callbackTvozShippingLotEvent;
  if (!callback) {
    return new Response(JSON.stringify({ error: "Missing callback data" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const mosCampaignId = callback.campaignId;
  const dtmf = callback.dtmf ?? null;
  const phone = callback.number ?? null;
  const status = callback.statusNome ?? callback.status ?? null;

  // Guardar o payload bruto para auditoria
  await (supabase as any).from("mos_callbacks").insert({
    ura_campaign_id: null,
    mos_campaign_id: mosCampaignId,
    dtmf,
    phone,
    status,
    raw_payload: payload,
  });

  // Se houver DTMF, tenta executar a ação configurada na campanha
  if (mosCampaignId && dtmf) {
    const { data: camp, error } = await (supabase as any)
      .from("ura_campaigns")
      .select("id, dtmf_actions")
      .eq("mos_campaign_id", mosCampaignId)
      .single();

    if (!error && camp) {
      const actions: Record<string, any> = camp.dtmf_actions ?? {};
      const action = actions[dtmf];
      if (action) {
        // Exemplo simplificado: apenas webhook está suportado por enquanto
        if (action.type === "webhook" && action.url) {
          try {
            await fetch(action.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                uraCampaignId: camp.id,
                dtmf,
                phone,
                mosCampaignId,
              }),
            });
          } catch (e) {
            console.error("Webhook DTMF failed", e);
          }
        }
        // Outros tipos (sequência, enviar outro TVOZ, etc.) podem ser adicionados aqui.
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
