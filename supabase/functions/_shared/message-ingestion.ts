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

      // 4. Inferência de Contexto de Grupo, Remetente e Autoria
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
      const isFromMe = 
        rawEvent.from_me === true || 
        rawEvent.fromMe === true || 
        String(rawEvent.from_me).toLowerCase() === "true" || 
        String(rawEvent.fromMe).toLowerCase() === "true" ||
        (payload as any).from_me === true ||
        (payload as any).fromMe === true ||
        (payload as any).direction === "outbound";
      const direction = isFromMe ? "outbound" : "inbound";

      // 3. Deduplicação / Idempotência
      // Status, reações, edições e revogações nunca devem ser bloqueados pela deduplicação de mensagem comum
      const isStatusOrMutation =
        type === "reaction" ||
        type === "edited" ||
        type === "revoked" ||
        type === "status" ||
        type === "delivered" ||
        type === "read" ||
        type === "sent" ||
        type === "failed" ||
        type === "ack";

      if (!isStatusOrMutation) {
        const { data: existingEvent } = await this.supabase
          .from("webhook_events")
          .select("id, direction")
          .eq("external_instance_id", externalInstanceId)
          .eq("message_id", messageId)
          .maybeSingle();

        if (existingEvent) {
          if (isFromMe && existingEvent.direction !== "outbound") {
            await this.supabase
              .from("webhook_events")
              .update({ direction: "outbound" })
              .eq("id", existingEvent.id);

            await this.supabase
              .from("chat_messages")
              .update({ sender_type: "operator", status: "sent" })
              .eq("message_id", messageId);

            console.log(`[MessageIngestionService] Updated existing message (${messageId}) to outbound/operator.`);
          }

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

      const eventTimestamp = rawEvent.timestamp
        ? typeof rawEvent.timestamp === "number"
          ? new Date(rawEvent.timestamp * (rawEvent.timestamp > 1e11 ? 1 : 1000)).toISOString()
          : new Date(rawEvent.timestamp).toISOString()
        : new Date().toISOString();

      // Normaliza URLs de mídia se presentes e faz upload seguro para Supabase Storage
      const rawMediaUrl =
        rawEvent.media_url ||
        rawEvent.mediaUrl ||
        rawEvent.url ||
        rawEvent.imageUrl ||
        rawEvent.image_url ||
        rawEvent.audioUrl ||
        rawEvent.audio_url ||
        rawEvent.videoUrl ||
        rawEvent.video_url ||
        rawEvent.documentUrl ||
        rawEvent.document_url ||
        rawEvent.file_url ||
        rawEvent.fileUrl ||
        rawEvent.stickerUrl ||
        rawEvent.sticker_url ||
        rawEvent.link ||
        rawEvent.body?.mediaUrl ||
        rawEvent.body?.media_url ||
        rawEvent.body?.url ||
        rawEvent.body?.imageUrl ||
        rawEvent.body?.audioUrl ||
        rawEvent.body?.videoUrl ||
        rawEvent.body?.documentUrl ||
        rawEvent.media?.url ||
        rawEvent.file?.url;

      const rawBase64 =
        rawEvent.base64 ||
        rawEvent.media_base64 ||
        rawEvent.file_base64 ||
        rawEvent.body?.base64 ||
        rawEvent.media?.base64 ||
        rawEvent.file?.base64;

      if (rawMediaUrl || rawBase64) {
        if (rawMediaUrl) {
          rawEvent.mediaUrl = rawMediaUrl;
          rawEvent.media_url = rawMediaUrl;
        }

        // Se a URL for remota (ex: WAHA, Z-API, Evolution, CDN) ou vier em base64, baixa/decodifica e salva no bucket público do Supabase
        if ((rawMediaUrl && (rawMediaUrl.startsWith("http://") || rawMediaUrl.startsWith("https://"))) || rawBase64) {
          try {
            const wahaApiKey = (payload as any).waha_api_key || rawEvent.waha_api_key || instance.external_instance_token || Deno.env.get("WAHA_API_KEY") || "21e886a6f345262e85572ac594b82b36064bcc2f4b28ad76";
            const headers: Record<string, string> = {};
            if (wahaApiKey) {
              headers["X-Api-Key"] = wahaApiKey;
              headers["Authorization"] = `Bearer ${wahaApiKey}`;
            }

            let arrayBuffer: ArrayBuffer | null = null;
            let mime = (rawEvent.mimetype || rawEvent.mime_type || rawEvent.contentType as string) || "";

            if (rawBase64) {
              const b64Data = String(rawBase64).replace(/^data:.*?;base64,/, "");
              const binaryString = atob(b64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              arrayBuffer = bytes.buffer;
            } else if (rawMediaUrl) {
              const mediaRes = await fetch(rawMediaUrl, { headers });
              if (mediaRes.ok) {
                arrayBuffer = await mediaRes.arrayBuffer();
                const fetchedMime = mediaRes.headers.get("content-type");
                if (fetchedMime && fetchedMime !== "application/octet-stream" && fetchedMime !== "application/json") {
                  if (!mime) mime = fetchedMime;
                }
              } else {
                console.warn(`[MessageIngestionService] Could not fetch media from ${rawMediaUrl} (status ${mediaRes.status})`);
              }
            }

            if (arrayBuffer && arrayBuffer.byteLength > 0) {
              // 1. Tentar extrair extensão do nome do arquivo fornecido
              const originalFileName = rawEvent.filename || rawEvent.fileName || rawEvent.name || "";
              let ext = "";
              if (originalFileName && originalFileName.includes(".")) {
                const parts = originalFileName.split(".");
                const candidateExt = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "");
                if (candidateExt.length >= 2 && candidateExt.length <= 5) {
                  ext = candidateExt;
                }
              }

              // 2. Mapeamento por MIME Type se não encontrou no nome
              if (!ext && mime) {
                const lowerMime = mime.toLowerCase();
                if (lowerMime.includes("ogg") || lowerMime.includes("opus") || lowerMime.includes("oga")) ext = "ogg";
                else if (lowerMime.includes("mp4") || lowerMime.includes("m4v")) ext = "mp4";
                else if (lowerMime.includes("mpeg") || lowerMime.includes("mp3")) ext = "mp3";
                else if (lowerMime.includes("wav") || lowerMime.includes("wave")) ext = "wav";
                else if (lowerMime.includes("m4a") || lowerMime.includes("aac")) ext = "m4a";
                else if (lowerMime.includes("webm")) ext = type.includes("video") ? "webm" : "webm";
                else if (lowerMime.includes("jpeg") || lowerMime.includes("jpg")) ext = "jpg";
                else if (lowerMime.includes("png")) ext = "png";
                else if (lowerMime.includes("webp")) ext = "webp";
                else if (lowerMime.includes("gif")) ext = "gif";
                else if (lowerMime.includes("pdf")) ext = "pdf";
                else if (lowerMime.includes("sheet") || lowerMime.includes("excel") || lowerMime.includes("xls")) ext = "xlsx";
                else if (lowerMime.includes("word") || lowerMime.includes("document") || lowerMime.includes("doc")) ext = "docx";
                else if (lowerMime.includes("zip")) ext = "zip";
                else if (lowerMime.includes("rar")) ext = "rar";
                else if (lowerMime.includes("csv")) ext = "csv";
                else if (lowerMime.includes("text/plain")) ext = "txt";
              }

              // 3. Fallback pela tipagem semântica da rota
              if (!ext) {
                switch (type) {
                  case "image": ext = "jpg"; break;
                  case "audio":
                  case "voice": ext = "ogg"; break;
                  case "video":
                  case "video-note": ext = "mp4"; break;
                  case "document": ext = "pdf"; break;
                  case "sticker": ext = "webp"; break;
                  default: ext = "bin";
                }
              }

              if (!mime) {
                switch (ext) {
                  case "jpg":
                  case "jpeg": mime = "image/jpeg"; break;
                  case "png": mime = "image/png"; break;
                  case "webp": mime = "image/webp"; break;
                  case "gif": mime = "image/gif"; break;
                  case "ogg":
                  case "oga": mime = "audio/ogg; codecs=opus"; break;
                  case "mp3": mime = "audio/mpeg"; break;
                  case "wav": mime = "audio/wav"; break;
                  case "m4a": mime = "audio/mp4"; break;
                  case "mp4": mime = "video/mp4"; break;
                  case "webm": mime = type.includes("video") ? "video/webm" : "audio/webm"; break;
                  case "pdf": mime = "application/pdf"; break;
                  case "xlsx": mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; break;
                  case "docx": mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; break;
                  case "zip": mime = "application/zip"; break;
                  default: mime = "application/octet-stream";
                }
              }

              const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
              
              const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from("media")
                .upload(fileName, arrayBuffer, {
                  contentType: mime,
                  upsert: true
                });

              if (!uploadError && uploadData) {
                const { data: publicUrlData } = this.supabase.storage.from("media").getPublicUrl(fileName);
                const publicUrl = publicUrlData.publicUrl.replace("http://kong:8000", "https://qualify-supabase.d2x.site");
                
                rawEvent.mediaUrl = publicUrl;
                rawEvent.media_url = publicUrl;
                rawEvent.url = publicUrl;
                if (type === "image") { rawEvent.imageUrl = publicUrl; rawEvent.image_url = publicUrl; }
                else if (type === "audio" || type === "voice") { rawEvent.audioUrl = publicUrl; rawEvent.audio_url = publicUrl; }
                else if (type === "video" || type === "video-note") { rawEvent.videoUrl = publicUrl; rawEvent.video_url = publicUrl; }
                else if (type === "document") { rawEvent.documentUrl = publicUrl; rawEvent.document_url = publicUrl; rawEvent.file_url = publicUrl; }
                else if (type === "sticker") { rawEvent.stickerUrl = publicUrl; rawEvent.sticker_url = publicUrl; }

                console.log(`[MessageIngestionService] Media (${type} / .${ext}) successfully uploaded to Supabase Storage: ${publicUrl}`);
              } else if (uploadError) {
                console.error("[MessageIngestionService] Error uploading to media storage:", uploadError);
              }
            }
          } catch (mediaErr) {
            console.error("[MessageIngestionService] Exception downloading/uploading media:", mediaErr);
          }
        }
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

      // 6. Tratar Eventos Especiais (Status, Reação, Edição, Revogação)
      const isStatusType = type === "status" || type === "delivered" || type === "read" || type === "sent" || type === "failed" || type === "ack";
      if (isStatusType) {
        await this.handleStatusUpdate(rawEvent, instance, eventId, type);
      } else if (type === "reaction") {
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
      case "status":
      case "delivered":
      case "read":
      case "sent":
      case "failed":
      case "ack":
        return "message_status";
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

  private async handleStatusUpdate(rawEvent: any, instance: any, eventId: string, type: string) {
    const targetMessageId = rawEvent.id || rawEvent.message_id || rawEvent.target_message_id;
    if (!targetMessageId) return;

    let statusVal = "delivered";
    const rawStatus = String(rawEvent.status || rawEvent.action || rawEvent.ack || type || "").toLowerCase();
    
    if (rawStatus === "read" || rawStatus.includes("read") || rawStatus === "played" || rawStatus === "3") {
      statusVal = "read";
    } else if (rawStatus === "delivered" || rawStatus.includes("delivered") || rawStatus === "2") {
      statusVal = "delivered";
    } else if (rawStatus === "sent" || rawStatus.includes("sent") || rawStatus === "1") {
      statusVal = "sent";
    } else if (rawStatus === "failed" || rawStatus.includes("failed") || rawStatus.includes("error") || rawStatus === "0") {
      statusVal = "failed";
    }

    try {
      console.log(`[MessageIngestionService] Updating message status for '${targetMessageId}' to '${statusVal}'`);
      const shortId = targetMessageId.split("_").pop() || targetMessageId;
      
      const { error: updateError } = await this.supabase
        .from("chat_messages")
        .update({ status: statusVal })
        .or(`message_id.eq.${targetMessageId},zaap_id.eq.${targetMessageId},message_id.ilike.%${shortId}%,zaap_id.ilike.%${shortId}%`);

      if (updateError) {
        console.error(`[MessageIngestionService] Error updating chat_messages status:`, updateError);
      }

      await this.supabase
        .from("webhook_events")
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          processing_result: { message_status_updated: true, target_message_id: targetMessageId, status: statusVal }
        })
        .eq("id", eventId);
    } catch (err) {
      console.error("[MessageIngestionService] Exception updating message status:", err);
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
