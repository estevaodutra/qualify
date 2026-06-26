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
    let action = "group.list"; // default fallback for groups
    if (cleanEndpoint.includes("/group-members")) action = "group.get_members";
    else if (cleanEndpoint.includes("/group-invitation-link")) action = "group.get_invite_link";
    else if (cleanEndpoint.includes("/revoke-group-invitation-link")) action = "group.revoke_invite_link";
    else if (cleanEndpoint.includes("/promote-group-admin")) action = "group.promote_admin";
    else if (cleanEndpoint.includes("/demote-group-admin")) action = "group.demote_admin";
    else if (cleanEndpoint.includes("/leave-group")) action = "group.leave";
    else if (cleanEndpoint.includes("/create-group")) action = "group.create";
    else if (cleanEndpoint.includes("/update-group-name")) action = "group.update_name";
    else if (cleanEndpoint.includes("/update-group-photo")) action = "group.update_photo";
    else if (cleanEndpoint.includes("/update-group-description")) action = "group.update_description";
    else if (cleanEndpoint.includes("/update-group-members")) {
      const memberAction = requestBody?.action?.toLowerCase();
      if (memberAction === "add") action = "group.add_member";
      else if (memberAction === "remove") action = "group.remove_member";
      else action = "group.update_members";
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
    let action = "message.send_text"; // default fallback for messages
    if (cleanEndpoint.includes("/send-image")) action = "message.send_image";
    else if (cleanEndpoint.includes("/send-video")) action = "message.send_video";
    else if (cleanEndpoint.includes("/send-audio")) action = "message.send_audio";
    else if (cleanEndpoint.includes("/send-document")) action = "message.send_document";
    else if (cleanEndpoint.includes("/send-sticker")) action = "message.send_sticker";
    else if (cleanEndpoint.includes("/send-location")) action = "message.send_location";
    else if (cleanEndpoint.includes("/send-contact")) action = "message.send_contact";
    else if (cleanEndpoint.includes("/send-buttons")) action = "message.send_buttons";
    else if (cleanEndpoint.includes("/send-list")) action = "message.send_list";
    else if (cleanEndpoint.includes("/send-poll")) action = "message.send_poll";
    else if (cleanEndpoint.includes("/send-reaction")) action = "message.send_reaction";
    else if (cleanEndpoint.includes("/send-media")) action = "message.send_media";
    else if (cleanEndpoint.includes("/delete-message")) action = "message.delete";
    else if (cleanEndpoint.includes("/read-message")) action = "message.read";

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
    cleanEndpoint.includes("/contacts") ||
    cleanEndpoint.includes("/contact-profile") ||
    cleanEndpoint.includes("/contact-photo") ||
    cleanEndpoint.includes("/business-info")
  ) {
    let action = "contact.list"; // default fallback for contacts
    if (cleanEndpoint.includes("/phone-exists")) action = "contact.check_exists";
    else if (cleanEndpoint.includes("/block-contact")) action = "contact.block";
    else if (cleanEndpoint.includes("/unblock-contact")) action = "contact.unblock";
    else if (cleanEndpoint.includes("/contact-profile")) action = "contact.get_profile";
    else if (cleanEndpoint.includes("/contact-photo")) action = "contact.get_photo";
    else if (cleanEndpoint.includes("/business-info")) action = "contact.get_business_info";

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
    cleanEndpoint.includes("/pin-chat") ||
    cleanEndpoint.includes("/mute-chat") ||
    cleanEndpoint.includes("/unmute-chat") ||
    cleanEndpoint.includes("/clear-chat") ||
    cleanEndpoint.includes("/delete-chat")
  ) {
    let action = "chat.list"; // default fallback for chats
    if (cleanEndpoint.includes("/mark-as-read")) action = "chat.mark_read";
    else if (cleanEndpoint.includes("/archive-chat")) action = "chat.archive";
    else if (cleanEndpoint.includes("/pin-chat")) action = "chat.pin";
    else if (cleanEndpoint.includes("/mute-chat")) action = "chat.mute";
    else if (cleanEndpoint.includes("/unmute-chat")) action = "chat.unmute";
    else if (cleanEndpoint.includes("/clear-chat")) action = "chat.clear";
    else if (cleanEndpoint.includes("/delete-chat")) action = "chat.delete";

    return {
      url: "https://n8n.6ksfuf.easypanel.host/webhook/manager_chats",
      action
    };
  }

  // 5. Status Management
  if (cleanEndpoint.includes("/status-") || cleanEndpoint.includes("/send-status") || cleanEndpoint === "/status") {
    let action = "status.list";
    if (cleanEndpoint.includes("/status-") || cleanEndpoint.includes("/send-status")) action = "status.send";

    return {
      url: "https://n8n.6ksfuf.easypanel.host/webhook/manager_status",
      action
    };
  }

  // 6. Business Management
  if (
    cleanEndpoint.includes("/product") ||
    cleanEndpoint.includes("/label") ||
    cleanEndpoint.includes("/collection") ||
    cleanEndpoint.includes("/business")
  ) {
    let action = "business.get_catalog";
    if (cleanEndpoint.includes("/product")) action = "business.send_product";
    else if (cleanEndpoint.includes("/business-profile")) action = "business.get_profile";

    return {
      url: "https://n8n.6ksfuf.easypanel.host/webhook/manager_whatsapp_business",
      action
    };
  }

  // 7. Instance Management (Fallback/Default)
  let instanceAction = "instance.status";
  if (cleanEndpoint.includes("/status")) instanceAction = "instance.status";
  else if (cleanEndpoint.includes("/restart")) instanceAction = "instance.restart";
  else if (cleanEndpoint.includes("/disconnect")) instanceAction = "instance.disconnect";
  else if (cleanEndpoint.includes("/qr-code")) instanceAction = "instance.qrcode";
  else if (cleanEndpoint.includes("/pairing-code")) instanceAction = "instance.connection.pairing-code";
  else if (cleanEndpoint.includes("/connect")) instanceAction = "instance.connect";
  else if (cleanEndpoint.includes("/update-every-webhooks")) instanceAction = "instance.update_every_webhooks";
  else if (cleanEndpoint.includes("/update-webhook")) instanceAction = "instance.update_webhook";

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
  headers: Record<string, string> = {},
  internalDbId?: string,
  triggerN8n: boolean = true
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

  // 1. Get user_id and name from instances table to resolve custom webhooks
  let webhookUrl = "";
  let instanceName = "";
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      let query = supabase.from("instances").select("user_id, name");
      if (internalDbId) {
        query = query.eq("id", internalDbId);
      } else {
        query = query.eq("external_instance_id", instanceId);
      }
      const { data: instances } = await query.limit(1);
      
      const instance = instances && instances.length > 0 ? instances[0] : null;

      if (instance?.user_id && triggerN8n) {
        instanceName = instance.name || "";
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
    instance_name: instanceName,
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
// Trigger
