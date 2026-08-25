import {
  type SupportedMessageType,
  validateMessagePayload,
  type BaseWebhookPayload,
} from "../_shared/message-schemas.ts";
import { MessageIngestionService } from "../_shared/message-ingestion.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const SUPPORTED_MESSAGE_TYPES: SupportedMessageType[] = [
  "text",
  "image",
  "audio",
  "voice",
  "video",
  "video-note",
  "document",
  "sticker",
  "location",
  "contact",
  "contacts",
  "poll",
  "reaction",
  "edited",
  "revoked",
  "status",
  "delivered",
  "read",
  "sent",
  "failed",
  "ack",
];

const ingestionService = new MessageIngestionService();

// Version: 2026-08-24.18
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const url = new URL(req.url);
  const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "";

  // 1. Extração do endpoint e tipo da rota
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Ex: ["functions", "v1", "webhooks", "messages", "text"] -> type: "text"
  // Ex: ["webhooks", "messages", "image"] -> type: "image"
  // Ex: ["messages", "audio"] -> type: "audio"
  let detectedType: string | null = null;

  for (let i = pathParts.length - 1; i >= 0; i--) {
    const part = pathParts[i].toLowerCase();
    if (SUPPORTED_MESSAGE_TYPES.includes(part as SupportedMessageType)) {
      detectedType = part;
      break;
    }
  }

  // Fallback por query param (?type=text)
  if (!detectedType && url.searchParams.get("type")) {
    const queryType = url.searchParams.get("type")!.toLowerCase();
    if (SUPPORTED_MESSAGE_TYPES.includes(queryType as SupportedMessageType)) {
      detectedType = queryType;
    }
  }

  if (!detectedType) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "invalid_endpoint",
        message: `Endpoint '${url.pathname}' is not a valid message webhook route. Supported routes: ${SUPPORTED_MESSAGE_TYPES.map(t => `/webhooks/messages/${t}`).join(", ")}`,
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const messageType = detectedType as SupportedMessageType;

  // 2. Parse do Body
  let body: any = null;
  try {
    const bodyText = await req.text();
    body = JSON.parse(bodyText);
  } catch (_e) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "invalid_json",
        message: "Failed to parse request body as JSON",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // 3. Validação Estrita do Schema para o Endpoint Específico
  const validation = validateMessagePayload(messageType, body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: validation.error || "invalid_payload",
        message: validation.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // 4. Ingestão através do MessageIngestionService
  const meta = {
    endpoint: url.pathname,
    method: req.method,
    ipAddress,
    startTime,
  };

  const result = await ingestionService.ingest(messageType, body as BaseWebhookPayload, meta);

  return new Response(JSON.stringify(result.body), {
    status: result.statusCode,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
