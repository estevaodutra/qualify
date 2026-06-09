export interface StandardizedPayload {
  action: string;
  node: {
    id: string;
    type: string;
    order: number;
    config: Record<string, any>;
  };
  campaign: {
    id: string;
    name: string;
  };
  instance: {
    id: string;
    name: string;
    phone: string;
    provider: string;
    externalId: string;
    externalToken: string;
  };
  destination: {
    phone: string;
    jid: string;
    name: string;
  };
}

export interface ZApiResponse {
  zaapId?: string;
  messageId?: string;
  ok: boolean;
  status: number;
  details?: any;
}

function getZApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  try {
    const clientToken = Deno.env.get("CLIENT_TOKEN");
    const authorization = Deno.env.get("AUTHORIZATION");
    if (clientToken) headers["Client-Token"] = clientToken;
    if (authorization) headers["Authorization"] = authorization;
  } catch (e) {
    // Catch environment access errors if run in non-node/deno context
  }
  return headers;
}

export async function sendWhatsAppMessage(payload: StandardizedPayload): Promise<ZApiResponse> {
  const { action, node, instance, destination } = payload;
  const { provider, externalId, externalToken } = instance;
  
  // Normalizar JID/Phone: para grupos, usar o JID (contém @g.us ou @us).
  // Para privado, usar o phone.
  const target = destination.jid.endsWith("@g.us") ? destination.jid : destination.phone.replace("@s.whatsapp.net", "");

  console.log(`[whatsapp-client] Sending action ${action} to ${target} via provider ${provider}`);

  if (provider?.toLowerCase() === "evolution") {
    // Evolution API placeholder / custom setup can be implemented here if requested.
    // Cover Z-API as primary.
  }

  // Z-API base URL:
  const baseUrl = `https://api.z-api.io/instances/${externalId}/token/${externalToken}`;
  let endpoint = "";
  let body: Record<string, any> = { phone: target };

  const config = node.config || {};

  switch (action) {
    case "message.send_text":
      endpoint = "/send-text";
      body.message = config.text || config.content || config.message || "";
      break;

    case "message.send_image":
      endpoint = "/send-image";
      body.image = config.url;
      body.caption = config.caption || "";
      break;

    case "message.send_video":
      endpoint = "/send-video";
      body.video = config.url;
      body.caption = config.caption || "";
      break;

    case "message.send_audio":
      endpoint = "/send-audio";
      body.audio = config.url;
      break;

    case "message.send_document":
      endpoint = "/send-document";
      body.document = config.url;
      body.extension = config.extension || "pdf";
      body.fileName = config.filename || config.fileName || "document";
      break;

    case "message.send_sticker":
      endpoint = "/send-sticker";
      body.sticker = config.url;
      break;

    case "message.send_location":
      endpoint = "/send-location";
      body.latitude = config.latitude;
      body.longitude = config.longitude;
      body.title = config.title || "";
      body.address = config.address || "";
      break;

    case "message.send_contact":
      endpoint = "/send-contact";
      body.contactName = config.contactName || config.name || "";
      body.contactPhone = config.contactPhone || config.phone || "";
      break;

    case "message.send_buttons":
      endpoint = "/send-button-list";
      body.message = config.text || config.content || "";
      body.title = config.title || "";
      body.footer = config.footer || "";
      body.buttons = (config.buttons || []).map((btn: any) => ({
        id: btn.id || btn.value || Math.random().toString(),
        label: btn.label || btn.text || "",
      }));
      break;

    case "message.send_list":
      endpoint = "/send-option-list";
      body.message = config.text || config.content || "";
      body.title = config.title || "";
      body.buttonText = config.buttonText || "Opções";
      body.footer = config.footer || "";
      body.sections = (config.sections || []).map((sec: any) => ({
        title: sec.title || "",
        rows: (sec.rows || []).map((row: any) => ({
          rowId: row.rowId || row.id || Math.random().toString(),
          title: row.title || "",
          description: row.description || "",
        })),
      }));
      break;

    case "message.send_poll":
      endpoint = "/send-poll";
      body.pollName = config.question || config.title || "";
      body.options = config.options || [];
      break;

    case "message.send_reaction":
      endpoint = "/send-reaction";
      body.messageId = config.messageId;
      body.reaction = config.reaction;
      break;

    case "message.send_media":
      // Dynamic fallback for media node
      const mediaUrl = config.url || "";
      const mediaType = config.mediaType || "image";
      body.caption = config.caption || "";

      if (mediaType === "image") {
        endpoint = "/send-image";
        body.image = mediaUrl;
      } else if (mediaType === "video") {
        endpoint = "/send-video";
        body.video = mediaUrl;
      } else if (mediaType === "audio") {
        endpoint = "/send-audio";
        body.audio = mediaUrl;
        delete body.caption;
      } else {
        endpoint = "/send-document";
        body.document = mediaUrl;
        body.extension = config.extension || mediaUrl.split(".").pop() || "pdf";
        body.fileName = config.filename || "file";
      }
      break;

    // Group management:
    case "group.create":
      endpoint = "/create-group";
      body = {
        groupName: config.name || config.groupName || "",
        phones: config.phones || [],
      };
      break;

    case "group.update_name":
      endpoint = "/update-group-name";
      body.groupName = config.name || config.groupName || "";
      break;

    case "group.update_photo":
      endpoint = "/update-group-photo";
      body.image = config.url || config.photoUrl || "";
      break;

    case "group.update_description":
      endpoint = "/update-group-description";
      body.description = config.description || "";
      break;

    case "group.add_participant":
      endpoint = "/update-group-members";
      body = {
        phone: target,
        phones: config.phones || [config.phone],
        action: "ADD",
      };
      break;

    case "group.remove_participant":
      endpoint = "/update-group-members";
      body = {
        phone: target,
        phones: config.phones || [config.phone],
        action: "REMOVE",
      };
      break;

    case "group.promote_admin":
      endpoint = "/update-group-members";
      body = {
        phone: target,
        phones: config.phones || [config.phone],
        action: "PROMOTE",
      };
      break;

    case "group.demote_admin":
      endpoint = "/update-group-members";
      body = {
        phone: target,
        phones: config.phones || [config.phone],
        action: "DEMOTE",
      };
      break;

    default:
      console.warn(`[whatsapp-client] Unknown action mapping: ${action}. Trying to fallback to send-text.`);
      endpoint = "/send-text";
      body.message = config.text || config.content || JSON.stringify(config);
  }

  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getZApiHeaders(),
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(text);
    } catch {
      responseData = { raw: text };
    }

    if (!response.ok) {
      console.error(`[whatsapp-client] Z-API Error (HTTP ${response.status}):`, responseData);
      return {
        ok: false,
        status: response.status,
        details: responseData,
      };
    }

    // Z-API returns: { zaapId: "...", messageId: "...", id: "..." }
    // We normalize this.
    return {
      ok: true,
      status: response.status,
      zaapId: responseData.zaapId || responseData.id || null,
      messageId: responseData.messageId || responseData.id || null,
      details: responseData,
    };
  } catch (error: any) {
    console.error("[whatsapp-client] Network error calling Z-API:", error);
    return {
      ok: false,
      status: 500,
      details: error.message || error,
    };
  }
}

