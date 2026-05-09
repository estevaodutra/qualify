import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompileContextRequest {
  executionId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { executionId } = await req.json() as CompileContextRequest;

    if (!executionId) {
      return new Response(JSON.stringify({ error: "executionId is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Fetch execution and campaign data
    const { data: execution, error: execError } = await supabase
      .from("context_executions")
      .select("*, context_campaigns(*)")
      .eq("id", executionId)
      .single();

    if (execError || !execution) {
      throw new Error(`Execution not found: ${execError?.message}`);
    }

    if (execution.status === "completed") {
      return new Response(JSON.stringify({ success: true, message: "Already processed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const campaign = execution.context_campaigns;
    const groupJid = campaign.group_jid;
    const startAt = execution.start_at;
    const endAt = execution.end_at;

    // 2. Fetch all events in the window
    const { data: events, error: eventsError } = await supabase
      .from("webhook_events")
      .select("event_type, chat_name, chat_jid, sender_name, sender_phone, raw_event, event_timestamp")
      .eq("chat_jid", groupJid)
      .gte("received_at", startAt)
      .lte("received_at", endAt)
      .order("event_timestamp", { ascending: true });

    if (eventsError) throw eventsError;

    // 3. Compile data into arrays
    const compilation = {
      texts: [] as string[],
      images: [] as string[],
      audios: [] as string[],
      videos: [] as string[],
      documents: [] as string[],
      reactions: [] as string[],
      members_joined: [] as string[],
      members_left: [] as string[],
    };

    events.forEach(event => {
      const raw = event.raw_event as any;
      const sender = event.sender_name || event.sender_phone || "Desconhecido";

      // Z-API wraps text inside body.text.message; other providers use body.text or message.conversation
      const textContent = raw.body?.text?.message || raw.body?.text || raw.message?.conversation || raw.message?.extendedTextMessage?.text || "";

      switch (event.event_type) {
        case "text_message":
          if (textContent) compilation.texts.push(`${sender}: ${textContent}`);
          break;

        case "image_message": {
          // Z-API: body.image.imageUrl  |  fallback: body.imageUrl / imageUrl
          const imgUrl = raw.body?.image?.imageUrl || raw.body?.imageUrl || raw.imageUrl || "";
          const caption = raw.body?.image?.caption || "";
          if (imgUrl) compilation.images.push(imgUrl);
          if (caption) compilation.texts.push(`${sender} [imagem]: ${caption}`);
          break;
        }

        case "audio_message": {
          // Z-API: body.audio.audioUrl
          const audioUrl = raw.body?.audio?.audioUrl || raw.body?.audioUrl || raw.audioUrl || "";
          if (audioUrl) compilation.audios.push(audioUrl);
          break;
        }

        case "video_message": {
          // Z-API: body.video.videoUrl
          const videoUrl = raw.body?.video?.videoUrl || raw.body?.videoUrl || raw.videoUrl || "";
          const videoCaption = raw.body?.video?.caption || "";
          if (videoUrl) compilation.videos.push(videoUrl);
          if (videoCaption) compilation.texts.push(`${sender} [vídeo]: ${videoCaption}`);
          break;
        }

        case "document_message": {
          // Z-API: body.document.documentUrl
          const docUrl = raw.body?.document?.documentUrl || raw.body?.documentUrl || raw.documentUrl || "";
          const docName = raw.body?.document?.fileName || raw.body?.document?.title || "";
          if (docUrl) compilation.documents.push(docName ? `${docName}: ${docUrl}` : docUrl);
          break;
        }

        case "reaction": {
          const reaction = raw.body?.reaction?.value || raw.body?.reactionValue || "";
          if (reaction) compilation.reactions.push(`${sender} reagiu com ${reaction}`);
          break;
        }

        case "group_join":
          compilation.members_joined.push(sender);
          break;

        case "group_leave":
          compilation.members_left.push(sender);
          break;
      }
    });

    const payload = {
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      execution_id: execution.id,
      trigger_message: execution.trigger_message,
      group: {
        name: events[0]?.chat_name || "Grupo",
        jid: groupJid
      },
      window: {
        start: startAt,
        end: endAt
      },
      summary: {
        total_events: events.length,
        text_count: compilation.texts.length,
        image_count: compilation.images.length,
        audio_count: compilation.audios.length
      },
      data: compilation
    };

    // 4. Send to Webhook
    let webhookStatus = "success";
    let webhookResponse = null;

    try {
      const response = await fetch(campaign.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      webhookStatus = response.ok ? "success" : "failed";
      webhookResponse = await response.text();
    } catch (e) {
      webhookStatus = "error";
      webhookResponse = e.message;
    }

    // 5. AUTO-SEND CLOSING MESSAGE
    if (campaign.closing_message && webhookStatus === "success") {
      try {
        // Find an active instance for this company to send the message
        let activeInstance = null;
        
        if (campaign.instance_id) {
          const { data: inst } = await supabase
            .from("instances")
            .select("*")
            .eq("id", campaign.instance_id)
            .single();
          activeInstance = inst;
        }

        if (!activeInstance || activeInstance.status !== "connected") {
          const { data: fallback } = await supabase
            .from("instances")
            .select("*")
            .eq("user_id", campaign.user_id)
            .eq("status", "connected")
            .limit(1)
            .maybeSingle();
          activeInstance = fallback;
        }

        if (activeInstance) {
          const WEBHOOK_URL = "https://n8n-n8n.nuwfic.easypanel.host/webhook/send_messages";
          const payload = {
            action: "message.send_text",
            campaign: { id: campaign.id, name: campaign.name },
            instance: {
              id: activeInstance.id,
              name: activeInstance.name,
              phone: activeInstance.phone || "",
              provider: activeInstance.provider,
              externalId: activeInstance.external_instance_id,
              externalToken: activeInstance.external_instance_token
            },
            destination: {
              phone: groupJid.split("@")[0],
              jid: groupJid,
              name: events[0]?.chat_name || "Grupo"
            },
            node: {
              id: "context_closing",
              type: "text",
              config: { text: campaign.closing_message }
            }
          };

          await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          console.log(`[compile-context] Closing message sent for campaign ${campaign.id}`);
        }
      } catch (e) {
        console.error("[compile-context] Error sending closing message:", e);
      }
    }

    // 6. Update execution status
    await supabase
      .from("context_executions")
      .update({
        status: webhookStatus === "success" ? "completed" : "failed",
        result_payload: {
          webhook_status: webhookStatus,
          webhook_response: webhookResponse,
          summary: payload.summary
        }
      })
      .eq("id", execution.id);

    return new Response(JSON.stringify({ success: true, payload }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[compile-context] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
