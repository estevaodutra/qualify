/**
 * Schemas e Validações de Webhooks de Mensagem da Qualify
 *
 * Contrato Base Raiz:
 * {
 *   "instance_id": "session_uuid",
 *   "raw_event": {}
 * }
 */

export interface BaseWebhookPayload<T = Record<string, any>> {
  instance_id: string;
  raw_event: T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES ESPECÍFICOS POR TIPO DE MENSAGEM
// ═══════════════════════════════════════════════════════════════════════════════

export interface BaseRawMessageEvent {
  id: string;
  timestamp: number | string;
  from_phone?: string;
  from_lid?: string;
  from_name?: string;
  group_id?: string;
  group_name?: string;
  reply_to_id?: string;
  from_me?: boolean;
  to_phone?: string;
}

export interface TextRawEvent extends BaseRawMessageEvent {
  body: string;
}

export interface ImageRawEvent extends BaseRawMessageEvent {
  media_url: string;
  caption?: string;
  mimetype?: string;
}

export interface AudioRawEvent extends BaseRawMessageEvent {
  media_url: string;
  mimetype?: string;
  seconds?: number;
}

export interface VideoRawEvent extends BaseRawMessageEvent {
  media_url: string;
  caption?: string;
  mimetype?: string;
  seconds?: number;
}

export interface DocumentRawEvent extends BaseRawMessageEvent {
  media_url: string;
  filename?: string;
  mimetype?: string;
  caption?: string;
}

export interface StickerRawEvent extends BaseRawMessageEvent {
  media_url: string;
  mimetype?: string;
}

export interface LocationRawEvent extends BaseRawMessageEvent {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface ContactRawEvent extends BaseRawMessageEvent {
  contact_name?: string;
  contact_phone?: string;
  vcard?: string;
}

export interface ContactsRawEvent extends BaseRawMessageEvent {
  contacts?: Array<{
    name?: string;
    phone?: string;
    vcard?: string;
  }>;
}

export interface PollRawEvent extends BaseRawMessageEvent {
  name?: string;
  options?: Array<{ name: string; id?: string }>;
  selectable_options_count?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES DE EVENTOS ESPECIAIS (NÃO CRIAM NOVA MENSAGEM COMUM)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReactionRawEvent {
  timestamp: number | string;
  target_message_id: string;
  reaction: string;
  message_id?: string;
  from_phone?: string;
  from_lid?: string;
  from_name?: string;
  group_id?: string;
  group_name?: string;
}

export interface EditedRawEvent {
  timestamp: number | string;
  original_message_id: string;
  body: string;
  message_id?: string;
  from_phone?: string;
  from_lid?: string;
  from_name?: string;
  group_id?: string;
  group_name?: string;
}

export interface RevokedRawEvent {
  timestamp: number | string;
  revoked_message_id: string;
  message_id?: string;
  from_phone?: string;
  from_lid?: string;
  from_name?: string;
  group_id?: string;
  group_name?: string;
}

export interface StatusRawEvent {
  id?: string;
  message_id?: string;
  target_message_id?: string;
  status: "sent" | "delivered" | "read" | "failed" | "error" | "pending" | string;
  timestamp?: number | string;
  from_phone?: string;
  from_lid?: string;
  phone?: string;
  error_message?: string;
}

export type SupportedMessageType =
  | "text"
  | "image"
  | "audio"
  | "voice"
  | "video"
  | "video-note"
  | "document"
  | "sticker"
  | "location"
  | "contact"
  | "contacts"
  | "poll"
  | "reaction"
  | "edited"
  | "revoked"
  | "status"
  | "delivered"
  | "read"
  | "sent"
  | "failed"
  | "ack";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  message?: string;
}

/**
 * Validador estrito de payload conforme o endpoint/tipo
 */
export function validateMessagePayload(type: SupportedMessageType, body: any): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "invalid_payload", message: "Request body must be a valid JSON object" };
  }

  if (!body.instance_id || typeof body.instance_id !== "string" || !body.instance_id.trim()) {
    return { valid: false, error: "invalid_payload", message: "'instance_id' is required and must be a string" };
  }

  if (!body.raw_event || typeof body.raw_event !== "object") {
    return { valid: false, error: "invalid_payload", message: "'raw_event' is required and must be an object" };
  }

  const raw = body.raw_event;

  switch (type) {
    case "status":
    case "delivered":
    case "read":
    case "sent":
    case "failed":
    case "ack":
      const statusTargetId = raw.id || raw.message_id || raw.target_message_id;
      if (!statusTargetId) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.id' or 'raw_event.message_id' is required" };
      }
      break;

    case "text":
      if (!raw.id) return { valid: false, error: "invalid_payload", message: "'raw_event.id' is required" };
      if (raw.body === undefined || raw.body === null) return { valid: false, error: "invalid_payload", message: "'raw_event.body' is required" };
      break;

    case "image":
      if (!raw.id) return { valid: false, error: "invalid_payload", message: "'raw_event.id' is required" };
      if (!raw.media_url && !raw.mediaUrl && !raw.imageUrl && !raw.image_url && !raw.url && !raw.base64 && !raw.media_base64 && !raw.body?.mediaUrl && !raw.media?.url) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.media_url' or 'raw_event.base64' is required" };
      }
      break;

    case "audio":
    case "voice":
      if (!raw.id) return { valid: false, error: "invalid_payload", message: "'raw_event.id' is required" };
      if (!raw.media_url && !raw.mediaUrl && !raw.audioUrl && !raw.audio_url && !raw.url && !raw.base64 && !raw.media_base64 && !raw.body?.mediaUrl && !raw.media?.url) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.media_url' or 'raw_event.base64' is required" };
      }
      break;

    case "video":
    case "video-note":
      if (!raw.id) return { valid: false, error: "invalid_payload", message: "'raw_event.id' is required" };
      if (!raw.media_url && !raw.mediaUrl && !raw.videoUrl && !raw.video_url && !raw.url && !raw.base64 && !raw.media_base64 && !raw.body?.mediaUrl && !raw.media?.url) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.media_url' or 'raw_event.base64' is required" };
      }
      break;

    case "document":
      if (!raw.id) return { valid: false, error: "invalid_payload", message: "'raw_event.id' is required" };
      if (!raw.media_url && !raw.mediaUrl && !raw.documentUrl && !raw.document_url && !raw.file_url && !raw.fileUrl && !raw.url && !raw.base64 && !raw.media_base64 && !raw.body?.mediaUrl && !raw.media?.url) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.media_url' or 'raw_event.base64' is required" };
      }
      break;

    case "sticker":
      if (!raw.id) return { valid: false, error: "invalid_payload", message: "'raw_event.id' is required" };
      if (!raw.media_url && !raw.mediaUrl && !raw.stickerUrl && !raw.sticker_url && !raw.url && !raw.base64 && !raw.media_base64 && !raw.body?.mediaUrl && !raw.media?.url) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.media_url' or 'raw_event.base64' is required" };
      }
      break;

    case "location":
      if (!raw.id) return { valid: false, error: "invalid_payload", message: "'raw_event.id' is required" };
      if (raw.latitude === undefined || raw.longitude === undefined) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.latitude' and 'raw_event.longitude' are required" };
      }
      break;

    case "contact":
    case "contacts":
      if (!raw.id) return { valid: false, error: "invalid_payload", message: "'raw_event.id' is required" };
      if (!raw.contact_name && !raw.contact_phone && !raw.contacts && !raw.vcard) {
        return { valid: false, error: "invalid_payload", message: "Contact information ('contact_name', 'contact_phone' or 'contacts' array) is required" };
      }
      break;

    case "poll":
      if (!raw.id) return { valid: false, error: "invalid_payload", message: "'raw_event.id' is required" };
      break;

    case "reaction":
      if (!raw.target_message_id && !raw.targetMessageId) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.target_message_id' is required" };
      }
      if (raw.reaction === undefined || raw.reaction === null) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.reaction' is required" };
      }
      break;

    case "edited":
      if (!raw.original_message_id && !raw.originalMessageId) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.original_message_id' is required" };
      }
      if (raw.body === undefined || raw.body === null) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.body' is required" };
      }
      break;

    case "revoked":
      if (!raw.revoked_message_id && !raw.revokedMessageId) {
        return { valid: false, error: "invalid_payload", message: "'raw_event.revoked_message_id' is required" };
      }
      break;

    default:
      return { valid: false, error: "invalid_endpoint", message: `Unsupported message type: '${type}'` };
  }

  return { valid: true };
}
