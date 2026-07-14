/**
 * Normalizes any webhook/trigger payload to the official canonical schema:
 * {
 *   "method": "POST",
 *   "headers": {},
 *   "query_params": {},
 *   "body": {},
 *   "received_at": "...",
 *   "raw": {}
 * }
 */
export function toCanonicalPayload(payload: any): {
  method: string;
  headers: Record<string, any>;
  query_params: Record<string, any>;
  body: Record<string, any>;
  received_at: string;
  raw: any;
} {
  const defaultPayload = {
    method: "POST",
    headers: {},
    query_params: {},
    body: {},
    received_at: new Date().toISOString(),
    raw: {},
  };

  if (!payload) {
    return defaultPayload;
  }

  // Case 1: Trigger context wrapping webhookPayload
  if (payload.webhookPayload && typeof payload.webhookPayload === "object") {
    return toCanonicalPayload(payload.webhookPayload);
  }

  // Case 2: Already structured canonical format
  if (payload.body && typeof payload.body === "object") {
    return {
      method: payload.method || "POST",
      headers: payload.headers || {},
      query_params: payload.query_params || {},
      body: payload.body || {},
      received_at: payload.received_at || new Date().toISOString(),
      raw: payload.raw || payload.body,
    };
  }

  // Case 3: Raw body data (old executions or custom text mocks)
  return {
    method: "POST",
    headers: {},
    query_params: {},
    body: payload,
    received_at: new Date().toISOString(),
    raw: payload,
  };
}
