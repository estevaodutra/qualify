import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  extractContext,
  type ClassificationResult,
  type EventContext,
} from "../_shared/event-classifier.ts";

// Import Controllers
import { processMessageEvent } from "./controllers/MessageController.ts";
import { processStatusEvent } from "./controllers/StatusController.ts";
import { processPresenceEvent } from "./controllers/PresenceController.ts";
import { processConnectionEvent } from "./controllers/ConnectionController.ts";
import { processGroupEvent } from "./controllers/GroupController.ts";

import { MessageIngestionService } from "../_shared/message-ingestion.ts";
import { SupportedMessageType } from "../_shared/message-schemas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface InboundPayload {
  action?: string;
  source?: string;
  provider?: string;
  instance_id: string;
  received_at?: string;
  waha_api_key?: string;
  raw_event: Record<string, any>;
}

const ingestionService = new MessageIngestionService();

const SUPPORTED_MESSAGE_TYPES: SupportedMessageType[] = [
  "text", "image", "audio", "voice", "video", "video-note",
  "document", "sticker", "location", "contact", "contacts",
  "poll", "poll-vote", "poll_vote", "reaction", "edited", "revoked", "status", "delivered", "read", "sent", "failed", "ack"
];

// Version: 2026-08-24.18
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let requestBodyObj: any = null;
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  let responseBodyObj: any = null;
  let statusCode = 200;
  let companyId: string | null = null;
  let instanceUserId: string | null = null;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const bodyText = await req.text();
    try { requestBodyObj = JSON.parse(bodyText); } catch { requestBodyObj = { rawText: bodyText }; }
    const payload = requestBodyObj as Partial<InboundPayload>;

    // Validação compatível
    if (!payload.instance_id || !payload.raw_event) {
      responseBodyObj = { success: false, error: "Missing required fields: instance_id, raw_event" };
      statusCode = 400;
      throw new Error("Missing required fields");
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    let semanticType: SupportedMessageType | null = null;
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const part = pathParts[i].toLowerCase();
      if (SUPPORTED_MESSAGE_TYPES.includes(part as SupportedMessageType)) {
        semanticType = part as SupportedMessageType;
        break;
      }
    }

    // Se for rota semântica (ex: /messages/text ou /webhooks/messages/image ou /messages/status)
    if (semanticType) {
      const meta = { endpoint: url.pathname, method: req.method, ipAddress, startTime };
      const result = await ingestionService.ingest(semanticType, payload as any, meta);
      return new Response(JSON.stringify(result.body), {
        status: result.statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se vier uma ação explícita de status (ex: message.delivered, message.read, message.status)
    const actionStr = String(payload.action || "").toLowerCase();
    if (
      actionStr === "message.status" ||
      actionStr === "message.delivered" ||
      actionStr === "message.read" ||
      actionStr === "message.sent" ||
      actionStr === "message.ack" ||
      actionStr === "message_status" ||
      actionStr === "message_delivered" ||
      actionStr === "message_read"
    ) {
      const meta = { endpoint: url.pathname, method: req.method, ipAddress, startTime };
      const result = await ingestionService.ingest("status", payload as any, meta);
      return new Response(JSON.stringify(result.body), {
        status: result.statusCode,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Roteamento semântico para Resposta / Voto de Enquete (Poll Vote)
    if (
      url.pathname.includes("/polls/vote") ||
      url.pathname.includes("/messages/poll-vote") ||
      url.pathname.includes("/messages/poll_vote") ||
      url.pathname.includes("/polls/response")
    ) {
      const raw = payload.raw_event || payload;
      const rawFromPhone = String(raw.from_phone || raw.respondent_phone || raw.phone || raw.lid || raw.from_lid || raw.voter_lid || raw.from_id || "");
      let candidateLid: string | null = null;
      let candidatePhone: string | null = null;

      if (rawFromPhone.includes("@lid")) {
        candidateLid = rawFromPhone.trim();
      } else if (rawFromPhone.replace(/\D/g, "").length >= 8) {
        candidatePhone = rawFromPhone.split("@")[0].replace(/\D/g, "");
      }

      if (!candidateLid) {
        const lidVal = String(raw.lid || raw.from_lid || raw.voter_lid || raw.id || "");
        if (lidVal.includes("@lid")) candidateLid = lidVal.trim();
      }

      // Query database by LID if phone is missing or candidate is LID
      if (candidateLid && !candidatePhone) {
        const { data: leadMatch } = await supabase
          .from("leads")
          .select("phone, name")
          .eq("lid", candidateLid)
          .not("phone", "is", null)
          .limit(1)
          .maybeSingle();

        if (leadMatch?.phone) {
          candidatePhone = leadMatch.phone.replace(/\D/g, "");
        } else {
          const { data: memberMatch } = await supabase
            .from("group_members")
            .select("phone, name")
            .eq("lid", candidateLid)
            .not("phone", "is", null)
            .limit(1)
            .maybeSingle();
          if (memberMatch?.phone) {
            candidatePhone = memberMatch.phone.replace(/\D/g, "");
          }
        }
      }

      const finalPhone = candidatePhone || rawFromPhone.split("@")[0].replace(/\D/g, "");

      const pollPayload = {
        message_id: raw.message_id || raw.poll_message_id || raw.id,
        instance_id: payload.instance_id,
        group_jid: raw.group_id || raw.group_jid || raw.chat_jid || "",
        respondent: {
          phone: finalPhone,
          lid: candidateLid,
          name: raw.from_name || raw.respondent_name || "",
          jid: raw.from_jid || `${finalPhone}@s.whatsapp.net`,
        },
        response: {
          option_index: raw.selected_option_index !== undefined ? raw.selected_option_index : (raw.option_index !== undefined ? raw.option_index : 0),
          option_text: raw.selected_option_text || raw.option_text || raw.option || "",
        },
        timestamp: raw.timestamp ? (typeof raw.timestamp === "number" ? new Date(raw.timestamp * 1000).toISOString() : raw.timestamp) : new Date().toISOString(),
        _raw_event: raw,
      };

      console.log(`[webhook-inbound] 🗳️ Direct poll vote endpoint triggered for message ${pollPayload.message_id}, resolved phone: ${finalPhone}, lid: ${candidateLid}`);

      const handleRes = await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/handle-poll-response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
        },
        body: JSON.stringify(pollPayload),
      });

      const handleResult = await handleRes.json();

      await supabase.from("webhook_events").insert({
        user_id: null,
        source: payload.provider || payload.source || "api",
        external_instance_id: payload.instance_id,
        event_type: "poll_vote",
        event_subtype: "poll_response",
        classification: "identified",
        direction: "inbound",
        confidence: "high",
        matched_rule: "poll_vote_endpoint",
        chat_jid: pollPayload.group_jid,
        sender_phone: pollPayload.respondent.phone,
        sender_name: pollPayload.respondent.name,
        message_id: pollPayload.message_id,
        raw_event: raw,
        processing_status: "processed",
      }).catch((err) => console.error("[webhook-inbound] Failed to log poll vote event:", err));

      return new Response(JSON.stringify(handleResult), {
        status: handleRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Roteamento semântico para eventos de Grupo (Join / Leave)
    if (
      url.pathname.includes("/groups/join") ||
      url.pathname.includes("/groups/participant-add") ||
      url.pathname.includes("/group/join")
    ) {
      payload.action = "group_join";
    } else if (
      url.pathname.includes("/groups/leave") ||
      url.pathname.includes("/groups/participant-remove") ||
      url.pathname.includes("/group/leave")
    ) {
      payload.action = "group_leave";
    }

    // Se for requisição para a raiz /webhook-inbound sem sub-rota semântica de mensagem:
    // Bloqueia para evitar inferências ambíguas e duplicação de mensagens no chat.
    if (!payload.action || payload.action.startsWith("message")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "endpoint_deprecated",
          message: "O endpoint raiz /webhook-inbound foi descontinuado para mensagens. Utilize as rotas semânticas dedicadas: /webhooks/messages/text, /webhooks/messages/audio, /webhooks/messages/status, etc."
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const rawEvent = payload.raw_event;
    const action = payload.action;
    const source = payload.provider || payload.source || "api";
    const externalInstanceId = payload.instance_id;
    const receivedAt = payload.received_at || new Date().toISOString();
    const wahaApiKey = payload.waha_api_key;
    if (rawEvent?.mediaUrl && wahaApiKey) {
      try {
        console.log(`[webhook-inbound] Intercepting media URL: ${rawEvent.mediaUrl}`);
        const mediaRes = await fetch(rawEvent.mediaUrl, {
          headers: { "X-Api-Key": wahaApiKey }
        });
        
        if (mediaRes.ok) {
          const arrayBuffer = await mediaRes.arrayBuffer();
          const mime = (rawEvent.mimetype as string) || "application/octet-stream";
          // Extrai corretamente a extensão do mimetype, mesmo se houver codecs (ex: video/mp4; codecs=...)
          const extMatch = mime.match(/\/([^;]+)/);
          const ext = extMatch ? extMatch[1] : "bin";
          const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("media")
            .upload(fileName, arrayBuffer, {
              contentType: mime,
              upsert: true
            });
            
          if (!uploadError && uploadData) {
            const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
            // Corrige a URL gerada caso o Supabase esteja rodando localmente (Kong)
            rawEvent.mediaUrl = publicUrlData.publicUrl.replace("http://kong:8000", "https://qualify-supabase.d2x.site");
            console.log(`[webhook-inbound] Successfully uploaded to Supabase: ${rawEvent.mediaUrl}`);
          } else {
            console.error(`[webhook-inbound] Error uploading to storage:`, uploadError);
          }
        } else {
          console.error(`[webhook-inbound] Error fetching media from WAHA: ${mediaRes.status}`);
        }
      } catch (err) {
        console.error(`[webhook-inbound] Exception during media upload:`, err);
      }
    }

    console.log(`[webhook-inbound] Received action '${action}' from ${source}, instance: ${externalInstanceId}`);

    // Buscar a instância interna no banco
    const { data: instance } = await supabase
      .from("instances")
      .select("id, user_id, name, phone, provider, status")
      .eq("external_instance_id", externalInstanceId)
      .maybeSingle();

    if (instance) {
      instanceUserId = instance.user_id;
    } else {
      console.warn(`[webhook-inbound] Instance not found for external_instance_id="${externalInstanceId}". Event will be saved with user_id=null.`);
    }

    // Criar a classificação baseada na action vinda do n8n e no tipo de mídia
    let eventType = action;
    
    if ((action === "message.received" || action === "message.sent") && rawEvent.type) {
      eventType = `${rawEvent.type}_message`;
    }

    const classification: ClassificationResult = {
      eventType: eventType,
      eventSubtype: rawEvent.event as string | null || action,
      classification: "identified",
      direction: action.includes("sent") ? "outbound" : (action.includes("message") && !action.includes("status") && !action.includes("poll") ? "inbound" : "system"),
      confidence: "high",
      matchedRule: "n8n_action_route",
    };

    // Extrair o contexto real da mensagem (chatJid, mensagemId) usando o extrator que suporta múltiplos provedores
    const context: EventContext = extractContext(source, rawEvent);

    // Salvar o evento bruto no webhook_events
    const { data: insertedEvent, error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        user_id: instance?.user_id || null,
        source,
        external_instance_id: externalInstanceId,
        instance_id: instance?.id || null,
        event_type: classification.eventType,
        event_subtype: classification.eventSubtype,
        classification: classification.classification,
        direction: classification.direction,
        confidence: classification.confidence,
        matched_rule: classification.matchedRule,
        chat_jid: context.chatJid,
        chat_type: context.chatType,
        chat_name: context.chatName,
        sender_phone: context.senderPhone,
        sender_name: context.senderName,
        message_id: context.messageId,
        raw_event: rawEvent,
        event_timestamp: context.eventTimestamp,
        received_at: receivedAt,
        processing_status: "processed",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[webhook-inbound] Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[webhook-inbound] Event saved with ID: ${insertedEvent.id}`);

    // ==========================================
    // ROTEADOR CENTRAL (SWITCH)
    // ==========================================
    
    // As actions podem vir como `message.received`, `message.delivered`, `group.joined`
    const actionPrefix = action.split('.')[0]; 

    // Roteamento baseado na action informada pelo n8n
    const isStatusAck = action === "message.delivered" || action === "message.read" || action === "message.failed" || (action === "message.sent" && !rawEvent.type);

    if (action === "message.received" || (action === "message.sent" && rawEvent.type)) {
      await processMessageEvent(supabase, instance, classification, context, rawEvent);
    } 
    else if (isStatusAck || action === "message.poll_update") {
      await processStatusEvent(supabase, instance, classification, context, rawEvent, insertedEvent.id);
    }
    else if (actionPrefix === "status" || action === "chat_presence") {
      await processPresenceEvent(supabase, instance, classification, context, rawEvent, insertedEvent.id);
    }
    else if (actionPrefix === "connection") {
      await processConnectionEvent(supabase, instance, classification, context, rawEvent);
    }
    else if (action.startsWith("group")) {
      await supabase.from("alerts").insert({ user_id: instance?.user_id, severity: "info", title: "Webhook Route", message: `Routing action ${action} to GroupController` });
      await processGroupEvent(supabase, instance, classification, context, rawEvent, insertedEvent.id);
    }
    else if (action === "message_reaction" || action === "message_edited" || action === "message_revoked") {
      console.log(`[webhook-inbound] Action '${action}' mapeada, mas sem controller específico ativo por enquanto. Salvo em webhook_events.`);
      // Opcional: futuramente podemos enviar para processMessageEvent ou um MessageReactionController
    }
    else {
      console.log(`[webhook-inbound] Action '${action}' não mapeada para nenhum controller específico. Apenas salvo no banco.`);
      
      // Auto-Alert for unknown mapped events
      if (instance?.user_id && action === "unmapped_event") {
        await supabase.from("alerts").insert({
          user_id: instance.user_id,
          severity: "warning",
          title: "Evento não identificado no n8n",
          description: `O n8n enviou um evento com action 'unmapped_event'. Payload: ${classification.eventSubtype}`,
          entity: "webhook",
          read: false
        }).catch(err => console.error(err));
      }
    }

    responseBodyObj = { 
        success: true, 
        provider: source, 
        event_id: insertedEvent.id,
        action: action,
        message: `Routed to corresponding controller for ${classification.eventType}`,
        debug_v1: {
          action,
          isGroup: action.startsWith("group")
        }
      };
      statusCode = 201;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[webhook-inbound] Error:", errorMessage);
    if (!responseBodyObj) {
      responseBodyObj = { success: false, error: errorMessage };
      statusCode = 500;
    }
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await supabaseAdmin.from("api_logs").insert({
      method: req.method,
      endpoint: "/functions/v1/webhook-inbound",
      status_code: statusCode,
      response_time_ms: Date.now() - startTime,
      ip_address: ipAddress,
      request_body: requestBodyObj,
      response_body: responseBodyObj,
      user_id: instanceUserId || null
    });
  } catch (logErr) {
    console.error("[webhook-inbound] Failed to write to api_logs:", logErr);
  }

  return new Response(
    JSON.stringify(responseBodyObj),
    { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

// fix deploy
