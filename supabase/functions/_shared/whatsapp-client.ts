import { fetchZApi } from "./n8n-router.ts";

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
  requestUrl?: string;
  requestBody?: any;
  curl?: string;
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
  
  // Normalizar JID/Phone: para grupos, usar o JID (contém @g.us ou -group).
  // Para privado, usar o phone.
  let target = "";
  const jid = destination.jid || "";
  const phone = destination.phone || "";

  if (jid.includes("-group") || jid.endsWith("@g.us")) {
    target = jid.includes("@") ? jid : `${jid.replace("-group", "")}@g.us`;
  } else if (phone.includes("-group") || phone.endsWith("@g.us")) {
    target = phone.includes("@") ? phone : `${phone.replace("-group", "")}@g.us`;
  } else {
    target = phone.replace("@s.whatsapp.net", "");
  }

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
      if (config.viewOnce !== undefined) body.viewOnce = config.viewOnce;
      break;

    case "message.send_video":
      endpoint = "/send-video";
      body.video = config.url;
      body.caption = config.caption || "";
      if (config.isVideoNote !== undefined) {
        body.PTV = config.isVideoNote;
      }
      if (config.viewOnce !== undefined) body.viewOnce = config.viewOnce;
      break;

    case "message.send_ptv":
      endpoint = "/send-video";
      body.video = config.url;
      body.PTV = true;
      break;

    case "message.send_audio":
      endpoint = "/send-audio";
      body.audio = config.url;
      body.waveform = config.waveform ?? config.isVoiceMessage ?? true;
      body.viewOnce = config.viewOnce ?? false;
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
      body.buttons = (config.buttons || []).map((btn: any) => {
        const mappedBtn: any = {
          id: btn.id || btn.value || Math.random().toString(),
          label: btn.label || btn.text || "",
          type: btn.type || "REPLY",
        };
        
        if (btn.url) mappedBtn.url = btn.url;
        if (btn.phone) mappedBtn.phone = btn.phone;
        
        return mappedBtn;
      });
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

    case "message.send_media": {
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
        } else if (mediaType === "ptv") {
          endpoint = "/send-video";
          body.video = mediaUrl;
          body.PTV = true;
      } else if (mediaType === "audio") {
        endpoint = "/send-audio";
        body.audio = mediaUrl;
        body.waveform = config.waveform ?? config.isVoiceMessage ?? true;
        body.viewOnce = config.viewOnce ?? false;
        delete body.caption;
      } else {
        endpoint = "/send-document";
        body.document = mediaUrl;
        body.extension = config.extension || mediaUrl.split(".").pop() || "pdf";
        body.fileName = config.filename || "file";
      }
      break;
    }

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
      body.groupName = config.newName || config.name || config.groupName || "";
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
    case "status.post": {
      const statusType = (config.statusType as string) || "text";
      if (statusType === "text") {
        endpoint = "/send-text-status";
        body = {
          message: config.content || config.text || ""
        };
      } else if (statusType === "image") {
        endpoint = "/send-image-status";
        body = {
          image: config.url,
          caption: config.caption || ""
        };
      } else if (statusType === "video") {
        endpoint = "/send-video-status";
        body = {
          video: config.url,
          caption: config.caption || ""
        };
      } else if (statusType === "voice" || statusType === "audio") {
        endpoint = "/send-voice-status";
        body = {
          audio: config.url
        };
      }
      break;
    }

    case "status.send_image":
      endpoint = "/send-image-status";
      body = {
        image: config.url,
        caption: config.caption || ""
      };
      break;

    case "status.send_video":
      endpoint = "/send-video-status";
      body = {
        video: config.url,
        caption: config.caption || ""
      };
      break;

    default:
      console.warn(`[whatsapp-client] Unknown action mapping: ${action}. Trying to fallback to send-text.`);
      endpoint = "/send-text";
      body.message = config.text || config.content || JSON.stringify(config);
  }

  const url = `https://api.z-api.io/instances/${externalId}/token/${externalToken}${endpoint}`;
  const headers = getZApiHeaders();
  const curlHeaders = Object.entries(headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(" ");
  const curl = `curl -X POST "${url}" ${curlHeaders} -d '${JSON.stringify(body)}'`;

  try {
    const response = await fetchZApi(
      externalId,
      externalToken,
      endpoint,
      "POST",
      body,
      headers
    );

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
        requestUrl: url,
        requestBody: body,
        curl,
      };
    }

    // Normalize N8N custom webhook response format
    let normalizedData = responseData;
    if (Array.isArray(responseData)) {
      normalizedData = responseData[0] || {};
    }

    const zaapId = normalizedData.zaapId || normalizedData.id || null;
    const messageId = normalizedData.messageId || normalizedData.id || null;
    const wahaMessageId = normalizedData?.key?.id || null;
    const isMessageAction = action.startsWith("message.");
    const hasId = !!(zaapId || messageId || wahaMessageId);
    const isSuccess = isMessageAction ? hasId : true;

    return {
      ok: isSuccess,
      status: response.status,
      zaapId,
      messageId: messageId || wahaMessageId,
      details: normalizedData,
      requestUrl: url,
      requestBody: body,
      curl,
    };
  } catch (error: any) {
    console.error("[whatsapp-client] Network error calling Z-API:", error);
    return {
      ok: false,
      status: 500,
      details: error.message || error,
      requestUrl: url,
      requestBody: body,
      curl,
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
  
  console.log(`[whatsapp-client] Fetching group members: groupId=${groupId}`);
  
  const response = await fetchZApi(
    id,
    token,
    `/group-members?groupId=${groupId}`,
    "GET",
    null,
    getZApiHeaders()
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Z-API group-members error (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  // Z-API returns a list of members. Format is: [{ phone: "...", name: "...", isAdmin: false }]
  return data;
}

// Fetch instance status
export async function getInstanceStatus(instance: any, triggerN8n: boolean = true): Promise<any> {
  const { external_instance_id: id, external_instance_token: token } = instance;
  
  const response = await fetchZApi(
    id,
    token,
    "/status",
    "GET",
    null,
    getZApiHeaders(),
    undefined,
    triggerN8n
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Z-API status error (${response.status}): ${errorText}`);
  }
  
  const data = await response.json();
  const item = Array.isArray(data) ? data[0] : data;

  // Check for Z-API format
  if (item?.instance) {
    return {
      connected: item.instance.connected === true || String(item.instance.connected).toLowerCase() === "true",
      paymentStatus: "ACTIVE",
      due: null,
      returnedId: item.instance.id,
      returnedToken: item.instance.token,
      phone: item.instance.connectedPhone || null
    };
  }

  // Check for WAHA format
  const statusStr = String(item?.status || "").toUpperCase();
  const isConnected = statusStr === "WORKING" || statusStr === "CONNECTED" || statusStr === "CONNECTED_TO_WHATSAPP" || item?.connected === true;
  
  let phone = null;
  if (item?.me?.id) {
    phone = item.me.id.split("@")[0];
  } else if (item?.me?.phone) {
    phone = item.me.phone;
  }

  return {
    connected: isConnected,
    paymentStatus: "ACTIVE",
    due: null,
    returnedId: item?.name || id,
    returnedToken: token,
    phone: phone
  };
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
      const response = await fetchZApi(
        id,
        token,
        ep,
        "PUT",
        { value: webhookUrl },
        getZApiHeaders(),
        undefined,
        false // triggerN8n = false
      );
      if (!response.ok) {
        const txt = await response.text();
        console.error(`[whatsapp-client] Failed to register webhook ${ep}:`, txt);
      }
    } catch (err: any) {
      console.error(`[whatsapp-client] Network error registering webhook ${ep}:`, err.message);
    }
  }
}

