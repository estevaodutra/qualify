/**
 * Classificador Unificado de Eventos WhatsApp
 * 
 * Fonte ÚNICA de verdade para classificação de eventos.
 * Usado por: webhook-inbound (tempo real) e reclassify-events (batch).
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassificationResult {
  eventType: string;
  eventSubtype: string | null;
  classification: "identified" | "pending";
  direction: "inbound" | "outbound" | "system";
  confidence: "high" | "medium" | "low";
  matchedRule: string;
}

export interface EventContext {
  chatJid: string | null;
  chatType: string | null;
  chatName: string | null;
  senderPhone: string | null;
  senderLid: string | null;
  senderName: string | null;
  messageId: string | null;
  eventTimestamp: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAPAS DE EVENTOS
// ═══════════════════════════════════════════════════════════════════════════════

// Z-API direct event names (both old and new formats)
const ZAPI_EVENT_MAP: Record<string, string> = {
  // New format
  "poll.vote": "poll_response",
  "message.ack": "message_status",
  "group.participant.add": "group_join",
  "group.participant.remove": "group_leave",
  "group.participant.promote": "group_promote",
  "group.participant.demote": "group_demote",
  "group.update": "group_update",
  "connection.update": "connection_status",
  "qrcode.updated": "qrcode_update",
  "call.received": "call_received",
  "message.revoked": "message_revoked",
  // Old format (legacy)
  "on-message-send": "message_sent",
  "message-status-callback": "message_status",
  "on-message-received": "text_message",
  "on-message-ack": "message_status",
  "connected": "connection_status",
  "disconnected": "connection_status",
  "qrcode": "qrcode_update",
  "on-chat-presence": "chat_presence",
  "on-participant-changed": "group_update",
  "ReceivedCallback": "text_message",
};

// Message type mapping (both camelCase and lowercase)
const MESSAGE_TYPE_MAP: Record<string, string> = {
  // camelCase (Z-API message.received)
  conversation: "text_message",
  extendedTextMessage: "text_message",
  imageMessage: "image_message",
  videoMessage: "video_message",
  audioMessage: "audio_message",
  documentMessage: "document_message",
  stickerMessage: "sticker_message",
  locationMessage: "location_message",
  contactMessage: "contact_message",
  buttonsResponseMessage: "button_response",
  listResponseMessage: "list_response",
  reactionMessage: "message_reaction",
  pollCreationMessage: "poll_message",
  pollUpdateMessage: "poll_response",
  documentWithCaptionMessage: "document_message",
  // lowercase (legacy/reclassify format)
  text: "text_message",
  chat: "text_message",
  image: "image_message",
  video: "video_message",
  audio: "audio_message",
  ptt: "audio_message",
  document: "document_message",
  sticker: "sticker_message",
  location: "location_message",
  vcard: "contact_message",
  contact: "contact_message",
  poll_creation: "poll_message",
  poll_response: "poll_response",
};

// Group notification mapping
const NOTIFICATION_MAP: Record<string, string> = {
  "GROUP_PARTICIPANT_ADD": "group_join",
  "GROUP_PARTICIPANT_INVITE": "group_join",
  "GROUP_PARTICIPANT_REMOVE": "group_leave",
  "GROUP_PARTICIPANT_PROMOTE": "group_promote",
  "GROUP_PARTICIPANT_DEMOTE": "group_demote",
  "GROUP_PARTICIPANT_LEAVE": "group_leave",
  "GROUP_CREATE": "group_update",
  "GROUP_SUBJECT": "group_update",
  "GROUP_DESCRIPTION": "group_update",
  "GROUP_ICON": "group_update",
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICADOR PRINCIPAL - Z-API
// ═══════════════════════════════════════════════════════════════════════════════

export function classifyZApiEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  const event = rawEvent.event as string | undefined;
  const eventType = rawEvent.eventType as string | undefined;
  const rawType = rawEvent.type as string | undefined;
  const eventName = event || eventType || rawType;
  const body = rawEvent.body as Record<string, unknown> | undefined;

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 1: Poll Vote (PRIORIDADE MÁXIMA)
  // ─────────────────────────────────────────────────────────────────────────────
  const pollVote = body?.pollVote as Record<string, unknown> | undefined;
  if (pollVote) {
    return {
      eventType: "poll_response",
      eventSubtype: "pollVote",
      classification: "identified",
      direction: "inbound",
      confidence: "high",
      matchedRule: "poll_vote_body",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 2: Mídia - Imagem (body.photo é foto de perfil, NÃO imagem)
  // ─────────────────────────────────────────────────────────────────────────────
  const mimeType = (body?.mimeType || rawEvent.mimeType || body?.mimetype || rawEvent.mimetype) as string | undefined;

  if (
    body?.image !== undefined ||
    body?.imageUrl !== undefined ||
    rawEvent.imageUrl !== undefined ||
    mimeType?.startsWith("image/")
  ) {
    return {
      eventType: "image_message",
      eventSubtype: mimeType || (body?.image ? "body.image" : "imageUrl"),
      classification: "identified",
      direction: detectDirection(body, rawEvent),
      confidence: "high",
      matchedRule: "media_image",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 3: Mídia - Vídeo
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    body?.video !== undefined ||
    body?.videoUrl !== undefined ||
    rawEvent.videoUrl !== undefined ||
    mimeType?.startsWith("video/")
  ) {
    return {
      eventType: "video_message",
      eventSubtype: mimeType || (body?.video ? "body.video" : "videoUrl"),
      classification: "identified",
      direction: detectDirection(body, rawEvent),
      confidence: "high",
      matchedRule: "media_video",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 4: Mídia - Áudio
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    body?.audio !== undefined ||
    body?.audioUrl !== undefined ||
    rawEvent.audioUrl !== undefined ||
    body?.ptt !== undefined ||
    mimeType?.startsWith("audio/")
  ) {
    return {
      eventType: "audio_message",
      eventSubtype: mimeType || (body?.audio ? "body.audio" : body?.ptt ? "ptt" : "audioUrl"),
      classification: "identified",
      direction: detectDirection(body, rawEvent),
      confidence: "high",
      matchedRule: "media_audio",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 5: Mídia - Documento
  // ─────────────────────────────────────────────────────────────────────────────
  if (
    body?.document !== undefined ||
    body?.documentUrl !== undefined ||
    rawEvent.documentUrl !== undefined ||
    mimeType?.startsWith("application/")
  ) {
    return {
      eventType: "document_message",
      eventSubtype: mimeType || (body?.document ? "body.document" : "documentUrl"),
      classification: "identified",
      direction: detectDirection(body, rawEvent),
      confidence: "high",
      matchedRule: "media_document",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 6: Mídia - Sticker
  // ─────────────────────────────────────────────────────────────────────────────
  if (body?.sticker !== undefined || rawEvent.sticker !== undefined) {
    return {
      eventType: "sticker_message",
      eventSubtype: "sticker",
      classification: "identified",
      direction: detectDirection(body, rawEvent),
      confidence: "high",
      matchedRule: "media_sticker",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 7: Notificação de Grupo (GROUP_PARTICIPANT_*)
  // ─────────────────────────────────────────────────────────────────────────────
  const notification = body?.notification as string | undefined;
  if (notification && NOTIFICATION_MAP[notification]) {
    return {
      eventType: NOTIFICATION_MAP[notification],
      eventSubtype: notification,
      classification: "identified",
      direction: "system",
      confidence: "high",
      matchedRule: "group_notification",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 8: Mapeamento direto de evento Z-API
  // ─────────────────────────────────────────────────────────────────────────────
  if (eventName && ZAPI_EVENT_MAP[eventName]) {
    const mapped = ZAPI_EVENT_MAP[eventName];
    return {
      eventType: mapped,
      eventSubtype: eventName,
      classification: "identified",
      direction: mapped.includes("status") || mapped.includes("connection") ? "system" : detectDirection(body, rawEvent),
      confidence: "high",
      matchedRule: "zapi_event_map",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 9: Reação (emoji)
  // ─────────────────────────────────────────────────────────────────────────────
  const reaction = (body?.reaction || rawEvent.reaction) as Record<string, unknown> | undefined;
  if (reaction?.value !== undefined) {
    return {
      eventType: "reaction",
      eventSubtype: String(reaction.value),
      classification: "identified",
      direction: detectDirection(body, rawEvent),
      confidence: "high",
      matchedRule: "reaction_value",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 10: Status de Mensagem (PLAYED, RECEIVED, READ, READ_BY_ME)
  // ─────────────────────────────────────────────────────────────────────────────
  const bodyStatus = body?.status as string | undefined;
  const STATUS_MAP: Record<string, string> = {
    PLAYED: "played",
    RECEIVED: "message_received",
    READ: "message_read",
    READ_BY_ME: "read_by_me",
  };
  if (bodyStatus && STATUS_MAP[bodyStatus]) {
    return {
      eventType: STATUS_MAP[bodyStatus],
      eventSubtype: bodyStatus,
      classification: "identified",
      direction: "system",
      confidence: "high",
      matchedRule: "status_callback",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 11: Texto via body.text.message (n8n Z-API format)
  // ─────────────────────────────────────────────────────────────────────────────
  const bodyText = body?.text as Record<string, unknown> | undefined;
  if (bodyText?.message !== undefined) {
    return {
      eventType: "text_message",
      eventSubtype: "ReceivedCallback",
      classification: "identified",
      direction: detectDirection(body, rawEvent),
      confidence: "high",
      matchedRule: "text_body_message",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 12: message.received com tipo no message object
  // ─────────────────────────────────────────────────────────────────────────────
  if (eventName === "message.received" || eventName === "ReceivedCallback") {
    const data = rawEvent.data as Record<string, unknown> | undefined;
    const message = (data?.message || rawEvent.message) as Record<string, unknown> | undefined;

    if (message) {
      for (const [key, messageType] of Object.entries(MESSAGE_TYPE_MAP)) {
        if (message[key] !== undefined) {
          return {
            eventType: messageType,
            eventSubtype: key,
            classification: "identified",
            direction: detectDirection(body, rawEvent),
            confidence: "high",
            matchedRule: "message_received_type",
          };
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 13: Resposta de botão
  // ─────────────────────────────────────────────────────────────────────────────
  const selectedButtonId = rawEvent.selectedButtonId as string | undefined;
  if (selectedButtonId) {
    return {
      eventType: "button_response",
      eventSubtype: selectedButtonId,
      classification: "identified",
      direction: "inbound",
      confidence: "high",
      matchedRule: "button_response_id",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 14: Resposta de lista
  // ─────────────────────────────────────────────────────────────────────────────
  const listResponseTitle = (rawEvent.listResponse as Record<string, unknown>)?.title as string | undefined;
  if (listResponseTitle) {
    return {
      eventType: "list_response",
      eventSubtype: listResponseTitle,
      classification: "identified",
      direction: "inbound",
      confidence: "high",
      matchedRule: "list_response_title",
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 15: Ação de participante (add/remove/promote/demote)
  // ─────────────────────────────────────────────────────────────────────────────
  const participantAction = rawEvent.action as string | undefined;
  if (participantAction) {
    const actionMap: Record<string, string> = {
      add: "group_join",
      remove: "group_leave",
      promote: "group_promote",
      demote: "group_demote",
    };
    if (actionMap[participantAction]) {
      return {
        eventType: actionMap[participantAction],
        eventSubtype: participantAction,
        classification: "identified",
        direction: "system",
        confidence: "medium",
        matchedRule: "participant_action",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGRA 16: messageType genérico (fallback)
  // ─────────────────────────────────────────────────────────────────────────────
  const messageType = (
    rawEvent.type ||
    rawEvent.messageType ||
    (rawEvent.message as Record<string, unknown>)?.type ||
    body?.type ||
    (body?.message as Record<string, unknown>)?.type
  ) as string | undefined;

  if (messageType) {
    const normalizedType = messageType.toLowerCase();
    if (MESSAGE_TYPE_MAP[normalizedType]) {
      return {
        eventType: MESSAGE_TYPE_MAP[normalizedType],
        eventSubtype: messageType,
        classification: "identified",
        direction: detectDirection(body, rawEvent),
        confidence: "medium",
        matchedRule: "message_type_map",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FALLBACK: Unknown
  // ─────────────────────────────────────────────────────────────────────────────
  return {
    eventType: "unknown",
    eventSubtype: eventName || null,
    classification: "pending",
    direction: "system",
    confidence: "low",
    matchedRule: "no_match",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICADORES - EVOLUTION & META
// ═══════════════════════════════════════════════════════════════════════════════

export function classifyEvolutionEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  const event = rawEvent.event as string | undefined;

  const eventMap: Record<string, string> = {
    "messages.upsert": "text_message",
    "messages.update": "message_status",
    "connection.update": "connection_status",
    "qrcode.updated": "qrcode_update",
    "groups.upsert": "group_update",
    "groups.update": "group_update",
    "presence.update": "chat_presence",
  };

  if (event && eventMap[event]) {
    return {
      eventType: eventMap[event],
      eventSubtype: event,
      classification: "identified",
      direction: "system",
      confidence: "medium",
      matchedRule: "evolution_event_map",
    };
  }

  return {
    eventType: "unknown",
    eventSubtype: event || null,
    classification: "pending",
    direction: "system",
    confidence: "low",
    matchedRule: "no_match",
  };
}

export function classifyMetaEvent(rawEvent: Record<string, unknown>): ClassificationResult {
  const entry = (rawEvent.entry as Array<Record<string, unknown>>)?.[0];
  const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
  const field = changes?.field as string;

  if (field === "messages") {
    const value = changes?.value as Record<string, unknown>;
    const messages = value?.messages as Array<Record<string, unknown>>;
    if (messages?.[0]) {
      const msgType = messages[0].type as string;
      const mapped = MESSAGE_TYPE_MAP[msgType];
      return {
        eventType: mapped || "unknown",
        eventSubtype: msgType,
        classification: mapped ? "identified" : "pending",
        direction: "inbound",
        confidence: mapped ? "high" : "low",
        matchedRule: mapped ? "meta_message_type" : "no_match",
      };
    }

    const statuses = value?.statuses as Array<Record<string, unknown>>;
    if (statuses?.[0]) {
      return {
        eventType: "message_status",
        eventSubtype: statuses[0].status as string,
        classification: "identified",
        direction: "system",
        confidence: "high",
        matchedRule: "meta_status",
      };
    }
  }

  return {
    eventType: "unknown",
    eventSubtype: field || null,
    classification: "pending",
    direction: "system",
    confidence: "low",
    matchedRule: "no_match",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════

export function classifyEvent(source: string, rawEvent: Record<string, unknown>): ClassificationResult {
  switch (source) {
    case "z-api":
      return classifyZApiEvent(rawEvent);
    case "evolution":
      return classifyEvolutionEvent(rawEvent);
    case "meta":
      return classifyMetaEvent(rawEvent);
    default:
      return classifyZApiEvent(rawEvent);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRATOR DE CONTEXTO
// ═══════════════════════════════════════════════════════════════════════════════

export function extractContext(source: string, rawEvent: Record<string, unknown>): EventContext {
  // Z-API context extraction works for most providers
  return extractZApiContext(rawEvent);
}

function extractZApiContext(rawEvent: Record<string, unknown>): EventContext {
  const data = rawEvent.data as Record<string, unknown> | undefined;
  const key = (data?.key || rawEvent.key) as Record<string, unknown> | undefined;
  const body = rawEvent.body as Record<string, unknown> | undefined;
  const message = (rawEvent.message || body?.message) as Record<string, unknown> | undefined;
  const chat = (rawEvent.chat || body?.chat || message?.chat) as Record<string, unknown> | undefined;
  const sender = (rawEvent.sender || body?.sender || message?.sender) as Record<string, unknown> | undefined;

  // chatJid from multiple sources
  let chatJid = (
    key?.remoteJid ||
    data?.chatId ||
    rawEvent.chatId ||
    rawEvent.from ||
    body?.chatId ||
    body?.from ||
    chat?.id ||
    message?.from
  ) as string | null;

  if (!chatJid) {
    chatJid = (rawEvent.phone || body?.phone) as string | null;
  }

  const isGroup = chatJid?.includes("@g.us") || false;

  // senderPhone
  let senderPhone = (
    sender?.phone ||
    rawEvent.senderPhone ||
    body?.senderPhone ||
    body?.participantPhone ||    // Z-API poll votes use this field
    rawEvent.participant as string
  ) as string | null;

  if (!senderPhone && chatJid) {
    senderPhone = chatJid.split("@")[0];
  }

  // For group participant notifications, extract participant identifier
  let senderLid: string | null = null;
  const notification = body?.notification as string | undefined;
  if (notification?.startsWith("GROUP_PARTICIPANT")) {
    const notifParams = body?.notificationParameters as string[] | undefined;
    const participantRaw = notifParams?.[0]; // e.g. "212055487447252@lid" or "5511999999999@s.whatsapp.net"
    if (participantRaw) {
      if (participantRaw.includes("@lid")) {
        // This is a LID, NOT a phone number
        senderLid = participantRaw;
        senderPhone = null; // Do NOT put LID in senderPhone
      } else {
        // Extract phone number (e.g. from @s.whatsapp.net)
        const numericId = participantRaw.split("@")[0];
        if (numericId) {
          senderPhone = numericId;
        }
      }
    } else {
      // Fallback to connectedPhone only if no notificationParameters
      const connectedPhone = body?.connectedPhone as string | undefined;
      if (connectedPhone) {
        senderPhone = connectedPhone;
      }
    }
  }

  // senderName
  const senderName = (
    data?.pushName ||
    rawEvent.senderName ||
    body?.senderName ||
    body?.pushName ||
    rawEvent.pushName ||
    sender?.name
  ) as string | null;

  // chatName
  const chatName = (
    data?.groupName ||
    data?.pushName ||
    rawEvent.chatName ||
    body?.chatName ||
    chat?.name
  ) as string | null;

  // messageId
  const messageId = (
    key?.id ||
    data?.messageId ||
    rawEvent.messageId ||
    rawEvent.id ||
    body?.messageId ||
    body?.id ||
    message?.id ||
    (message?.key as Record<string, unknown>)?.id ||
    rawEvent.zapiMessageId
  ) as string | null;

  // timestamp
  let eventTimestamp: string | null = null;
  const timestamp = (
    data?.messageTimestamp ||
    rawEvent.messageTimestamp ||
    rawEvent.timestamp ||
    body?.momment ||
    body?.timestamp ||
    rawEvent.momment ||
    message?.messageTimestamp
  ) as number | string | null;

  if (timestamp) {
    try {
      const ts = typeof timestamp === "number"
        ? (timestamp > 9999999999 ? timestamp : timestamp * 1000)
        : parseInt(String(timestamp), 10);
      if (!isNaN(ts)) {
        eventTimestamp = new Date(ts).toISOString();
      }
    } catch {
      // Ignore parsing errors
    }
  }

  return {
    chatJid,
    chatType: isGroup ? "group" : "private",
    chatName,
    senderPhone,
    senderLid: senderLid ?? null,
    senderName,
    messageId,
    eventTimestamp,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function detectDirection(
  body: Record<string, unknown> | undefined,
  rawEvent: Record<string, unknown>
): "inbound" | "outbound" | "system" {
  const fromMe = body?.fromMe ?? rawEvent.fromMe;
  if (fromMe === true) return "outbound";
  if (fromMe === false) return "inbound";
  return "inbound"; // Default for messages
}
