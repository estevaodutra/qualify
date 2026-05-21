import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOS_BASE = "https://plataforma.mosbr.io/api/v2";

function mosBasicAuth(): string {
  const user = Deno.env.get("MOS_BR_USER") ?? "";
  const pass = Deno.env.get("MOS_BR_PASS") ?? "";
  if (!user || !pass) throw new Error("MOS_BR_USER or MOS_BR_PASS not configured.");
  return "Basic " + btoa(user + ":" + pass);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { campaign_id, lead_id } = await req.json();

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Obter detalhes da campanha
    const { data: camp, error: campErr } = await (supabase as any)
      .from("ura_campaigns")
      .select("*, ura_leads(id, phone, status)")
      .eq("id", campaign_id)
      .single();

    if (campErr || !camp) throw new Error("Campanha nao encontrada.");
    if (!camp.mos_campaign_id) throw new Error("Campanha ainda nao esta sincronizada com a MOS BR.");
    if (!camp.audio_value) throw new Error("A campanha precisa ter um audio configurado.");

    // 2. Filtrar os leads a serem disparados
    let targetLeads = [];
    if (lead_id) {
      // Disparo unitario especifico
      targetLeads = (camp.ura_leads || []).filter((l: any) => l.id === lead_id);
      if (targetLeads.length === 0) throw new Error("Lead nao encontrado nesta campanha.");
    } else {
      // Disparo em lote
      targetLeads = (camp.ura_leads || []).filter((l: any) => l.status === "pending" || l.status === "failed");
    }
    
    if (targetLeads.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Nenhum lead valido para disparar." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // A MOS BR aceita ate 10.000 leads por lote.
    const batch = targetLeads.slice(0, 10000);

    const payload = {
      sendTvozMultiRequest: {
        campaignId: camp.mos_campaign_id,
        defaultValues: {
          audio: camp.audio_value,
        },
        sendTvozRequestList: batch.map((lead: any) => ({
          to: lead.phone,
          id: lead.id, // O ID do lead vai no campo ID para identificarmos no callback!
        })),
      },
    };

    // 3. Enviar para MOS BR
    const res = await fetch(`${MOS_BASE}/tvoz/multi/`, {
      method: "POST",
      headers: {
        Authorization: mosBasicAuth(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const mosBody = await res.text();
    if (!res.ok) {
      console.error("[ura-campaign-dispatch] MOS BR failed:", mosBody);
      throw new Error(`Erro na MOS BR: ${mosBody}`);
    }

    // 4. Marcar leads como Em Execucao
    const leadIds = batch.map((l: any) => l.id);
    await (supabase as any)
      .from("ura_leads")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .in("id", leadIds);

    return new Response(JSON.stringify({ ok: true, count: batch.length, mos_response: mosBody }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("[ura-campaign-dispatch] Erro:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