// Fetch group members directly from Z-API
export async function groupGetMembers(instance: any, groupJid: string): Promise<any[]> {
  const { external_instance_id: id, external_instance_token: token } = instance;
  const baseUrl = `https://api.z-api.io/instances/${id}/token/${token}`;
  
  // Z-API uses normalized JID (e.g. 123456789-group or 123456789@g.us depending on exact endpoint)
  // Standard format for query param is groupId. Usually Z-API expects groupId
  const groupId = groupJid.includes("@") ? groupJid : `${groupJid.replace("-group", "")}@g.us`;
  
  const url = `${baseUrl}/group-members?groupId=${groupId}`;
  console.log(`[whatsapp-client] Fetching group members from: ${url}`);
  
  const response = await fetch(url, {
    method: "GET",
    headers: getZApiHeaders(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Z-API group-members error (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  // Z-API returns a list of members. Format is: [{ phone: "...", name: "...", isAdmin: false }]
  return data;
}

// Fetch instance status
export async function getInstanceStatus(instance: any): Promise<any> {
  const { external_instance_id: id, external_instance_token: token } = instance;
  const url = `https://api.z-api.io/instances/${id}/token/${token}/status`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: getZApiHeaders(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Z-API status error (${response.status}): ${errorText}`);
  }
  
  return await response.json();
}

// Register all webhooks in Z-API
export async function registerZApiWebhooks(instance: any, webhookUrl: string): Promise<void> {
  const { external_instance_id: id, external_instance_token: token } = instance;
  const baseUrl = `https://api.z-api.io/instances/${id}/token/${token}`;
  
  const endpoints = [
    "/update-webhook-received",
    "/update-webhook-delivery",
    "/update-webhook-message-status",
  ];
  
  for (const ep of endpoints) {
    try {
      console.log(`[whatsapp-client] Registering webhook ${ep} with URL ${webhookUrl}`);
      const response = await fetch(`${baseUrl}${ep}`, {
        method: "PUT",
        headers: getZApiHeaders(),
        body: JSON.stringify({ value: webhookUrl }),
      });
      if (!response.ok) {
        const txt = await response.text();
        console.error(`[whatsapp-client] Failed to register webhook ${ep}:`, txt);
      }
    } catch (err: any) {
      console.error(`[whatsapp-client] Network error registering webhook ${ep}:`, err.message);
    }
  }
}

