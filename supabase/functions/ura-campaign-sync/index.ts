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
    const contentType = req.headers.get("content-type") ?? "";

    // ── MODE 1: Audio Upload (multipart/form-data) ──────────────────────
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const campaignId = formData.get("campaign_id");
      const nodeId = formData.get("node_id");
      const audioFile = formData.get("audio");
      const nome = formData.get("nome") ?? (audioFile instanceof File ? audioFile.name : "audio");

      if ((!campaignId && !nodeId) || !audioFile) {
        return new Response(JSON.stringify({ error: "campaign_id or node_id and audio are required." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check/Create the public bucket "ura-audios" in Supabase Storage
      const { data: bucketData, error: bucketErr } = await supabase.storage.getBucket("ura-audios");
      if (bucketErr || !bucketData) {
        console.log("[ura-campaign-sync] Bucket 'ura-audios' not found. Creating it...");
        await supabase.storage.createBucket("ura-audios", { public: true });
      }

      const fileObj = audioFile as File;
      const fileExt = fileObj.name.split('.').pop() || "mp3";
      const filePath = `${nodeId || campaignId}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("ura-audios")
        .upload(filePath, fileObj, {
          contentType: fileObj.type || "audio/mpeg",
          upsert: true,
        });

      if (uploadErr) {
        console.error("[ura-campaign-sync] Storage upload failed:", uploadErr);
        return new Response(JSON.stringify({ error: "Storage upload failed", detail: uploadErr.message }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("ura-audios")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      if (campaignId) {
        await (supabase as any).from("ura_campaigns").update({ audio_value: String(nome) }).eq("id", String(campaignId));
      } else if (nodeId) {
        const { data: nodeData, error: nodeFetchErr } = await supabase
          .from("sequence_nodes")
          .select("config")
          .eq("id", String(nodeId))
          .single();
        if (!nodeFetchErr && nodeData) {
          const config = (nodeData.config || {}) as Record<string, any>;
          config.audio = {
            ...(config.audio || {}),
            type: "audio",
            mosAudioName: String(nome),
            fileUrl: publicUrl
          };
          await supabase.from("sequence_nodes").update({ config }).eq("id", String(nodeId));
        }
      }

      return new Response(JSON.stringify({ ok: true, nome: String(nome), fileUrl: publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MODE 2: Sync Campaign to MOS BR (JSON) ──────────────────────────
    const body = await req.json();
    const campaignId = body.campaign_id;
    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaign_id is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: camp, error: fetchErr } = await (supabase as any)
      .from("ura_campaigns").select("*").eq("id", campaignId).single();

    if (fetchErr || !camp) {
      return new Response(JSON.stringify({ error: "Campaign not found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mosCampaignId = camp.mos_campaign_id ?? null;

    const payload: Record<string, unknown> = { name: camp.name };
    if (camp.service_id) payload.serviceId = camp.service_id;
    if (camp.regra_renitencia_id) payload.regraRenitenciaId = camp.regra_renitencia_id;
    if (camp.cost_center_name) payload.costCenterName = camp.cost_center_name;
    if (camp.data_termino) payload.dataTermino = camp.data_termino;
    if (camp.agressividade) payload.agressividade = camp.agressividade;
    if (camp.limite_canais_ativos != null) payload.limite_canais_ativos = camp.limite_canais_ativos;
    if (camp.limite_canais != null) payload.limite_canais = camp.limite_canais;

    let mosRes: Response;
    if (mosCampaignId) {
      mosRes = await fetch(MOS_BASE + "/tvoz/campaigns/" + mosCampaignId + "/", {
        method: "PATCH",
        headers: { Authorization: mosBasicAuth(), "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      mosRes = await fetch(MOS_BASE + "/tvoz/campaigns/", {
        method: "POST",
        headers: { Authorization: mosBasicAuth(), "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
    }

    const mosBodyText = await mosRes.text();
    if (!mosRes.ok) {
      console.error("[ura-campaign-sync] Campaign sync failed:", mosBodyText);
      return new Response(JSON.stringify({ error: "MOS BR campaign sync failed", detail: mosBodyText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let mosData: Record<string, unknown> = {};
    try { mosData = JSON.parse(mosBodyText); } catch { /* noop */ }

    const newMosId = mosData?.id ?? mosData?.campaignId ?? mosCampaignId;
    if (newMosId) {
      await (supabase as any).from("ura_campaigns").update({ mos_campaign_id: newMosId }).eq("id", campaignId);
    }

    return new Response(JSON.stringify({ ok: true, mos_campaign_id: newMosId, mos_response: mosData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    const err = e as Error;
    console.error("[ura-campaign-sync] Unhandled error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
