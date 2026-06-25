import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface RoutedRequest {
  url: string;
  action: string;
}

export function routeZApiRequest(endpoint: string, method: string, requestBody: any): RoutedRequest {
  const cleanEndpoint = endpoint.split("?")[0].toLowerCase();

  // 1. Group Management
  if (
    cleanEndpoint.includes("/group") ||
    cleanEndpoint.includes("/update-group") ||
    cleanEndpoint.includes("/create-group")
  ) {
    let action = "group_action";
    if (cleanEndpoint.includes("/group-members")) action = "group_members";
    else if (cleanEndpoint.includes("/group-invitation-link")) action = "group_invitation_link";
    else if (cleanEndpoint === "/groups" || cleanEndpoint === "/group") action = "groups";
    else if (cleanEndpoint.includes("/create-group")) action = "group_create";
    else if (cleanEndpoint.includes("/update-group-name")) action = "group_update_name";
    else if (cleanEndpoint.includes("/update-group-photo")) action = "group_update_photo";
    else if (cleanEndpoint.includes("/update-group-description")) action = "group_update_description";
    else if (cleanEndpoint.includes("/update-group-members")) {
      action = requestBody?.action ? `group_${requestBody.action.toLowerCase()}_member` : "group_update_members";
    }
    return {
      url: "https://n8n.6ksfuf.easypanel.host/webhook/manager_groups",
      action
    };
  }

  // 2. Message Management
  if (
    cleanEndpoint.includes("/send-") ||
    cleanEndpoint.includes("/delete-message") ||
    cleanEndpoint.includes("/read-message")
  ) {
    const action = cleanEndpoint.replace(/^\//, "").replace(/-/g, "_");
    return {
      url: "https://n8n.6ksfuf.easypanel.host/webhook/manager_messages",
      action
    };
  }

  // 3. Contact Management
  if (
    cleanEndpoint.includes("/phone-exists") ||
    cleanEndpoint.includes("/block-contact") ||
    cleanEndpoint.includes("/unblock-contact") ||
    cleanEndpoint.includes("/contacts")
  ) {
    let action = "contact_action";
    if (cleanEndpoint.includes("/phone-exists")) action = "phone_exists";
    return {
      url: "https://n8n.6ksfuf.easypanel.host/webhook/manager_contacts",
      action
    };
  }

  // 4. Chat Management
  if (
    cleanEndpoint.includes("/chats") ||
    cleanEndpoint.includes("/mark-as-read") ||
    cleanEndpoint.includes("/archive-chat") ||
    cleanEndpoint.includes("/pin-chat")
  ) {
    return {
      url: "https://n8n.6ksfuf.easypanel.host/webhook/manager_chats",
      action: cleanEndpoint.replace(/^\//, "").replace(/-/g, "_")
    };
  }

  // 5. Status Management
  if (cleanEndpoint.includes("/status-") || cleanEndpoint.includes("/send-status")) {
    return {
      url: "https://n8n.6ksfuf.easypanel.host/webhook/manager_status",
      action: cleanEndpoint.replace(/^\//, "").replace(/-/g, "_")
    };
  }

  // 6. Business Management
  if (
    cleanEndpoint.includes("/product") ||
    cleanEndpoint.includes("/label") ||
    cleanEndpoint.includes("/collection") ||
    cleanEndpoint.includes("/business")
  ) {
    return {
      url: "https://n8n.6ksfuf.easypanel.host/webhook/manager_whatsapp_business",
      action: cleanEndpoint.replace(/^\//, "").replace(/-/g, "_")
    };
  }

  // 7. Instance Management (Fallback/Default)
  let instanceAction = "instance_action";
  if (cleanEndpoint.includes("/status")) instanceAction = "status";
  else if (cleanEndpoint.includes("/restart")) instanceAction = "restart";
  else if (cleanEndpoint.includes("/disconnect")) instanceAction = "disconnect";
  else if (cleanEndpoint.includes("/qr-code")) instanceAction = "qrcode";
  else if (cleanEndpoint.includes("/update-every-webhooks")) instanceAction = "update_every_webhooks";
  else if (cleanEndpoint.includes("/update-webhook-")) instanceAction = "update_webhook";

  return {
    url: "https://n8n.6ksfuf.easypanel.host/webhook/manager_instance",
    action: instanceAction
  };
}

function normalizeGroupJids(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    if (obj.includes("@g.us")) {
      return obj.replace("@g.us", "-group");
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizeGroupJids);
  }
  if (typeof obj === "object") {
    const copy: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      copy[key] = normalizeGroupJids(obj[key]);
    }
    return copy;
  }
  return obj;
}

function getCategoryKeyForEndpoint(endpoint: string): string {
  const cleanEndpoint = endpoint.split("?")[0].toLowerCase();
  if (
    cleanEndpoint.includes("/group") ||
    cleanEndpoint.includes("/update-group") ||
    cleanEndpoint.includes("/create-group")
  ) {
    return "groups";
  }
  if (
    cleanEndpoint.includes("/send-") ||
    cleanEndpoint.includes("/delete-message") ||
    cleanEndpoint.includes("/read-message")
  ) {
    return "messages";
  }
  if (
    cleanEndpoint.includes("/phone-exists") ||
    cleanEndpoint.includes("/block-contact") ||
    cleanEndpoint.includes("/unblock-contact") ||
    cleanEndpoint.includes("/contacts")
  ) {
    return "contacts";
  }
  if (
    cleanEndpoint.includes("/chats") ||
    cleanEndpoint.includes("/mark-as-read") ||
    cleanEndpoint.includes("/archive-chat") ||
    cleanEndpoint.includes("/pin-chat")
  ) {
    return "chat";
  }
  if (cleanEndpoint.includes("/status-") || cleanEndpoint.includes("/send-status")) {
    return "status";
  }
  if (
    cleanEndpoint.includes("/product") ||
    cleanEndpoint.includes("/label") ||
    cleanEndpoint.includes("/collection") ||
    cleanEndpoint.includes("/business")
  ) {
    return "business";
  }
  return "instance";
}

export async function fetchZApi(
  instanceId: string,
  instanceToken: string,
  endpoint: string,
  method: string,
  body: any,
  headers: Record<string, string> = {}
): Promise<Response> {
  // Normalize body/payload
  let content = body ? { ...body } : {};

  // Extract query parameters and merge into content
  if (endpoint.includes("?")) {
    const queryStr = endpoint.split("?")[1];
    const params = new URLSearchParams(queryStr);
    for (const [key, val] of params.entries()) {
      content[key] = val;
    }
  }

  // Extract path parameters for GET requests
  const cleanEndpoint = endpoint.split("?")[0];
  if (cleanEndpoint.includes("/phone-exists/")) {
    const parts = cleanEndpoint.split("/phone-exists/");
    if (parts[1]) content.phone = parts[1];
  } else if (cleanEndpoint.includes("/group-invitation-link/")) {
    const parts = cleanEndpoint.split("/group-invitation-link/");
    if (parts[1]) content.groupId = parts[1];
  }

  // Normalize group JIDs to -group format for n8n compatibility
  content = normalizeGroupJids(content);

  // Route to the correct n8n endpoint
  const routed = routeZApiRequest(endpoint, method, content);

  // 1. Get user_id from instances table to resolve custom webhooks
  let webhookUrl = "";
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: instance } = await supabase
        .from("instances")
        .select("user_id")
        .eq("external_instance_id", instanceId)
        .maybeSingle();

      if (instance?.user_id) {
        const categoryKey = getCategoryKeyForEndpoint(endpoint);
        const { data: webhookConfig } = await supabase
          .from("webhook_configs")
          .select("url, is_active")
          .eq("user_id", instance.user_id)
          .eq("category", categoryKey)
          .maybeSingle();

        if (webhookConfig?.is_active && webhookConfig?.url) {
          webhookUrl = webhookConfig.url;
        }
      }
    }
  } catch (dbErr: any) {
    console.error("[n8n-router] Error fetching webhook config from DB:", dbErr.message);
  }

  const targetUrl = webhookUrl || routed.url;
  
  // Extract API key if available
  const apiKey = headers["Client-Token"] || headers["Authorization"] || Deno.env.get("CLIENT_TOKEN") || "";

  const n8nPayload = {
    provider: "z_api",
    instance_id: instanceId,
    instance_token: instanceToken,
    api_key: apiKey,
    action: routed.action,
    content: content
  };

  console.log(`[n8n-router] Routing: ${endpoint} (${method}) -> ${targetUrl} [Action: ${routed.action}]`);

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(n8nPayload)
  });

  return response;
}
