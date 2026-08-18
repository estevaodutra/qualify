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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface InboundPayload {
  action: string;
  source?: string;
  provider?: string;
  instance_id: string;
  received_at?: string;
  waha_api_key?: string;
  raw_event: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let requestBodyObj = null;
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";
  let responseBodyObj = null;
  let statusCode = 200;
  let companyId = null;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const bodyText = await req.text();
    try { requestBodyObj = JSON.parse(bodyText); } catch { requestBodyObj = { rawText: bodyText }; }
    const payload = requestBodyObj as Partial<InboundPayload>;

    // Validação estrita
    if (!payload.action || (!payload.source && !payload.provider) || !payload.instance_id || !payload.raw_event) {
      responseBodyObj = { success: false, error: "Missing required fields: action, provider (or source), instance_id, raw_event" };
      statusCode = 400;
      throw new Error("Missing required fields");
    }

    const action = payload.action;
    const source = payload.provider || payload.source || "unknown";
    const externalInstanceId = payload.instance_id;
    const receivedAt = payload.received_at || new Date().toISOString();
    const rawEvent = payload.raw_event;
    const wahaApiKey = payload.waha_api_key;

    // ==========================================
    // AUTO-DOWNLOAD WAHA MEDIA
    // ==========================================
    if (rawEvent.mediaUrl && wahaApiKey && typeof rawEvent.mediaUrl === "string" && rawEvent.mediaUrl.startsWith("http")) {
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

    if (!instance) {
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
      company_id: companyId || null
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
