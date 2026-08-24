import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type SupportedMessageType,
  type BaseWebhookPayload,
} from "./message-schemas.ts";
import { processMessageEvent } from "../webhook-inbound/controllers/MessageController.ts";
import { type EventContext, type ClassificationResult } from "./event-classifier.ts";

export interface IngestionResult {
  statusCode: number;
  body: {
    success: boolean;
    error?: string;
    message?: string;
    event_id?: string;
    duplicated?: boolean;
    type?: string;
  };
}

export interface RequestMeta {
  endpoint: string;
  method: string;
  ipAddress: string;
  startTime: number;
}

/**
 * MessageIngestionService
 * 
 * Núcleo desacoplado e idempotente para recebimento de mensagens e eventos da Qualify.
 */
export class MessageIngestionService {
  private supabase: SupabaseClient;

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase =
      supabaseClient ||
      createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
  }

  public async ingest(
    type: SupportedMessageType,
    payload: BaseWebhookPayload,
    meta: RequestMeta
  ): Promise<IngestionResult> {
    const rawEvent = payload.raw_event || {};
    const externalInstanceId = payload.instance_id;
    let statusCode = 200;
    let resultBody: any = null;
    let instanceUserId: string | null = null;

    try {
      // 1. Identificar Instância / Tenant
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(externalInstanceId);
      
      let query = this.supabase
        .from("instances")
        .select("id, user_id, company_id, name, phone, provider, status, external_instance_token");
        
      if (isUuid) {
        query = query.or(`external_instance_id.eq.${externalInstanceId},id.eq.${externalInstanceId}`);
      } else {
        query = query.eq("external_instance_id", externalInstanceId);
      }

      const { data: instance, error: instanceError } = await query.maybeSingle();

      if (instanceError) {
        console.error("[MessageIngestionService] Database error checking instance:", instanceError);
      }

      if (!instance) {
        console.warn(`[MessageIngestionService] Instance not found for '${externalInstanceId}'.`);
        statusCode = 404;
        resultBody = {
          success: false,
          error: "instance_not_found",
          message: `Instance '${externalInstanceId}' not registered in Qualify`,
        };
        await this.logApiRequest(meta, payload, resultBody, statusCode, null);
        return { statusCode, body: resultBody };
      }

      instanceUserId = instance.user_id;

      // 2. Mapeamento de Event Type e Identificadores
      const eventType = this.resolveEventType(type);
      const messageId =
        rawEvent.id ||
        rawEvent.message_id ||
        rawEvent.target_message_id ||
        rawEvent.original_message_id ||
        rawEvent.revoked_message_id ||
        `gen_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // 3. Deduplicação / Idempotência
      // Se for uma mensagem comum e já existir no webhook_events para esta instância, não duplica
      if (type !== "reaction" && type !== "edited" && type !== "revoked") {
        const { data: existingEvent } = await this.supabase
          .from("webhook_events")
          .select("id")
          .eq("external_instance_id", externalInstanceId)
          .eq("message_id", messageId)
          .maybeSingle();

        if (existingEvent) {
          console.log(`[MessageIngestionService] Duplicate message detected (${messageId}). Skipping duplicate ingestion.`);
          statusCode = 200;
          resultBody = {
            success: true,
            duplicated: true,
            event_id: existingEvent.id,
            type,
            message: "Event already processed (deduplicated)",
          };
          await this.logApiRequest(meta, payload, resultBody, statusCode, instanceUserId);
          return { statusCode, body: resultBody };
        }
      }

      // 4. Inferência de Contexto de Grupo e Remetente
      const isGroup = !!rawEvent.group_id;
      const chatJid = rawEvent.group_id
        ? rawEvent.group_id
        : rawEvent.from_phone
        ? `${rawEvent.from_phone}@s.whatsapp.net`
        : rawEvent.from_lid || "unknown";

      const chatType = isGroup ? "group" : "private";
      const chatName = rawEvent.group_name || rawEvent.from_name || rawEvent.from_phone || chatJid;
      const senderPhone = rawEvent.from_phone || null;
      const senderLid = rawEvent.from_lid || null;
      const senderName = rawEvent.from_name || null;
      const direction = rawEvent.from_me ? "outbound" : "inbound";

      const eventTimestamp = rawEvent.timestamp
        ? typeof rawEvent.timestamp === "number"
          ? new Date(rawEvent.timestamp * (rawEvent.timestamp > 1e11 ? 1 : 1000)).toISOString()
          : new Date(rawEvent.timestamp).toISOString()
        : new Date().toISOString();

      // Normaliza URLs de mídia se presentes
      if (rawEvent.media_url && !rawEvent.mediaUrl) {
        rawEvent.mediaUrl = rawEvent.media_url;
      }

      // 5. Inserir em webhook_events
      const { data: insertedEvent, error: insertError } = await this.supabase
        .from("webhook_events")
        .insert({
          user_id: instance.user_id,
          source: instance.provider || "api",
          external_instance_id: externalInstanceId,
          instance_id: instance.id,
          event_type: eventType,
          event_subtype: type,
          classification: "identified",
          direction: direction,
          confidence: "high",
          matched_rule: "semantic_webhook_route",
          chat_jid: chatJid,
          chat_type: chatType,
          chat_name: chatName,
          sender_phone: senderPhone,
          sender_lid: senderLid,
          sender_name: senderName,
          message_id: messageId,
          raw_event: rawEvent,
          event_timestamp: eventTimestamp,
          received_at: new Date().toISOString(),
          processing_status: "processed",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[MessageIngestionService] Insert error into webhook_events:", insertError);
        statusCode = 500;
        resultBody = { success: false, error: insertError.message };
        await this.logApiRequest(meta, payload, resultBody, statusCode, instanceUserId);
        return { statusCode, body: resultBody };
      }

      const eventId = insertedEvent.id;

      // 6. Tratar Eventos Especiais (Reação, Edição, Revogação)
      if (type === "reaction") {
        await this.handleReaction(rawEvent, instance, eventId);
      } else if (type === "edited") {
        await this.handleEdited(rawEvent, instance, eventId);
      } else if (type === "revoked") {
        await this.handleRevoked(rawEvent, instance, eventId);
      } else {
        // 7. Processar Regras de Negócio e Notificações para Mensagens Comuns
        const classification: ClassificationResult = {
          eventType: eventType,
          eventSubtype: type,
          classification: "identified",
          direction: direction as any,
          confidence: "high",
          matchedRule: "semantic_webhook_route",
        };

        const context: EventContext = {
          chatJid,
          chatType,
          chatName,
          senderPhone,
          senderLid,
          senderName,
          messageId,
          eventTimestamp,
        };

        await processMessageEvent(this.supabase, instance, classification, context, rawEvent);
      }

      statusCode = 201;
      resultBody = {
        success: true,
        event_id: eventId,
        type,
        message: `Message '${type}' processed successfully`,
      };
    } catch (err: any) {
      console.error("[MessageIngestionService] Exception during ingestion:", err);
      statusCode = 500;
      resultBody = {
        success: false,
        error: "internal_error",
        message: err instanceof Error ? err.message : "Unknown error during message ingestion",
      };
    }

    await this.logApiRequest(meta, payload, resultBody, statusCode, instanceUserId);
    return { statusCode, body: resultBody };
  }

  private resolveEventType(type: SupportedMessageType): string {
    switch (type) {
      case "text":
        return "text_message";
      case "image":
        return "image_message";
      case "audio":
      case "voice":
        return "audio_message";
      case "video":
      case "video-note":
        return "video_message";
      case "document":
        return "document_message";
      case "sticker":
        return "sticker_message";
      case "location":
        return "location_message";
      case "contact":
      case "contacts":
        return "contact_message";
      case "poll":
        return "poll_message";
      case "reaction":
        return "message_reaction";
      case "edited":
        return "message_edited";
      case "revoked":
        return "message_revoked";
      default:
        return `${type}_message`;
    }
  }

  private async handleReaction(rawEvent: any, instance: any, eventId: string) {
    const targetMessageId = rawEvent.target_message_id || rawEvent.targetMessageId;
    const reaction = rawEvent.reaction;

    if (!targetMessageId) return;

    try {
      console.log(`[MessageIngestionService] Associating reaction '${reaction}' with target message '${targetMessageId}'`);
      
      // Atualiza mensagem alvo em chat_messages
      const shortId = targetMessageId.split("_").pop() || targetMessageId;
      await this.supabase
        .from("chat_messages")
        .update({ 
          reaction: reaction || null,
        } as any)
        .or(`message_id.eq.${targetMessageId},zaap_id.eq.${targetMessageId},message_id.ilike.%${shortId}%,zaap_id.ilike.%${shortId}%`);

      await this.supabase
        .from("webhook_events")
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          processing_result: { reaction_updated: true, target_message_id: targetMessageId, reaction }
        })
        .eq("id", eventId);
    } catch (err) {
      console.error("[MessageIngestionService] Error handling reaction:", err);
    }
  }

  private async handleEdited(rawEvent: any, instance: any, eventId: string) {
    const originalMessageId = rawEvent.original_message_id || rawEvent.originalMessageId;
    const newBody = rawEvent.body;

    if (!originalMessageId) return;

    try {
      console.log(`[MessageIngestionService] Updating edited message '${originalMessageId}'`);
      
      const shortId = originalMessageId.split("_").pop() || originalMessageId;
      await this.supabase
        .from("chat_messages")
        .update({ 
          body: newBody,
          is_edited: true,
          updated_at: new Date().toISOString()
        } as any)
        .or(`message_id.eq.${originalMessageId},zaap_id.eq.${originalMessageId},message_id.ilike.%${shortId}%,zaap_id.ilike.%${shortId}%`);

      await this.supabase
        .from("webhook_events")
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          processing_result: { message_edited: true, original_message_id: originalMessageId }
        })
        .eq("id", eventId);
    } catch (err) {
      console.error("[MessageIngestionService] Error handling edited message:", err);
    }
  }

  private async handleRevoked(rawEvent: any, instance: any, eventId: string) {
    const revokedMessageId = rawEvent.revoked_message_id || rawEvent.revokedMessageId;

    if (!revokedMessageId) return;

    try {
      console.log(`[MessageIngestionService] Marking revoked message '${revokedMessageId}'`);
      
      const shortId = revokedMessageId.split("_").pop() || revokedMessageId;
      await this.supabase
        .from("chat_messages")
        .update({ 
          status: "revoked",
          body: "[Mensagem apagada]",
          updated_at: new Date().toISOString()
        } as any)
        .or(`message_id.eq.${revokedMessageId},zaap_id.eq.${revokedMessageId},message_id.ilike.%${shortId}%,zaap_id.ilike.%${shortId}%`);

      await this.supabase
        .from("webhook_events")
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          processing_result: { message_revoked: true, revoked_message_id: revokedMessageId }
        })
        .eq("id", eventId);
    } catch (err) {
      console.error("[MessageIngestionService] Error handling revoked message:", err);
    }
  }

  private async logApiRequest(
    meta: RequestMeta,
    requestBody: any,
    responseBody: any,
    statusCode: number,
    userId: string | null
  ) {
    try {
      await this.supabase.from("api_logs").insert({
        method: meta.method,
        endpoint: meta.endpoint,
        status_code: statusCode,
        response_time_ms: Date.now() - meta.startTime,
        ip_address: meta.ipAddress,
        request_body: requestBody,
        response_body: responseBody,
        user_id: userId,
      });
    } catch (err) {
      console.error("[MessageIngestionService] Failed to write api_logs:", err);
    }
  }
}
