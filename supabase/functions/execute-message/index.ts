import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppMessage } from "../_shared/whatsapp-client.ts";
import { logNodeExecution } from "../_shared/workflow-execution-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cleanPhone = (phone?: any) => (phone ? String(phone).replace(/\D/g, "") : "");
const cleanCpf = (cpf?: string) => (cpf ? String(cpf).replace(/\D/g, "") : "");

const syncSentMessageToChat = async (
  supabase: any,
  params: {
    chatMessageId?: string | null;
    conversationId?: string | null;
    companyId?: string;
    instanceId?: string;
    phone?: string;
    name?: string;
    leadId?: string | null;
    body?: string;
    mediaUrl?: string | null;
    messageType?: string | null;
    mediaType?: string | null;
    externalMessageId?: string | null;
    isGroup?: boolean;
    groupJid?: string;
    status?: string;
    errorMessage?: string | null;
  }
): Promise<{ conversationId?: string; messageId?: string } | null> => {
  // If updating an already created pending/sending message
  if (params.chatMessageId) {
    try {
      const updates: Record<string, any> = {
        status: params.status || "sent",
        updated_at: new Date().toISOString(),
      };
      if (params.externalMessageId !== undefined) updates.message_id = params.externalMessageId;
      if (params.errorMessage !== undefined) updates.error_message = params.errorMessage;

      await supabase
        .from("chat_messages")
        .update(updates)
        .eq("id", params.chatMessageId);

      const convId = params.conversationId;
      if (convId) {
        const effectiveMsgType = params.messageType || (params.mediaUrl ? "image" : "text");
        const basePreview = params.body || (params.mediaUrl ? `[${effectiveMsgType === 'image' ? 'Imagem' : effectiveMsgType}]` : '[Mensagem]');
        const previewText = params.status === "failed" ? `⚠️ [Falha] ${basePreview}` : basePreview;

        await supabase
          .from("chat_conversations")
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: previewText,
            updated_at: new Date().toISOString(),
          })
          .eq("id", convId);
      }
      return { conversationId: convId || undefined, messageId: params.chatMessageId };
    } catch (e) {
      console.error("[ExecuteMessage] Failed to update chat message:", e);
      return null;
    }
  }

  if (!params.phone || !params.companyId || (!params.body && !params.mediaUrl)) return null;
  const rawPhone = String(params.phone).trim();
  const cleanPhone = rawPhone.replace(/\D/g, "");
  if (!cleanPhone && !params.groupJid) return null;

  const isGroup = Boolean(
    params.isGroup ||
    rawPhone.includes("@g.us") ||
    rawPhone.includes("-group") ||
    params.groupJid?.includes("@g.us") ||
    params.groupJid?.includes("-group") ||
    cleanPhone.length > 15 ||
    cleanPhone.startsWith("1203")
  );

  try {
    let convId: string | null = null;
    // Se for grupo, NUNCA vincula a leadId! Impede que mensagens de grupos poluam o chat privado do lead
    let targetLeadId: string | null = isGroup ? null : (params.leadId || null);
    const suffix = cleanPhone.slice(-8);

    // Se NÃO for grupo e leadId não foi fornecido, busca lead existente no banco pelo telefone ou sufixo
    if (!isGroup && !targetLeadId) {
      let leadQ = supabase.from("leads").select("id").limit(1);
      if (suffix.length >= 8) {
        leadQ = leadQ.or(`phone.eq.${cleanPhone},phone.ilike.%${suffix}`);
      } else {
        leadQ = leadQ.eq("phone", cleanPhone);
      }
      if (params.companyId) {
        leadQ = leadQ.or(`company_id.eq.${params.companyId},company_id.is.null`);
      }
      const { data: foundLeads } = await leadQ;
      if (foundLeads?.[0]?.id) {
        targetLeadId = foundLeads[0].id;
      }
    }

    // Busca conversa existente estritamente NA MESMA instância
    let convQ = supabase
      .from("chat_conversations")
      .select("id, lead_id, instance_id, contact_name, contact_phone")
      .eq("company_id", params.companyId);

    if (params.instanceId) {
      convQ = convQ.eq("instance_id", params.instanceId);
    } else {
      convQ = convQ.is("instance_id", null);
    }

    if (isGroup) {
      // Para grupos: busca a conversa do grupo pelo JID, telefone ou lead_id existente
      const resolvedGroupJid = params.groupJid || (rawPhone.includes("@g.us") ? rawPhone : `${cleanPhone}@g.us`);
      const groupNum = cleanPhone;

      if (targetLeadId) {
        convQ = convQ.or(`lead_id.eq.${targetLeadId},contact_phone.eq.${resolvedGroupJid},contact_phone.eq.${groupNum},contact_name.eq.${resolvedGroupJid},contact_name.eq.${groupNum}`);
      } else {
        convQ = convQ.or(`contact_phone.eq.${resolvedGroupJid},contact_phone.eq.${groupNum},contact_name.eq.${resolvedGroupJid},contact_name.eq.${groupNum}`);
      }
    } else {
      // Para mensagens individuais: busca pela conversa do lead ou telefone
      if (targetLeadId && suffix.length >= 8) {
        convQ = convQ.or(`lead_id.eq.${targetLeadId},contact_phone.eq.${cleanPhone},contact_phone.ilike.%${suffix}`);
      } else if (targetLeadId) {
        convQ = convQ.or(`lead_id.eq.${targetLeadId},contact_phone.eq.${cleanPhone}`);
      } else if (suffix.length >= 8) {
        convQ = convQ.or(`contact_phone.eq.${cleanPhone},contact_phone.ilike.%${suffix}`);
      } else {
        convQ = convQ.eq("contact_phone", cleanPhone);
      }
    }

    const { data: existingConvs } = await convQ.order("created_at", { ascending: false }).limit(1);
    const existingConv = existingConvs?.[0];

    if (existingConv) {
      convId = existingConv.id;
      const updates: Record<string, any> = {};
      if (!existingConv.lead_id && targetLeadId) updates.lead_id = targetLeadId;
      if (!existingConv.instance_id && params.instanceId) updates.instance_id = params.instanceId;
      if (Object.keys(updates).length > 0) {
        await supabase.from("chat_conversations").update(updates).eq("id", convId);
      }
    }

    const effectiveMsgType = params.messageType || (params.mediaUrl ? "image" : "text");
    const effectiveMediaType = params.mediaType || (params.mediaUrl ? (params.messageType || "image") : null);
    const basePreview = params.body || (params.mediaUrl ? `[${effectiveMsgType === 'image' ? 'Imagem' : effectiveMsgType}]` : '[Mensagem]');
    const effectiveStatus = params.status || "sending";
    const previewText = effectiveStatus === "failed" ? `⚠️ [Falha] ${basePreview}` : basePreview;

    if (!convId) {
      const resolvedContactPhone = isGroup 
        ? (params.groupJid || (rawPhone.includes("@g.us") ? rawPhone : `${cleanPhone}@g.us`))
        : cleanPhone;
      const resolvedContactName = params.name || resolvedContactPhone;

      const { data: newConv } = await supabase
        .from("chat_conversations")
        .insert({
          company_id: params.companyId,
          instance_id: params.instanceId || null,
          lead_id: targetLeadId || null,
          contact_phone: resolvedContactPhone,
          contact_name: resolvedContactName,
          status: "open",
          last_message_at: new Date().toISOString(),
          last_message_preview: previewText,
        })
        .select("id")
        .single();
      if (newConv) convId = newConv.id;
    }

    if (convId) {
      const { data: newMsg, error: insertErr } = await supabase
        .from("chat_messages")
        .insert({
          company_id: params.companyId,
          conversation_id: convId,
          sender_type: "operator",
          message_type: effectiveMsgType,
          body: params.body || "",
          media_url: params.mediaUrl || null,
          media_type: effectiveMediaType,
          status: effectiveStatus,
          error_message: params.errorMessage || null,
          message_id: params.externalMessageId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("[ExecuteMessage] Failed to insert into chat_messages:", insertErr);
      }

      await supabase
        .from("chat_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: previewText,
          updated_at: new Date().toISOString(),
        })
        .eq("id", convId);

      console.log(`[ExecuteMessage] Synced ${effectiveStatus} message (${effectiveMsgType}, isGroup=${isGroup}) to chat conversation ${convId}`);
      return { conversationId: convId, messageId: newMsg?.id };
    }
    return null;
  } catch (err) {
    console.error("[ExecuteMessage] Failed to sync message to chat_messages:", err);
    return null;
  }
};



// Max delay per node (20 seconds to stay safe under timeout)
const MAX_DELAY_MS = 20000;

// ============= Types =============

interface ExecuteMessageRequest {
  messageId?: string;
  campaignId: string;
  groupIds?: string[];
  sequenceId?: string | null;
  triggerContext?: TriggerContext;
  // For resumed executions
  executionId?: string;
  startFromNodeIndex?: number;
  startFromNodeId?: string;
  // For manual single-node execution
  manualNodeIndex?: number;
  manualNodeOverride?: {
    type: string;
    config: Record<string, unknown>;
  };
  // For private targeting (bulk execution from members tab)
  targetPhones?: string[];
}

interface TriggerContext {
  respondentPhone: string;
  respondentName: string;
  respondentJid: string;
  groupJid: string;
  pollOptionText?: string;
  sendPrivate: boolean;
  customFields?: Record<string, string>;
  triggerId?: string;
  instanceId?: string;
  instanceIds?: string[];
  webhookPayload?: any;
}

interface GroupMessage {
  id: string;
  user_id: string;
  group_campaign_id: string;
  content: string;
  active: boolean;
  sequence_id: string | null;
  media_url: string | null;
  media_type: string | null;
  media_caption: string | null;
  mention_member: boolean;
  send_private: boolean;
  delay_seconds: number;
}

interface SequenceNode {
  id: string;
  node_type: string;
  node_order: number;
  config: Record<string, unknown>;
}

interface SequenceConnection {
  id: string;
  source_node_id: string;
  target_node_id: string;
  condition_path: string | null;
  source_port_id?: string;
}

interface LinkedGroup {
  id: string;
  group_jid: string;
  group_name: string;
}

interface InstanceData {
  id: string;
  name: string;
  phone: string;
  provider: string;
  external_instance_id: string;
  external_instance_token: string;
  status: string;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  instance_id: string;
  user_id: string;
  instances: InstanceData;
  company_id?: string;
}

interface DestinationData {
  group_jid: string;
  group_name: string;
  isPrivate?: boolean;
}

// ============= Standardized Payload =============

interface StandardizedPayload {
  action: string;
  node: {
    id: string;
    type: string;
    order: number;
    config: Record<string, unknown>;
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

function buildStandardPayload(params: {
  action: string;
  node: { id: string; type: string; order: number; config: Record<string, unknown> };
  campaign: { id: string; name: string };
  instance: { id: string; name: string; phone: string; provider: string; externalId: string; externalToken: string };
  destination: { jid: string; name: string };
}): StandardizedPayload {
  return {
    action: params.action,
    node: {
      id: params.node.id,
      type: params.node.type,
      order: params.node.order,
      config: params.node.config,
    },
    campaign: {
      id: params.campaign.id,
      name: params.campaign.name,
    },
    instance: {
      id: params.instance.id,
      name: params.instance.name,
      phone: params.instance.phone,
      provider: params.instance.provider,
      externalId: params.instance.externalId,
      externalToken: params.instance.externalToken,
    },
    destination: {
      phone: params.destination.jid,
      jid: params.destination.jid,
      name: params.destination.name,
    },
  };
}

function getValueFromPath(obj: any, path: string): string {
  if (!obj || !path) return "";
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return "";
    }
  }
  if (current === undefined || current === null) return "";
  if (typeof current === "object") return JSON.stringify(current);
  return String(current);
}

// ============= Formatting helpers =============

const formatLineBreaks = (text: string | null | undefined): string | null => {
  if (!text) return null;
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
};

const formatNodeConfig = (
  config: Record<string, unknown>,
  nodeType: string
): Record<string, unknown> => {
  const formatted = { ...config };

  const textFields = ["text", "content", "message", "caption", "title", "description", "footer"];

  textFields.forEach((field) => {
    if (typeof formatted[field] === "string") {
      formatted[field] = formatLineBreaks(formatted[field] as string);
    }
  });

  // For list nodes, process sections
  if (nodeType === "list" && Array.isArray(formatted.sections)) {
    formatted.sections = (formatted.sections as Array<Record<string, unknown>>).map((section) => ({
      ...section,
      title: typeof section.title === "string" ? formatLineBreaks(section.title as string) : section.title,
      rows: Array.isArray(section.rows)
        ? (section.rows as Array<Record<string, unknown>>).map((row) => ({
            ...row,
            title: typeof row.title === "string" ? formatLineBreaks(row.title as string) : row.title,
            description: typeof row.description === "string" ? formatLineBreaks(row.description as string) : row.description,
          }))
        : section.rows,
    }));
  }

  // For button nodes, process labels
  if (nodeType === "buttons" && Array.isArray(formatted.buttons)) {
    formatted.buttons = (formatted.buttons as Array<Record<string, unknown>>).map((btn) => ({
      ...btn,
      label: typeof btn.label === "string" ? formatLineBreaks(btn.label as string) : btn.label,
    }));
  }

  return formatted;
};

const toDelayMs = (value: number, unit: string): number => {
  switch (unit) {
    case "seconds": return value * 1000;
    case "minutes": return value * 60000;
    case "hours": return value * 3600000;
    case "days": return value * 86400000;
    default: return 0;
  }
};

const fromDelayMs = (delayMs: number): { value: number; unit: string } => {
  if (delayMs <= 0) return { value: 0, unit: "seconds" };
  const msInDay = 24 * 60 * 60 * 1000;
  const msInHour = 60 * 60 * 1000;
  const msInMinute = 60 * 1000;
  const msInSecond = 1000;

  if (delayMs % msInDay === 0) return { value: delayMs / msInDay, unit: "days" };
  if (delayMs % msInHour === 0) return { value: delayMs / msInHour, unit: "hours" };
  if (delayMs % msInMinute === 0) return { value: delayMs / msInMinute, unit: "minutes" };
  const secondsValue = Math.floor(delayMs / msInSecond);
  if (secondsValue * msInSecond === delayMs) return { value: secondsValue, unit: "seconds" };
  return { value: Number((delayMs / 1000).toFixed(1)), unit: "seconds" };
};

const normalizeDelayConfig = (config: Record<string, any>): {
  delayMs: number;
  value: number;
  unit: string;
} => {
  if (!config) {
    return { delayMs: 300000, value: 5, unit: "minutes" };
  }
  if (typeof config.value === "number" && config.unit) {
    const unit = config.unit;
    const value = config.value;
    const delayMs = typeof config.delayMs === "number" ? config.delayMs : toDelayMs(value, unit);
    return { delayMs, value, unit };
  }
  if (typeof config.delayMs === "number") {
    const { value, unit } = fromDelayMs(config.delayMs);
    return { delayMs: config.delayMs, value, unit };
  }
  if (
    typeof config.seconds === "number" ||
    typeof config.minutes === "number" ||
    typeof config.hours === "number" ||
    typeof config.days === "number"
  ) {
    const seconds = config.seconds || 0;
    const minutes = config.minutes || 0;
    const hours = config.hours || 0;
    const days = config.days || 0;
    const totalMs = 
      seconds * 1000 + 
      minutes * 60 * 1000 + 
      hours * 60 * 60 * 1000 + 
      days * 24 * 60 * 60 * 1000;
    const { value, unit } = fromDelayMs(totalMs);
    return { delayMs: totalMs, value, unit };
  }
  return { delayMs: 300000, value: 5, unit: "minutes" };
};

const calculateDelayMs = (config: Record<string, unknown>): number => {
  return normalizeDelayConfig(config).delayMs;
};

const getConditionFieldValue = (field: string, leadData: Record<string, any>): unknown => {
  if (field === "name" || field === "phone" || field === "email" || field === "pipeline_stage_id") {
    return leadData[field];
  }
  if (field === "tags") {
    return leadData.tags || [];
  }
  const customFields = (leadData.custom_fields as Record<string, unknown>) || {};
  return customFields[field];
};

const evaluateCondition = (config: Record<string, unknown>, leadData: Record<string, any>): boolean => {
  const field = (config.field as string) || "name";
  const operator = (config.operator as string) || "equals";
  const fieldValue = getConditionFieldValue(field, leadData);

  if (operator === "is_set") {
    if (Array.isArray(fieldValue)) return fieldValue.length > 0;
    return fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== "";
  }
  if (operator === "is_empty") {
    if (Array.isArray(fieldValue)) return fieldValue.length === 0;
    return fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === "";
  }

  if (Array.isArray(fieldValue)) {
    const compareValue = String(config.value ?? "").trim().toLowerCase();
    const values = fieldValue.map(v => String(v).trim().toLowerCase());
    if (operator === "not_contains") return !values.includes(compareValue);
    return values.includes(compareValue); // "contains" and "equals" both mean membership for array fields (e.g. tags)
  }

  const rawValue = fieldValue === null || fieldValue === undefined ? "" : String(fieldValue);
  const compareValue = String(config.value ?? "");

  switch (operator) {
    case "equals":
      return rawValue.trim().toLowerCase() === compareValue.trim().toLowerCase();
    case "not_equals":
      return rawValue.trim().toLowerCase() !== compareValue.trim().toLowerCase();
    case "contains":
      return rawValue.toLowerCase().includes(compareValue.toLowerCase());
    case "not_contains":
      return !rawValue.toLowerCase().includes(compareValue.toLowerCase());
    case "starts_with":
      return rawValue.toLowerCase().startsWith(compareValue.toLowerCase());
    case "ends_with":
      return rawValue.toLowerCase().endsWith(compareValue.toLowerCase());
    case "greater_than": {
      const num = parseFloat(rawValue);
      const cmp = parseFloat(compareValue);
      return !isNaN(num) && !isNaN(cmp) && num > cmp;
    }
    case "less_than": {
      const num = parseFloat(rawValue);
      const cmp = parseFloat(compareValue);
      return !isNaN(num) && !isNaN(cmp) && num < cmp;
    }
    case "between": {
      const num = parseFloat(rawValue);
      const min = parseFloat(String(config.minValue ?? ""));
      const max = parseFloat(String(config.maxValue ?? ""));
      return !isNaN(num) && !isNaN(min) && !isNaN(max) && num >= min && num <= max;
    }
    default:
      return false;
  }
};

const evaluateExtensibleCondition = async (
  config: Record<string, unknown>,
  leadData: Record<string, any> | null,
  supabase: any,
  companyId: string,
  triggerContext?: any
): Promise<{ matched: boolean; branch: string }> => {
  const conditionType = config.conditionType as string | undefined;
  const params = (config.parameters as Record<string, unknown>) || {};

  if (!conditionType) {
    const isTrue = leadData ? evaluateCondition(config, leadData) : false;
    return { matched: isTrue, branch: isTrue ? "yes" : "no" };
  }

  const cleanPhone = (phone?: string) => (phone || "").replace(/\D/g, "");
  const cleanCpf = (cpf?: string) => (cpf || "").replace(/\D/g, "");

  switch (conditionType) {
    case "lead_exists": {
      const identifierField = (params.identifierField as string) || "phone";
      let isFound = false;

      const rawPhone = (params.phone as string) || leadData?.phone || triggerContext?.respondentPhone || triggerContext?.contactPhone || triggerContext?.phone || "";
      const phoneToSearch = cleanPhone(rawPhone);

      console.log(`[ExecuteMessage DEBUG lead_exists] identifierField=${identifierField}, leadDataId=${leadData?.id}, rawPhone=${rawPhone}, phoneToSearch=${phoneToSearch}, companyId=${companyId}`);

      if (leadData?.id) {
        isFound = true;
      } else if (phoneToSearch && (identifierField === "phone" || !identifierField)) {
        let query = supabase.from("leads").select("*").limit(1);
        const suffix = phoneToSearch.slice(-8);
        if (suffix.length >= 8) {
          query = query.or(`phone.eq.${phoneToSearch},phone.ilike.%${suffix}`);
        } else {
          query = query.eq("phone", phoneToSearch);
        }
        if (companyId) {
          query = query.or(`company_id.eq.${companyId},company_id.is.null`);
        }
        const { data: dbLeads } = await query;
        if (dbLeads && dbLeads.length > 0) {
          isFound = true;
          if (!leadData) leadData = dbLeads[0];
        }
      } else if (identifierField === "email") {
        const targetEmail = (params.email as string) || leadData?.email;
        if (targetEmail) {
          let query = supabase.from("leads").select("*").eq("email", targetEmail).limit(1);
          if (companyId) query = query.or(`company_id.eq.${companyId},company_id.is.null`);
          const { data: dbLeads } = await query;
          isFound = !!(dbLeads && dbLeads.length > 0);
        }
      } else if (identifierField === "cpf") {
        const targetCpf = cleanCpf((params.cpf as string) || leadData?.cpf || leadData?.document);
        if (targetCpf) {
          let query = supabase.from("leads").select("*").eq("document", targetCpf).limit(1);
          if (companyId) query = query.or(`company_id.eq.${companyId},company_id.is.null`);
          const { data: dbLeads } = await query;
          isFound = !!(dbLeads && dbLeads.length > 0);
        }
      }

      return { matched: isFound, branch: isFound ? "found" : "not_found" };
    }

    case "lead_has_pipeline_deal": {
      const pipelineId = params.pipelineId as string;
      const pipelineIds = (Array.isArray(params.pipelineIds) && params.pipelineIds.length > 0)
        ? (params.pipelineIds as string[])
        : (pipelineId ? [pipelineId] : []);
      let targetLeadId = leadData?.id || triggerContext?.leadId || null;

      if (!targetLeadId) {
        const rawPhone = (params.phone as string) || triggerContext?.respondentPhone || triggerContext?.contactPhone || triggerContext?.phone || "";
        const phoneToSearch = cleanPhone(rawPhone);
        if (phoneToSearch) {
          const { data: dbLead } = await supabase
            .from("leads")
            .select("id")
            .eq("company_id", companyId)
            .eq("phone", phoneToSearch)
            .maybeSingle();

          if (dbLead) {
            targetLeadId = dbLead.id;
          } else {
            const suffix = phoneToSearch.slice(-8);
            if (suffix.length >= 8) {
              const { data: flexLeads } = await supabase
                .from("leads")
                .select("id")
                .eq("company_id", companyId)
                .ilike("phone", `%${suffix}`)
                .limit(1);
              if (flexLeads && flexLeads.length > 0) {
                targetLeadId = flexLeads[0].id;
              }
            }
          }
        }
      }

      console.log(`[ExecuteMessage DEBUG lead_has_pipeline_deal] pipelineIds=${pipelineIds.join(",")}, targetLeadId=${targetLeadId}, companyId=${companyId}`);

      if (pipelineIds.length === 0 || !targetLeadId) {
        return { matched: false, branch: "no" };
      }

      let dealsQuery = supabase
        .from("deals")
        .select("id, pipeline_id")
        .eq("company_id", companyId)
        .eq("lead_id", targetLeadId)
        .eq("status", "open");

      if (pipelineIds.length === 1) {
        dealsQuery = dealsQuery.eq("pipeline_id", pipelineIds[0]);
      } else {
        dealsQuery = dealsQuery.in("pipeline_id", pipelineIds);
      }

      const { data: deals } = await dealsQuery.limit(1);

      const hasDeal = Array.isArray(deals) && deals.length > 0;
      console.log(`[ExecuteMessage DEBUG lead_has_pipeline_deal RESULT] hasDeal=${hasDeal}`);
      return { matched: hasDeal, branch: hasDeal ? "yes" : "no" };
    }

    case "lead_has_stage_deal": {
      const pipelineId = params.pipelineId as string;
      const stageId = params.stageId as string;
      let targetLeadId = leadData?.id || triggerContext?.leadId || null;

      if (!targetLeadId) {
        const rawPhone = (params.phone as string) || triggerContext?.respondentPhone || triggerContext?.contactPhone || triggerContext?.phone || "";
        const phoneToSearch = cleanPhone(rawPhone);
        if (phoneToSearch) {
          const { data: dbLead } = await supabase
            .from("leads")
            .select("id")
            .eq("company_id", companyId)
            .eq("phone", phoneToSearch)
            .maybeSingle();

          if (dbLead) {
            targetLeadId = dbLead.id;
          } else {
            const suffix = phoneToSearch.slice(-8);
            if (suffix.length >= 8) {
              const { data: flexLeads } = await supabase
                .from("leads")
                .select("id")
                .eq("company_id", companyId)
                .ilike("phone", `%${suffix}`)
                .limit(1);
              if (flexLeads && flexLeads.length > 0) {
                targetLeadId = flexLeads[0].id;
              }
            }
          }
        }
      }

      if (!pipelineId || !stageId || !targetLeadId) {
        return { matched: false, branch: "no" };
      }

      const { data: deals } = await supabase
        .from("deals")
        .select("id")
        .eq("company_id", companyId)
        .eq("lead_id", targetLeadId)
        .eq("pipeline_id", pipelineId)
        .eq("stage_id", stageId)
        .limit(1);

      const hasDeal = Array.isArray(deals) && deals.length > 0;
      return { matched: hasDeal, branch: hasDeal ? "yes" : "no" };
    }

    case "lead_has_email": {
      const hasEmail = !!(leadData?.email && String(leadData.email).trim() !== "");
      return { matched: hasEmail, branch: hasEmail ? "yes" : "no" };
    }

    case "lead_has_name": {
      const hasName = !!(leadData?.name && String(leadData.name).trim() !== "");
      return { matched: hasName, branch: hasName ? "yes" : "no" };
    }

    case "lead_has_phone": {
      const phoneNorm = cleanPhone(leadData?.phone);
      const hasPhone = phoneNorm.length >= 8;
      return { matched: hasPhone, branch: hasPhone ? "yes" : "no" };
    }

    case "lead_has_cpf": {
      const cpfRaw = leadData?.cpf || leadData?.custom_fields?.cpf;
      const cpfNorm = cleanCpf(cpfRaw);
      const hasCpf = cpfNorm.length >= 11;
      return { matched: hasCpf, branch: hasCpf ? "yes" : "no" };
    }

    case "lead_has_tag": {
      const targetTags = (params.tags as string[]) || [];
      const matchMode = (params.matchMode as string) || "ANY";
      const leadTags: string[] = (leadData?.tags as string[]) || [];

      let isMatched = false;
      if (targetTags.length === 0) {
        isMatched = false;
      } else if (matchMode === "ANY") {
        isMatched = targetTags.some((t) => leadTags.includes(t));
      } else if (matchMode === "ALL") {
        isMatched = targetTags.every((t) => leadTags.includes(t));
      } else if (matchMode === "NONE") {
        isMatched = !targetTags.some((t) => leadTags.includes(t));
      }

      return { matched: isMatched, branch: isMatched ? "matched" : "not_matched" };
    }

    case "lead_has_assignee": {
      const assigneeMode = (params.assigneeMode as string) || "ANY";
      const assigneeId = params.assigneeId as string;
      const leadOwner = leadData?.crm_owner_id || leadData?.assigned_user_id || leadData?.attendant_id;

      let isMatched = false;
      if (assigneeMode === "ANY") {
        isMatched = !!leadOwner;
      } else if (assigneeMode === "NONE") {
        isMatched = !leadOwner;
      } else if (assigneeMode === "SPECIFIC") {
        isMatched = !!(assigneeId && leadOwner === assigneeId);
      }

      return { matched: isMatched, branch: isMatched ? "yes" : "no" };
    }

    case "lead_custom_field": {
      const fieldKey = params.fieldKey as string;
      const operator = (params.operator as string) || "equals";
      const paramVal = params.value;

      if (!fieldKey || !leadData) {
        return { matched: false, branch: "not_matched" };
      }

      const customFields = (leadData.custom_fields as Record<string, unknown>) || {};
      const fieldValue = customFields[fieldKey] ?? leadData[fieldKey];

      let isMatched = false;
      const strVal = fieldValue === null || fieldValue === undefined ? "" : String(fieldValue);
      const strCmp = paramVal === null || paramVal === undefined ? "" : String(paramVal);

      switch (operator) {
        case "equals":
          isMatched = strVal.trim().toLowerCase() === strCmp.trim().toLowerCase();
          break;
        case "not_equals":
          isMatched = strVal.trim().toLowerCase() !== strCmp.trim().toLowerCase();
          break;
        case "contains":
          isMatched = strVal.toLowerCase().includes(strCmp.toLowerCase());
          break;
        case "not_contains":
          isMatched = !strVal.toLowerCase().includes(strCmp.toLowerCase());
          break;
        case "starts_with":
          isMatched = strVal.toLowerCase().startsWith(strCmp.toLowerCase());
          break;
        case "ends_with":
          isMatched = strVal.toLowerCase().endsWith(strCmp.toLowerCase());
          break;
        case "is_empty":
          isMatched = strVal.trim() === "";
          break;
        case "is_set":
          isMatched = strVal.trim() !== "";
          break;
        case "greater_than":
        case ">":
          isMatched = parseFloat(strVal) > parseFloat(strCmp);
          break;
        case "less_than":
        case "<":
          isMatched = parseFloat(strVal) < parseFloat(strCmp);
          break;
        case "greater_or_equals":
        case "≥":
          isMatched = parseFloat(strVal) >= parseFloat(strCmp);
          break;
        case "less_or_equals":
        case "≤":
          isMatched = parseFloat(strVal) <= parseFloat(strCmp);
          break;
        case "is_true":
          isMatched = strVal.toLowerCase() === "true" || strVal === "1";
          break;
        case "is_false":
          isMatched = strVal.toLowerCase() === "false" || strVal === "0" || strVal === "";
          break;
        case "before":
          isMatched = new Date(strVal).getTime() < new Date(strCmp).getTime();
          break;
        case "after":
          isMatched = new Date(strVal).getTime() > new Date(strCmp).getTime();
          break;
        default:
          isMatched = strVal.trim().toLowerCase() === strCmp.trim().toLowerCase();
      }

      return { matched: isMatched, branch: isMatched ? "matched" : "not_matched" };
    }

    default: {
      const isTrue = leadData ? evaluateCondition(config, leadData) : false;
      return { matched: isTrue, branch: isTrue ? "yes" : "no" };
    }
  }
};

const getActionForNodeType = (nodeType: string): string => {
  const actionMap: Record<string, string> = {
    message: "message.send_text",
    text: "message.send_text",
    user_input: "message.send_text",
    question: "message.send_text",
    pergunta: "message.send_text",
    interactive: "message.send_text",
    quiz: "message.send_text",
    image: "message.send_image",
    video: "message.send_video",
    ptv: "message.send_ptv",
    audio: "message.send_audio",
    document: "message.send_document",
    sticker: "message.send_sticker",
    location: "message.send_location",
    contact: "message.send_contact",
    buttons: "message.send_buttons",
    list: "message.send_list",
    poll: "message.send_poll",
    reaction: "message.send_reaction",
    media: "message.send_media",
    status: "status.post",
    status_image: "status.send_image",
    status_video: "status.send_video",
    group_create: "group.create",
    group_rename: "group.update_name",
    group_photo: "group.update_photo",
    group_description: "group.update_description",
    group_add_participant: "group.add_participant",
    group_remove_participant: "group.remove_participant",
    group_promote_admin: "group.promote_admin",
    group_remove_admin: "group.demote_admin",
    group_settings: "group.update_settings",
    webhook_forward: "webhook.forward",
  };
  return actionMap[nodeType] || `message.send_${nodeType}`;
};

const GROUP_MANAGEMENT_NODE_TYPES = [
  "group_create", "group_rename", "group_photo", "group_description",
  "group_add_participant", "group_remove_participant",
  "group_promote_admin", "group_remove_admin", "group_settings",
];

async function waitForMessageDelivery(supabase: any, messageId: string | null, zaapId: string | null, timeoutMs = 2500) {
  if (!messageId && !zaapId) return false;
  const start = Date.now();
  console.log(`[ExecuteMessage] Waiting for delivery ack for messageId: ${messageId}, zaapId: ${zaapId}`);
  
  while (Date.now() - start < timeoutMs) {
    const filters = [];
    if (messageId) filters.push(`message_id.eq.${messageId}`);
    if (zaapId) filters.push(`message_id.eq.${zaapId}`);
    
    if (filters.length === 0) break;

    const { data, error } = await supabase
      .from("webhook_events")
      .select("event_type, raw_event")
      .or(filters.join(","));

    if (!error && data && data.length > 0) {
      for (const event of data) {
        const body = event.raw_event?.body;
        const status = body?.status;
        const eventType = event.event_type;
        
        if (
          status === "SENT" ||
          status === "DELIVERED" ||
          status === "READ" ||
          ["message_status", "message_received", "message_delivered", "message_read", "played", "read_by_me"].includes(eventType)
        ) {
          console.log(`[ExecuteMessage] Delivery ack received for ${messageId || zaapId}: status=${status}, event_type=${eventType} after ${Date.now() - start}ms`);
          return true;
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  
  console.log(`[ExecuteMessage] Timeout waiting for delivery ack for ${messageId || zaapId}. Continuing.`);
  return false;
}

// Helper to auto-dispatch workflows listening to pipeline_changed or deal_moved
async function dispatchDealWorkflows(
  supabase: any,
  supabaseUrl: string,
  supabaseKey: string,
  params: {
    dealId: string;
    pipelineId: string;
    stageId: string;
    leadId?: string | null;
    leadName?: string | null;
    leadPhone?: string | null;
    companyId?: string | null;
  }
) {
  try {
    const { dealId, pipelineId, stageId } = params;
    if (!dealId || !pipelineId) return;

    let targetLeadId = params.leadId;
    let targetLeadName = params.leadName;
    let targetLeadPhone = params.leadPhone;

    if (!targetLeadPhone) {
      if (!targetLeadId) {
        const { data: dData } = await supabase.from('deals').select('lead_id, company_id').eq('id', dealId).single();
        targetLeadId = dData?.lead_id;
      }
      if (targetLeadId) {
        const { data: lData } = await supabase.from('leads').select('name, phone, company_id').eq('id', targetLeadId).single();
        targetLeadName = lData?.name;
        targetLeadPhone = lData?.phone;
      }
    }

    if (!targetLeadPhone) {
      console.warn(`[ExecuteMessage] dispatchDealWorkflows: No phone found for deal ${dealId}`);
      return;
    }

    const { data: sequences } = await supabase
      .from('message_sequences')
      .select('id, name, trigger_config, company_id, trigger_type, sequence_nodes(node_type, config)')
      .eq('active', true);

    if (!sequences || sequences.length === 0) return;

    for (const seq of sequences) {
      const rootCfg = (seq.trigger_config as Record<string, any>) || {};
      const triggerNodes = seq.sequence_nodes?.filter((n: any) => n.node_type === 'trigger') || [];

      let allTriggers: any[] = rootCfg.triggers || [];
      for (const node of triggerNodes) {
        if (node.config?.triggers) {
          allTriggers = [...allTriggers, ...node.config.triggers];
        }
      }

      let matchingTriggerId: string | undefined = undefined;

      const hasMatchingTrigger = allTriggers.some((t: any) => {
        const matches = (t.type === 'pipeline_changed' || t.type === 'deal_moved') &&
          t.config?.pipelineId === pipelineId &&
          (!t.config?.stageId || t.config?.stageId === 'any' || t.config?.stageId === stageId);
        if (matches) matchingTriggerId = t.id;
        return matches;
      });

      const legacyMatch = !allTriggers.length &&
        (rootCfg.triggerType === 'pipeline_changed' || rootCfg.triggerType === 'deal_moved' || seq.trigger_type === 'pipeline_changed' || seq.trigger_type === 'deal_moved') &&
        rootCfg.pipelineId === pipelineId &&
        (!rootCfg.stageId || rootCfg.stageId === 'any' || rootCfg.stageId === stageId);

      if (hasMatchingTrigger || legacyMatch) {
        console.log(`[ExecuteMessage] 🚀 Auto-dispatching sequence "${seq.name}" (${seq.id}) triggerId=${matchingTriggerId} for deal ${dealId} -> stage ${stageId}`);
        fetch(`${supabaseUrl}/functions/v1/trigger-sequence`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            sequenceId: seq.id,
            triggerId: matchingTriggerId,
            source: "pipeline_changed",
            name: targetLeadName || targetLeadPhone,
            phone: targetLeadPhone,
            companyId: seq.company_id || params.companyId,
            triggerContext: {
              source: "pipeline_changed",
              dealId: dealId,
              pipelineId: pipelineId,
              stageId: stageId,
            }
          })
        }).catch(err => console.error("[ExecuteMessage] Error invoking downstream trigger-sequence:", err));
      }
    }
  } catch (e) {
    console.error("[ExecuteMessage] Error in dispatchDealWorkflows:", e);
  }
}

// ============= Main handler =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let globalWorkflowExecutionId: string | undefined;
  let supabaseGlobal: any;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    supabaseGlobal = supabase;

    // Parse request body
    const body: ExecuteMessageRequest = await req.json();
    const { messageId, campaignId, sequenceId, triggerContext, executionId, startFromNodeIndex, startFromNodeId, manualNodeIndex, targetPhones } = body;
    let effectiveCampaignId = campaignId;

    if (triggerContext?.resumedFromUserInput) {
      console.log(`[ExecuteMessage] 🔄 Resumed workflow execution from user input answer. Consuming resumedFromUserInput flag so subsequent input nodes pause correctly.`);
      triggerContext.resumedFromUserInput = false;
    }

    // Check if this is a resumed execution
    const isResumedExecution = !!executionId && (startFromNodeIndex !== undefined || startFromNodeId !== undefined);

    // Check if this is a triggered execution (from poll/webhook) or normal execution
    const isTriggeredExecution = !!triggerContext && !messageId;

    // Check if this is a direct sequence execution (from scheduler with only sequenceId)
    const isDirectSequenceExecution = !!sequenceId && !messageId && !triggerContext && !isResumedExecution && manualNodeIndex === undefined;

    // Check if this is a manual single-node execution
    const isManualNodeExecution = manualNodeIndex !== undefined && !!sequenceId;

    // Validate request parameters
    // Allow: resumed, triggered, direct sequence (campaignId + sequenceId), or normal (campaignId + messageId)
    if (!isResumedExecution && !isTriggeredExecution && !isDirectSequenceExecution && !isManualNodeExecution && (!messageId || !campaignId)) {
      return new Response(
        JSON.stringify({ error: "messageId and campaignId are required (or sequenceId for direct execution)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "campaignId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ExecuteMessage] Mode: resumed=${isResumedExecution}, triggered=${isTriggeredExecution}, directSequence=${isDirectSequenceExecution}, manualNode=${isManualNodeExecution} (index=${manualNodeIndex})`);

    console.log(`[ExecuteMessage] Starting - campaign: ${campaignId}, sequence: ${sequenceId}, message: ${messageId}`);

    // Get message details (only if not triggered/direct/resumed execution)
    let typedMessage: GroupMessage | null = null;
    
    if (!isTriggeredExecution && !isResumedExecution && !isDirectSequenceExecution && !isManualNodeExecution && messageId) {
      const { data: message, error: messageError } = await supabase
        .from("group_messages")
        .select("*")
        .eq("id", messageId)
        .single();

      if (messageError || !message) {
        console.error("[ExecuteMessage] Message not found:", messageError);
        return new Response(
          JSON.stringify({ error: "Message not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      typedMessage = message as GroupMessage;
    }

    // Get campaign (left join on instance so we can return a precise error)
    const { data: campaignData, error: campaignError } = await supabase
      .from("group_campaigns")
      .select(`
        id,
        name,
        status,
        instance_id,
        config,
        user_id,
        company_id,
        instances(
          id,
          name,
          phone,
          provider,
          external_instance_id,
          external_instance_token,
          status
        )
      `)
      .eq("id", effectiveCampaignId)
      .maybeSingle();

    let typedCampaign: CampaignData;
    let instance: any = null;

    if (campaignError || !campaignData) {
      console.log("[ExecuteMessage] Campaign not found, attempting to resolve sequence as fallback campaign", effectiveCampaignId);
      const seqId = sequenceId || effectiveCampaignId;
      const { data: seqData } = await supabase
        .from("message_sequences")
        .select("id, name, user_id, company_id, group_campaign_id, trigger_config")
        .eq("id", seqId)
        .maybeSingle();

      if (!seqData) {
        return new Response(
          JSON.stringify({ error: "Campaign/Sequence not found", campaignId: effectiveCampaignId }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If the sequence is linked to a campaign, try to load that campaign instead!
      let resolvedCampaignData = null;
      if (seqData.group_campaign_id) {
        const { data: campaignFromSeq } = await supabase
          .from("group_campaigns")
          .select(`
            id,
            name,
            status,
            instance_id,
            config,
            user_id,
            company_id,
            instances(
              id,
              name,
              phone,
              provider,
              external_instance_id,
              external_instance_token,
              status
            )
          `)
          .eq("id", seqData.group_campaign_id)
          .maybeSingle();
        if (campaignFromSeq) {
          resolvedCampaignData = campaignFromSeq;
        }
      }

      if (resolvedCampaignData) {
        console.log(`[ExecuteMessage] Successfully resolved campaign ${resolvedCampaignData.id} from sequence ${seqId}`);
        typedCampaign = resolvedCampaignData as CampaignData;
        instance = resolvedCampaignData.instances;
        effectiveCampaignId = resolvedCampaignData.id;
      } else {
        typedCampaign = {
          id: seqData.id,
          name: seqData.name,
          status: "active",
          instance_id: null,
          config: {},
          user_id: seqData.user_id,
          company_id: seqData.company_id,
          instances: null
        } as any;
        effectiveCampaignId = seqData.id;

        // Auto-upsert into group_campaigns to satisfy the database foreign key constraint!
        await supabase
          .from("group_campaigns")
          .upsert({
            id: seqData.id,
            name: seqData.name || "Default Workflow Campaign",
            user_id: seqData.user_id,
            status: "active",
            company_id: seqData.company_id || null,
          }, {
            onConflict: "id"
          });
      }
    } else {
      typedCampaign = campaignData as unknown as CampaignData;
      instance = typedCampaign.instances;
    }
    const effectiveSequenceId = sequenceId || typedMessage?.sequence_id;

    // HIGH PRIORITY: For manual testing, the user might have selected a different instance in the UI
    const { manualNodeOverride } = (body as ExecuteMessageRequest);
    if (isManualNodeExecution && manualNodeOverride?.config?.instanceId) {
      const overrideInstanceId = manualNodeOverride.config.instanceId as string;
      const { data: manualInst } = await supabase
        .from("instances")
        .select("id, name, phone, provider, external_instance_id, external_instance_token, status")
        .eq("id", overrideInstanceId)
        .maybeSingle();
      if (manualInst) {
        instance = manualInst as any;
        console.log(`[ExecuteMessage] Resolved instance from manual node override: ${instance.name}`);
      }
    }
    // Fallback: resolve instance from triggerContext if provided (carries the group's instance_id or the individual instanceIds)
    // Fallback: resolve instance from triggerContext if provided (carries the group's instance_id or the individual instanceIds)
    if (triggerContext?.instanceId) {
      const { data: ctxInst } = await supabase
        .from("instances")
        .select("id, name, phone, provider, external_instance_id, external_instance_token, status")
        .eq("id", triggerContext.instanceId)
        .maybeSingle();
      if (ctxInst) {
        instance = ctxInst as any;
        console.log(`[ExecuteMessage] Resolved instance from triggerContext.instanceId: ${instance.name} (${instance.status})`);
      }
    }
    
    if ((!instance || instance.status !== "connected") && triggerContext?.instanceIds && Array.isArray(triggerContext.instanceIds) && triggerContext.instanceIds.length > 0) {
      const poolIds = triggerContext.instanceIds as string[];
      const { data: pool } = await supabase
        .from("instances")
        .select("id, name, phone, provider, external_instance_id, external_instance_token, status")
        .in("id", poolIds);
      if (pool?.length) {
        const connected = (pool as any[]).filter((i: any) => i.status === "connected");
        if (connected.length > 0) {
          instance = connected[Math.floor(Math.random() * connected.length)] as any;
          console.log(`[ExecuteMessage] Selected connected instance from triggerContext.instanceIds pool: ${(instance as any)?.name}`);
        } else if (!instance) {
          instance = pool[Math.floor(Math.random() * pool.length)] as any;
          console.log(`[ExecuteMessage] Selected instance from triggerContext.instanceIds pool: ${(instance as any)?.name}`);
        }
      }
    }

    // Fallback: resolve instance from sequence trigger config or sequence_nodes if not linked to campaign
    if ((!instance || instance.status !== "connected") && effectiveSequenceId) {
      console.log(`[ExecuteMessage] Campaign instance not connected or null, attempting to resolve from sequence ${effectiveSequenceId} trigger config...`);
      
      const { data: triggerSeqData } = await supabase
        .from("message_sequences")
        .select("trigger_config")
        .eq("id", effectiveSequenceId)
        .maybeSingle();

      let triggerConfig = triggerSeqData?.trigger_config as Record<string, any> | undefined;

      if (!triggerConfig || (!triggerConfig.instanceId && !triggerConfig.instanceIds)) {
        const { data: trigNode } = await supabase
          .from("sequence_nodes")
          .select("config")
          .eq("sequence_id", effectiveSequenceId)
          .in("node_type", ["trigger", "webhook"])
          .maybeSingle();
        if (trigNode?.config) {
          triggerConfig = (trigNode.config.triggerConfig || trigNode.config) as Record<string, any>;
        }
      }

      const configInstanceId = triggerConfig?.instanceId;
      const configInstanceIds = triggerConfig?.instanceIds as string[] | undefined;

      if (configInstanceIds && configInstanceIds.length > 0) {
        const { data: pool } = await supabase
          .from("instances")
          .select("id, name, phone, provider, external_instance_id, external_instance_token, status")
          .in("id", configInstanceIds);
        if (pool?.length) {
          const connected = (pool as any[]).filter((i: any) => i.status === "connected");
          if (connected.length > 0) {
            instance = connected[Math.floor(Math.random() * connected.length)] as any;
            console.log(`[ExecuteMessage] Selected connected instance from trigger config instanceIds pool: ${(instance as any)?.name}`);
          } else if (!instance) {
            instance = pool[Math.floor(Math.random() * pool.length)] as any;
          }
        }
      } else if (configInstanceId) {
        const { data: inst } = await supabase
          .from("instances")
          .select("id, name, phone, provider, external_instance_id, external_instance_token, status")
          .eq("id", configInstanceId)
          .maybeSingle();

        if (inst && inst.status === "connected") {
          instance = inst as any;
          console.log(`[ExecuteMessage] Resolved connected instance from sequence trigger config: ${instance.name}`);
        } else if (inst && !instance) {
          instance = inst as any;
          console.log(`[ExecuteMessage] Resolved instance from sequence trigger config: ${instance.name}`);
        }
      }
    }

    // Pool selection: pick randomly from config.instance_ids if no instance, or if the default instance is not connected
    if (!instance || instance.status !== "connected") {
      const config = (typedCampaign as any).config as Record<string, unknown> | null;
      const poolIds = (config?.instance_ids as string[]) || [];
      console.log(`[ExecuteMessage] Checking pool mode - poolIds:`, poolIds);
      if (poolIds.length > 0) {
        const { data: pool } = await supabase
          .from("instances")
          .select("id, name, phone, provider, external_instance_id, external_instance_token, status")
          .in("id", poolIds);
        if (pool?.length) {
          // Prefer connected instances; fall back to any if none are marked connected
          const connected = (pool as any[]).filter((i: any) => i.status === "connected");
          if (connected.length > 0) {
            instance = connected[Math.floor(Math.random() * connected.length)] as any;
            console.log(`[ExecuteMessage] Selected connected instance from pool: ${(instance as any)?.name}`);
          } else if (!instance) {
            // Only overwrite if we didn't have an instance yet, otherwise keep the default disconnected instance
            instance = pool[Math.floor(Math.random() * pool.length)] as any;
            console.log(`[ExecuteMessage] Selected disconnected instance from pool (no connected instances found): ${(instance as any)?.name}`);
          }
        }
      }
    }

    // =========================================================================
    // PROTOCOLO DE CONEXÃO PADRÃO:
    // Se a instância não foi explicitamente fornecida ou não está conectada:
    // "a conexão padrão que vai enviar a mensagem específico para o lead é a conexão
    // que o cara tá conversando (última mensagem da mesma conexão)."
    // =========================================================================
    if (!instance || instance.status !== "connected") {
      const targetLeadId = triggerContext?.leadId || triggerContext?.contactId;
      const rawTargetPhone = (triggerContext?.respondentPhone || triggerContext?.contactPhone || (targetPhones && targetPhones[0]) || "") as string;
      const targetCleanPhone = rawTargetPhone ? rawTargetPhone.replace(/\D/g, "") : "";
      const targetGroupJid = triggerContext?.groupJid as string | undefined;

      if (targetLeadId || targetCleanPhone || targetGroupJid) {
        try {
          const suffix = targetCleanPhone.length >= 8 ? targetCleanPhone.slice(-8) : targetCleanPhone;
          let convQ = supabase
            .from("chat_conversations")
            .select("instance_id, last_message_at, updated_at")
            .not("instance_id", "is", null);

          if (targetGroupJid) {
            convQ = convQ.eq("contact_phone", targetGroupJid);
          } else if (targetLeadId && suffix) {
            convQ = convQ.or(`lead_id.eq.${targetLeadId},contact_phone.ilike.%${suffix}%`);
          } else if (targetLeadId) {
            convQ = convQ.eq("lead_id", targetLeadId);
          } else if (suffix) {
            convQ = convQ.ilike("contact_phone", `%${suffix}%`);
          }

          // Priorizar a conexão da última mensagem trocada com o lead
          const { data: convRows } = await convQ
            .order("last_message_at", { ascending: false, nullsFirst: false })
            .order("updated_at", { ascending: false })
            .limit(5);

          if (convRows && convRows.length > 0) {
            for (const cRow of convRows) {
              if (cRow.instance_id) {
                const { data: convInst } = await supabase
                  .from("instances")
                  .select("id, name, phone, provider, external_instance_id, external_instance_token, status")
                  .eq("id", cRow.instance_id)
                  .maybeSingle();

                if (convInst && convInst.status === "connected") {
                  instance = convInst as any;
                  console.log(`[ExecuteMessage] 🎯 Conexão Padrão resolvida da conversa ativa do lead (${targetCleanPhone || targetLeadId || targetGroupJid}): ${instance.name} (${instance.id})`);
                  break;
                }
              }
            }
          }
        } catch (convResolveErr) {
          console.warn("[ExecuteMessage] Erro ao buscar conexão padrão da conversa do lead:", convResolveErr);
        }
      }
    }

    if (!instance || instance.status !== "connected") {
      const companyId = typedCampaign.company_id;
      let instQuery = supabase
        .from("instances")
        .select("id, name, phone, provider, external_instance_id, external_instance_token, status");
        
      if (companyId) {
        instQuery = instQuery.eq("company_id", companyId);
      } else if (typedCampaign.user_id) {
        instQuery = instQuery.eq("user_id", typedCampaign.user_id);
      }
      
      const { data: dbInsts } = await instQuery.limit(10);
      if (dbInsts && dbInsts.length > 0) {
        const connected = dbInsts.find(i => i.status === "connected");
        if (connected) {
          instance = connected as any;
          console.log(`[ExecuteMessage] Auto-resolved connected instance from account: ${instance.name}`);
        } else if (!instance) {
          instance = dbInsts[0] as any;
          console.log(`[ExecuteMessage] Auto-resolved fallback instance from account: ${instance.name}`);
        }
      }
    }

    if (!instance && !isManualNodeExecution) {
      console.warn(`[ExecuteMessage] Campaign ${effectiveCampaignId} has no instance linked. Creating dummy context for execution.`);
      instance = {
        id: "no-instance",
        name: "Sem Instância (Execução Offline)",
        phone: "",
        provider: "none",
        external_instance_id: "",
        external_instance_token: "",
        status: "disconnected"
      } as any;
    }

    if (instance && instance.status !== "connected") {
      console.warn(`[ExecuteMessage] Warning: Instance ${instance.id} is not connected. Messaging nodes may fail.`);
    }


    // Determine user_id for logging and webhook lookup
    const userId = typedMessage?.user_id || typedCampaign.user_id;
    
    // 1. Resolve sequence trigger_config early to identify workflow destinationMode and selected groups
    let sequenceTriggerConfig: Record<string, any> = {};
    if (effectiveSequenceId) {
      const { data: seqRow } = await supabase
        .from("message_sequences")
        .select("trigger_config, trigger_type")
        .eq("id", effectiveSequenceId)
        .maybeSingle();
      sequenceTriggerConfig = (seqRow?.trigger_config || {}) as Record<string, any>;

      if (!sequenceTriggerConfig.destinationMode && !sequenceTriggerConfig.selectedGroupJids) {
        const { data: trigNode } = await supabase
          .from("sequence_nodes")
          .select("config")
          .eq("sequence_id", effectiveSequenceId)
          .in("node_type", ["trigger", "webhook"])
          .maybeSingle();
        if (trigNode?.config) {
          const nodeCfg = (trigNode.config.triggerConfig || trigNode.config) as Record<string, any>;
          sequenceTriggerConfig = { ...nodeCfg, ...sequenceTriggerConfig };
        }
      }
    }

    // 2. Resolve destination groups: Prioritize explicitly targeted group or selectedGroupJids from triggerContext
    // REGRA FUNDAMENTAL: Se o triggerContext especifica um grupo de destino específico (ex: disparo manual no chat do grupo ou triggerContext.selectedGroupJids),
    // ele DEVE ter prioridade absoluta sobre sequenceTriggerConfig.selectedGroupJids do workflow!
    const triggerExplicitJid = triggerContext?.groupJid || triggerContext?.targetGroupJid;
    const cleanTriggerExplicitJid = triggerExplicitJid 
      ? (String(triggerExplicitJid).includes('@g.us') ? String(triggerExplicitJid).trim() : `${String(triggerExplicitJid).replace(/\D/g, '')}@g.us`)
      : null;

    let selectedJids: string[] = [];
    if (cleanTriggerExplicitJid) {
      selectedJids = [cleanTriggerExplicitJid];
    } else if (triggerContext?.selectedGroupJids && Array.isArray(triggerContext.selectedGroupJids) && triggerContext.selectedGroupJids.length > 0) {
      selectedJids = triggerContext.selectedGroupJids;
    } else if (sequenceTriggerConfig.selectedGroupJids && Array.isArray(sequenceTriggerConfig.selectedGroupJids) && sequenceTriggerConfig.selectedGroupJids.length > 0) {
      selectedJids = sequenceTriggerConfig.selectedGroupJids;
    }
    let groups: LinkedGroup[] = [];

    if (selectedJids.length > 0) {
      // Deduplicate selected JIDs
      const seen = new Set<string>();
      const cleanJids: string[] = [];
      for (const jid of selectedJids) {
        if (!jid) continue;
        const normalized = jid.trim();
        const numeric = normalized.replace(/\D/g, "");
        const dedupKey = numeric || normalized;
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          cleanJids.push(normalized);
        }
      }

      // Fetch group names from group_campaigns
      const { data: gcRows } = await supabase
        .from("group_campaigns")
        .select("group_jid, group_name, name")
        .in("group_jid", cleanJids);

      const nameMap = new Map<string, string>();
      (gcRows || []).forEach((r: any) => {
        if (r.group_jid) nameMap.set(r.group_jid, r.group_name || r.name || r.group_jid);
      });

      // Also check campaign_groups for any missing names
      const { data: cgRows } = await supabase
        .from("campaign_groups")
        .select("group_jid, group_name")
        .in("group_jid", cleanJids);
      (cgRows || []).forEach((r: any) => {
        if (r.group_jid && !nameMap.has(r.group_jid)) nameMap.set(r.group_jid, r.group_name || r.group_jid);
      });

      for (const jid of cleanJids) {
        groups.push({
          id: crypto.randomUUID(),
          group_jid: jid,
          group_name: nameMap.get(jid) || jid,
        });
      }
      console.log(`[ExecuteMessage] 🎯 Prioritized ${groups.length} groups configured in workflow selectedGroupJids:`, groups.map(g => `${g.group_name} (${g.group_jid})`));
    } else {
      // Fallback: Get linked groups from campaign_groups
      const { data: linkedGroups } = await supabase
        .from("campaign_groups")
        .select("id, group_jid, group_name")
        .in("campaign_id", [effectiveCampaignId, sequenceId, body.sequenceId].filter(Boolean) as string[]);

      groups = (linkedGroups || []) as LinkedGroup[];
      console.log(`[ExecuteMessage] Loaded ${groups.length} groups from legacy campaign_groups:`, groups.map(g => `${g.group_name} (${g.group_jid})`));
    }

    // 3. Determine whether this sequence is explicitly a group workflow
    const isExplicitIndividual = 
      triggerContext?.destinationMode === "individual" || 
      triggerContext?.sendPrivate === true;

    const isWorkflowGroupMode = !isExplicitIndividual && (
      triggerContext?.destinationMode === "groups" ||
      sequenceTriggerConfig.destinationMode === "groups" ||
      (sequenceTriggerConfig.isGroup === true && sequenceTriggerConfig.destinationMode !== "individual") ||
      (sequenceTriggerConfig.destinationMode !== "individual" && groups.length > 0)
    );

    // For triggered execution with sendPrivate, only respect it if NOT a group workflow!
    const sendToPrivate = !isWorkflowGroupMode && isTriggeredExecution && triggerContext?.sendPrivate;

    const hasPrivateDestinations = !isWorkflowGroupMode && (
      sendToPrivate || 
      isResumedExecution ||
      !!(triggerContext?.callResult) ||
      (targetPhones && targetPhones.length > 0) || 
      isManualNodeExecution || 
      !!(triggerContext?.groupJid) || 
      !!(triggerContext?.triggerId) ||
      !!(triggerContext?.respondentPhone) ||
      !!(triggerContext?.contactPhone) ||
      !!(triggerContext?.uraResult)
    );

    if (!hasPrivateDestinations && groups.length === 0 && !isWorkflowGroupMode) {
      return new Response(
        JSON.stringify({ error: "No linked groups found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's webhook config
    const { data: webhookConfig } = await supabase
      .from("webhook_configs")
      .select("url, is_active")
      .eq("user_id", userId)
      .eq("category", "messages")
      .maybeSingle();

    const webhookUrl = (webhookConfig?.is_active && webhookConfig?.url) 
      ? webhookConfig.url 
      : "";

    // Get sequence nodes if sequence is linked
    let sequenceNodes: SequenceNode[] = [];
    let connections: SequenceConnection[] = [];

    if (effectiveSequenceId) {
      const { data: nodes } = await supabase
        .from("sequence_nodes")
        .select("id, node_type, node_order, config")
        .eq("sequence_id", effectiveSequenceId)
        .order("node_order", { ascending: true });

      sequenceNodes = (nodes || []) as SequenceNode[];

      const { data: nodeConnections } = await supabase
        .from("sequence_connections")
        .select("id, source_node_id, target_node_id, condition_path")
        .eq("sequence_id", effectiveSequenceId);

      connections = (nodeConnections || []) as SequenceConnection[];
    }

    // For manual node execution, filter to just that one node
    if (isManualNodeExecution && manualNodeIndex !== undefined) {
      // Try exact node_order match first, fallback to positional index
      let manualNode = sequenceNodes.filter(n => n.node_order === manualNodeIndex);
      if (manualNode.length === 0 && manualNodeIndex < sequenceNodes.length) {
        manualNode = [sequenceNodes[manualNodeIndex]];
        console.log(`[ExecuteMessage] Manual node: exact order ${manualNodeIndex} not found, using positional index`);
      }
      if (manualNode.length === 0) {
        return new Response(
          JSON.stringify({ error: `Node at index ${manualNodeIndex} not found (total nodes: ${sequenceNodes.length})` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      sequenceNodes = manualNode;
      
      const { manualNodeOverride } = (body as ExecuteMessageRequest);
      if (manualNodeOverride) {
        sequenceNodes[0].node_type = manualNodeOverride.type;
        sequenceNodes[0].config = manualNodeOverride.config;
      }
      
      console.log(`[ExecuteMessage] Manual node execution: filtered to node order ${manualNodeIndex} (${sequenceNodes[0].node_type})`);
      
      // SHORT-CIRCUIT FOR MANUAL STATUS NODE EXECUTION (Directly send and return)
      if (sequenceNodes[0].node_type === "status") {
        console.log(`[ExecuteMessage] ⚡ SHORT-CIRCUIT: Executing status node manually without destination checks`);
        const node = sequenceNodes[0];
        const payload = {
          action: "status.post",
          node: {
            id: node.id,
            type: node.node_type,
            order: node.node_order,
            config: node.config,
          },
          campaign: { id: typedCampaign.id, name: typedCampaign.name },
          instance: {
            id: instance.id,
            name: instance.name,
            phone: instance.phone || "",
            provider: instance.provider,
            externalId: instance.external_instance_id || "",
            externalToken: instance.external_instance_token || "",
          },
          destination: {
            jid: `status@s.whatsapp.net`,
            name: "Status",
            phone: "",
          },
        };
        
        const sendStartTime = Date.now();
        try {
          const result = await sendWhatsAppMessage(payload);
          return new Response(
            JSON.stringify({
              success: result.ok,
              status: "completed",
              nodesProcessed: 1,
              nodesFailed: result.ok ? 0 : 1,
              totalTimeMs: Date.now() - sendStartTime,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ 
              error: err.message || "Error posting status",
              success: false,
              totalTimeMs: Date.now() - sendStartTime
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    console.log(`[ExecuteMessage] ${sequenceNodes.length} sequence nodes, triggered: ${isTriggeredExecution}, sendPrivate: ${sendToPrivate}, webhook: ${webhookUrl}`);

    let nodesProcessed = isResumedExecution ? (startFromNodeIndex || 0) : 0;
    let nodesFailed = 0;
    let firstNodeError: string | null = null;
    let accumulatedDelayMs = 0;
    const webhookResponses: Array<{ nodeType: string; nodeOrder: number; destination: string; status: string; data: unknown }> = [];

    // ============= NODE-FIRST ORCHESTRATION =============
    if (sequenceNodes.length === 0) {
      // Simple message without sequence - only valid if we have a typedMessage
      if (!typedMessage) {
        return new Response(
          JSON.stringify({ error: "No sequence nodes found and no message provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const action = typedMessage.media_url ? "message.send_media" : "message.send_text";
      
      const simpleNodeConfig: Record<string, unknown> = {
        text: formatLineBreaks(typedMessage.content),
        sendPrivate: typedMessage.send_private,
        mentionMember: typedMessage.mention_member,
        mention_all: Boolean((typedMessage as any).mention_all ?? (typedMessage as any).mentionAll ?? false),
      };
      
      if (typedMessage.media_url) {
        simpleNodeConfig.url = typedMessage.media_url;
        simpleNodeConfig.mediaType = typedMessage.media_type;
        simpleNodeConfig.caption = formatLineBreaks(typedMessage.media_caption);
      }
      
      for (const group of groups) {
        const payload = buildStandardPayload({
          action,
          node: {
            id: typedMessage.id,
            type: typedMessage.media_url ? "media" : "text",
            order: 0,
            config: simpleNodeConfig,
          },
          campaign: {
            id: typedCampaign.id,
            name: typedCampaign.name,
          },
          instance: {
            id: instance.id,
            name: instance.name,
            phone: instance.phone || "",
            provider: instance.provider,
            externalId: instance.external_instance_id || instance.id || "",
            externalToken: instance.external_instance_token || "",
          },
          destination: {
            jid: group.group_jid,
            name: group.group_name,
          },
        });

        const sendStartTime = Date.now();
        
        // Create log entry
        const { data: logEntry } = await supabase
          .from("group_message_logs")
          .insert({
            user_id: userId,
            group_campaign_id: typedCampaign.id,
            message_id: typedMessage.id,
            node_type: "simple_message",
            node_order: 0,
            group_jid: group.group_jid,
            group_name: group.group_name,
            instance_id: instance.id,
            instance_name: instance.name,
            campaign_name: typedCampaign.name,
            status: "sending",
            payload,
          })
          .select()
          .single();

        try {
          const result = await sendWhatsAppMessage(payload);

          const responseTimeMs = Date.now() - sendStartTime;
          const responseData = result.details || result;

          // Parse Z-API response
          const zaapId = result.zaapId || null;
          const externalMessageId = result.messageId || null;

          // Update log
          if (logEntry?.id) {
            await supabase
              .from("group_message_logs")
              .update({
                status: result.ok ? "sent" : "failed",
                error_message: result.ok ? null : `HTTP ${result.status}`,
                response_time_ms: responseTimeMs,
                provider_response: responseData,
                zaap_id: zaapId,
                external_message_id: externalMessageId,
                payload: {
                  ...payload,
                  zapiUrl: result.requestUrl,
                  zapiBody: result.requestBody,
                  curl: result.curl,
                } as any,
              })
              .eq("id", logEntry.id);
          }

          if (result.ok) {
            nodesProcessed++;
            console.log(`[ExecuteMessage] ✅ Sent to ${group.group_name}`);
          } else {
            nodesFailed++;
            console.log(`[ExecuteMessage] ❌ Failed for ${group.group_name}: HTTP ${result.status}`);
          }
        } catch (err) {
          nodesFailed++;
          console.error(`[ExecuteMessage] ❌ Error sending to ${group.group_name}:`, err);
          
          if (logEntry?.id) {
            await supabase
              .from("group_message_logs")
              .update({
                status: "failed",
                error_message: err instanceof Error ? err.message : "Unknown error",
                response_time_ms: Date.now() - sendStartTime,
              })
              .eq("id", logEntry.id);
          }
        }
      }
    } else {
      // ============= SEQUENCE NODE-BY-NODE PROCESSING =============
      const sortedNodes = [...sequenceNodes].sort((a, b) => a.node_order - b.node_order);

      // Helper function to resolve nested property path e.g. "body.user.name"
      const getNestedProp = (obj: any, path: string): any => {
        if (!obj || typeof obj !== 'object') return undefined;
        const parts = path.split('.');
        let curr = obj;
        for (const p of parts) {
          if (curr === undefined || curr === null) return undefined;
          curr = curr[p];
        }
        return curr;
      };

      // Helper function to replace variables in text
      const replaceVariables = (text: string): string => {
        if (!text) return text;
        let result = text;
        if (triggerContext) {
          const respName = triggerContext.respondentName || "";
          const first_name = respName.split(" ")[0] || "";

          // Built-in variables (English & Portuguese aliases)
          result = result.replace(/\{\{name\}\}/gi, respName);
          result = result.replace(/\{name\}/gi, respName);
          result = result.replace(/\{\{nome\}\}/gi, respName);
          result = result.replace(/\{nome\}/gi, respName);
          result = result.replace(/\{\{primeiro_nome\}\}/gi, first_name);
          result = result.replace(/\{primeiro_nome\}/gi, first_name);
          result = result.replace(/\{\{first_name\}\}/gi, first_name);
          result = result.replace(/\{first_name\}/gi, first_name);
          result = result.replace(/\{\{phone\}\}/gi, triggerContext.respondentPhone || "");
          result = result.replace(/\{phone\}/gi, triggerContext.respondentPhone || "");
          result = result.replace(/\{\{telefone\}\}/gi, triggerContext.respondentPhone || "");
          result = result.replace(/\{telefone\}/gi, triggerContext.respondentPhone || "");
          result = result.replace(/\{\{celular\}\}/gi, triggerContext.respondentPhone || "");
          result = result.replace(/\{celular\}/gi, triggerContext.respondentPhone || "");
          result = result.replace(/\{\{option\}\}/gi, triggerContext.pollOptionText || "");
          result = result.replace(/\{option\}/gi, triggerContext.pollOptionText || "");
          result = result.replace(/\{\{opcao\}\}/gi, triggerContext.pollOptionText || "");
          result = result.replace(/\{opcao\}/gi, triggerContext.pollOptionText || "");

          // User response from previous user_input / question
          const userResp = triggerContext.userResponse || "";
          result = result.replace(/\{\{userResponse\}\}/gi, userResp);
          result = result.replace(/\{userResponse\}/gi, userResp);
          result = result.replace(/\{\{user_response\}\}/gi, userResp);
          result = result.replace(/\{user_response\}/gi, userResp);
          result = result.replace(/\{\{resposta\}\}/gi, userResp);
          result = result.replace(/\{resposta\}/gi, userResp);

          // Email
          const emailVal = triggerContext.email || (triggerContext.customFields?.email as string) || (triggerContext.customFields?.["e-mail"] as string) || "";
          result = result.replace(/\{\{email\}\}/gi, emailVal);
          result = result.replace(/\{email\}/gi, emailVal);
          result = result.replace(/\{\{e-mail\}\}/gi, emailVal);
          result = result.replace(/\{e-mail\}/gi, emailVal);

          // Document / CPF / CNPJ
          const docVal = triggerContext.document || (triggerContext.customFields?.document as string) || (triggerContext.customFields?.cpf as string) || (triggerContext.customFields?.cnpj as string) || "";
          result = result.replace(/\{\{document\}\}/gi, docVal);
          result = result.replace(/\{document\}/gi, docVal);
          result = result.replace(/\{\{documento\}\}/gi, docVal);
          result = result.replace(/\{documento\}/gi, docVal);
          result = result.replace(/\{\{cpf\}\}/gi, docVal);
          result = result.replace(/\{cpf\}/gi, docVal);
          result = result.replace(/\{\{cnpj\}\}/gi, docVal);
          result = result.replace(/\{cnpj\}/gi, docVal);

          // Company
          const compVal = triggerContext.company_name || (triggerContext.customFields?.company_name as string) || (triggerContext.customFields?.empresa as string) || "";
          result = result.replace(/\{\{company_name\}\}/gi, compVal);
          result = result.replace(/\{company_name\}/gi, compVal);
          result = result.replace(/\{\{empresa\}\}/gi, compVal);
          result = result.replace(/\{empresa\}/gi, compVal);
          
          // Custom fields from triggerContext
          if (triggerContext.customFields) {
            for (const [key, value] of Object.entries(triggerContext.customFields)) {
              const strVal = value !== undefined && value !== null ? (typeof value === 'object' ? JSON.stringify(value) : String(value)) : "";
              const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
              result = result.replace(regex, strVal);
              const regexSingle = new RegExp(`\\{${key}\\}`, "gi");
              result = result.replace(regexSingle, strVal);
            }
          }

          // Direct payload / webhook resolution (e.g. {{body.nome}}, {{data.user}}, {{webhook.body.id}}, {{user}}, {{mac_key}})
          const payloadObj = triggerContext.webhookPayload || (triggerContext as any).payload || triggerContext;
          if (payloadObj && typeof payloadObj === "object") {
            const resolveVal = (rawKey: string): any => {
              const key = rawKey.trim();
              return getNestedProp(payloadObj, key) 
                ?? getNestedProp(payloadObj, key.replace(/^webhook\./, ''))
                ?? getNestedProp(payloadObj.body || payloadObj, key.replace(/^body\./, ''))
                ?? getNestedProp(payloadObj.data || payloadObj, key.replace(/^data\./, ''))
                ?? getNestedProp(triggerContext.customFields, key);
            };

            result = result.replace(/\{\{([^{}]+)\}\}/g, (match, rawKey) => {
              const val = resolveVal(rawKey);
              return val !== undefined && val !== null ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : match;
            });
            result = result.replace(/\{([^{}]+)\}/g, (match, rawKey) => {
              const val = resolveVal(rawKey);
              return val !== undefined && val !== null ? (typeof val === 'object' ? JSON.stringify(val) : String(val)) : match;
            });
          }
        }
        return result;
      };

      // Determine destinations based on whether workflow is in group mode or individual mode
      let destinations: DestinationData[] = [];

      if (isWorkflowGroupMode) {
        // =========================================================================
        // MODO GRUPOS DO WHATSAPP (Workflow de Grupo)
        // Regra absoluta: NUNCA enviar para o privado do lead, mesmo que o comando
        // tenha sido disparado em um chat privado ou tenha respondentPhone.
        // O conteúdo do fluxo DEVE ir para os grupos configurados.
        // =========================================================================
        console.log(`[ExecuteMessage] 👥 Executando em MODO GRUPO (isWorkflowGroupMode=true). Total de grupos disponíveis: ${groups.length}`);

        const explicitGroupJid = triggerContext?.groupJid || triggerContext?.targetGroupJid;
        const cleanDigits = String(explicitGroupJid || "").replace(/\D/g, "");
        const isActuallyGroupJid = explicitGroupJid && !String(explicitGroupJid).includes('@s.whatsapp.net') && !String(explicitGroupJid).includes('@c.us') && (
          String(explicitGroupJid).includes('@g.us') ||
          String(explicitGroupJid).includes('-group') ||
          cleanDigits.startsWith('1203') ||
          cleanDigits.length > 15
        );
        const normalizedGroupJid = isActuallyGroupJid 
          ? (String(explicitGroupJid).includes('@g.us') ? String(explicitGroupJid).trim() : `${String(explicitGroupJid).replace("-group", "").replace(/\D/g, '')}@g.us`)
          : null;

        if (normalizedGroupJid) {
          destinations = [{
            group_jid: normalizedGroupJid,
            group_name: (triggerContext?.respondentName as string) || "Grupo",
            isPrivate: false,
          }];
        } else if (groups.length > 1 && !isResumedExecution && !isManualNodeExecution) {
          console.log(`[ExecuteMessage] 🔀 Multi-group workflow with ${groups.length} groups triggered without specific groupJid. Fanning out to individual executions per group.`);
          
          const fanoutResults = [];
          for (const g of groups) {
            try {
              const fanoutRes = await fetch(`${supabaseUrl}/functions/v1/execute-message`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  campaignId: effectiveCampaignId,
                  sequenceId: effectiveSequenceId,
                  startFromNodeId: startFromNodeId,
                  triggerContext: {
                    ...triggerContext,
                    groupJid: g.group_jid,
                    targetGroupJid: g.group_jid,
                    respondentName: g.group_name || "Grupo",
                  },
                }),
              });
              const resJson = await fanoutRes.json();
              fanoutResults.push({ groupJid: g.group_jid, ok: fanoutRes.ok, result: resJson });
            } catch (err: any) {
              console.error(`[ExecuteMessage] Fanout failed for group ${g.group_jid}:`, err);
              fanoutResults.push({ groupJid: g.group_jid, ok: false, error: err.message });
            }
          }

          return new Response(
            JSON.stringify({ success: true, fannedOut: true, groupCount: groups.length, groups: fanoutResults }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else if (groups.length > 0) {
          destinations = groups.map(g => ({
            group_jid: g.group_jid,
            group_name: g.group_name || "Grupo",
            isPrivate: false,
          }));
        } else {
          console.error(`[ExecuteMessage] ❌ Erro: Workflow configurado para Grupos do WhatsApp, mas nenhum grupo encontrado.`);
          return new Response(
            JSON.stringify({ error: "Este fluxo está configurado para Grupos do WhatsApp, mas nenhum grupo de destino foi vinculado nas configurações do workflow." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // =========================================================================
        // MODO INDIVIDUAL / PRIVADO (DM)
        // =========================================================================
        destinations = targetPhones && targetPhones.length > 0
          ? targetPhones.map((phone: string) => ({
              group_jid: `${phone.replace(/\D/g, "")}@s.whatsapp.net`,
              group_name: phone,
              isPrivate: true,
            }))
          : (sendToPrivate || triggerContext?.sendPrivate || triggerContext?.uraResult || triggerContext?.destinationMode === "individual") && (triggerContext?.respondentPhone || triggerContext?.contactPhone)
            ? [{ 
                group_jid: (triggerContext.respondentJid && triggerContext.respondentJid.includes('@s.whatsapp.net')) 
                  ? triggerContext.respondentJid 
                  : `${String(triggerContext.respondentPhone || triggerContext.contactPhone).replace(/\D/g, "")}@s.whatsapp.net`, 
                group_name: triggerContext.respondentName || triggerContext.respondentPhone || triggerContext.contactPhone,
                isPrivate: true
              }]
            : triggerContext?.groupJid && !String(triggerContext.groupJid).includes('@s.whatsapp.net') && (String(triggerContext.groupJid).includes('@g.us') || String(triggerContext.groupJid).includes('-group') || String(triggerContext.groupJid).replace(/\D/g, '').startsWith('1203') || String(triggerContext.groupJid).replace(/\D/g, '').length > 15)
              ? [{
                  group_jid: triggerContext.groupJid as string,
                  group_name: (triggerContext.respondentName as string) || "Grupo",
                  isPrivate: false,
                }]
              : (triggerContext?.sendPrivate === false && groups.length > 0
                  ? groups.map(g => ({ group_jid: g.group_jid, group_name: g.group_name, isPrivate: false }))
                  : ((triggerContext?.respondentPhone || triggerContext?.contactPhone)
                      ? [{ group_jid: `${String(triggerContext.respondentPhone || triggerContext.contactPhone).replace(/\D/g, "")}@s.whatsapp.net`, group_name: triggerContext.respondentName || triggerContext.respondentPhone || triggerContext.contactPhone, isPrivate: true }]
                      : groups.map(g => ({ group_jid: g.group_jid, group_name: g.group_name, isPrivate: false }))
                    )
                );
      }

      // If this is a manual test execution from the builder and we have no destinations,
      // fallback to sending to the instance's own number to allow preview/testing.
      if ((isManualNodeExecution || !!(triggerContext?.triggerId)) && destinations.length === 0) {
        let testPhone = instance?.phone;
        let testName = instance?.name;
        
        // Peek at the node config to see if it overrides the instance
        const nodeInstanceIds = sortedNodes.length > 0 ? (sortedNodes[0].config?.instanceIds as string[] | undefined) : undefined;
        const nodeInstanceId = sortedNodes.length > 0 ? (sortedNodes[0].config?.instanceId as string | undefined) : undefined;
        const overrideId = (nodeInstanceIds && nodeInstanceIds.length > 0) ? nodeInstanceIds[0] : nodeInstanceId;
        
        if (overrideId) {
          // In Edge Functions we can't use await here without making it async, but this is already inside an async function!
          const { data: overrideInst } = await supabase
            .from("instances")
            .select("phone, name")
            .eq("id", overrideId)
            .maybeSingle();
            
          if (overrideInst && overrideInst.phone) {
            testPhone = overrideInst.phone;
            testName = overrideInst.name;
          }
        }
        
        if (testPhone) {
          const cleanPhone = testPhone.replace(/\D/g, "");
          if (cleanPhone) {
            console.log(`[ExecuteMessage] Manual test execution: no destinations found, sending to instance phone: ${cleanPhone}`);
            destinations = [{
              group_jid: `${cleanPhone}@s.whatsapp.net`,
              group_name: `Teste (${testName})`,
              isPrivate: true
            }];
          }
        }
      }

      if (destinations.length === 0) {
        const isStatusNodeOverride = isManualNodeExecution && sequenceNodes.length > 0 && sequenceNodes[0].node_type === "status";
        
        if (!isStatusNodeOverride) {
          return new Response(
            JSON.stringify({ error: "Nenhum destino configurado para esta campanha. Vincule grupos ou configure instâncias." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // Provide a dummy destination so the execution loop runs at least once for the status node
          console.log(`[ExecuteMessage] Manual test execution for status node: providing dummy destination`);
          destinations = [{
            group_jid: `status@s.whatsapp.net`,
            group_name: `Status`,
            isPrivate: true
          }];
        }
      }

      // Recover saved execution record if resuming
      let savedExecutionRecord: any = null;
      if (isResumedExecution && executionId) {
        try {
          const { data: savedEx } = await supabase
            .from("sequence_executions")
            .select("*")
            .eq("id", executionId)
            .maybeSingle();
          savedExecutionRecord = savedEx;
          if (!savedExecutionRecord) {
            const { data: wfEx } = await supabase
              .from("workflow_executions")
              .select("*")
              .eq("id", executionId)
              .maybeSingle();
            if (wfEx) {
              savedExecutionRecord = {
                ...wfEx,
                trigger_context: wfEx.trigger_payload,
              };
            }
          }
          if (savedExecutionRecord?.destinations && Array.isArray(savedExecutionRecord.destinations) && savedExecutionRecord.destinations.length > 0) {
            // Prioridade absoluta: restaurar os destinos gravados no estado pausado da execução
            destinations = savedExecutionRecord.destinations;
            console.log(`[ExecuteMessage] 🔄 Recovered ${destinations.length} destinations from saved execution state:`, destinations.map((d: any) => d.group_jid));
          } else if (destinations.length === 0 && savedExecutionRecord) {
            const savedCtx = savedExecutionRecord.trigger_context || savedExecutionRecord.trigger_payload;
            const phone = savedCtx?.respondentPhone || savedCtx?.contactPhone || triggerContext?.respondentPhone || triggerContext?.contactPhone;
            if (phone) {
              const cleanP = String(phone).replace(/\D/g, "");
              if (cleanP) {
                destinations = [{
                  group_jid: `${cleanP}@s.whatsapp.net`,
                  group_name: savedCtx?.respondentName || triggerContext?.respondentName || cleanP,
                  isPrivate: true,
                }];
                console.log(`[ExecuteMessage] 🔄 Recovered private destination ${cleanP} from saved execution record trigger context`);
              }
            }
          }
        } catch (fetchSavedErr) {
          console.warn("[ExecuteMessage] Could not fetch saved execution record (non-fatal):", fetchSavedErr);
        }
      }

      // Membership validation: private phone destinations must be active group members
      let effectiveDests = destinations;
      
      // Skip membership validation for webhook triggers, manual node tests, and resumed executions to allow external/test leads
      if (!isTriggeredExecution && !isManualNodeExecution && !isResumedExecution) {
        const privatePhoneDests = destinations.filter(
          (d: DestinationData) => d.isPrivate && d.group_jid?.endsWith("@s.whatsapp.net")
        );
        if (privatePhoneDests.length > 0) {
          const phones = privatePhoneDests.map((d: DestinationData) => d.group_jid.replace("@s.whatsapp.net", ""));
          const { data: members } = await supabase
            .from("group_members")
            .select("phone")
            .eq("group_campaign_id", effectiveCampaignId)
            .in("phone", phones)
            .eq("status", "active");
          const activePhonesSet = new Set((members || []).map((m: any) => m.phone));
          effectiveDests = destinations.filter((d: DestinationData) => {
            if (!d.isPrivate || !d.group_jid?.endsWith("@s.whatsapp.net")) return true;
            const phone = d.group_jid.replace("@s.whatsapp.net", "");
            if (!activePhonesSet.has(phone)) {
              console.warn(`[ExecuteMessage] ${phone} não é membro ativo da campanha ${effectiveCampaignId} — ignorado`);
              return false;
            }
            return true;
          });
          if (effectiveDests.length === 0) {
            return new Response(
              JSON.stringify({ error: "Nenhum destino válido: números não são membros ativos da campanha", campaignId: effectiveCampaignId }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      let activeDestinations = [...effectiveDests];
      const visitCounts = new Map<string, number>();
      let activeInstanceId = instance.id; // local state tracker for active channel selector
      const defaultInstance = instance;
      const defaultInstanceId = instance?.id;

      // Resume by node id when available (graph resume or poll resume), otherwise start at the first node in order
      let currentNodeId: string | null =
        (triggerContext?.resumedFromPoll && triggerContext?.resumeNodeId)
          ? triggerContext.resumeNodeId
          : (isResumedExecution && startFromNodeId)
          ? startFromNodeId
          : (sortedNodes[0]?.id ?? null);

      // Workflow execution history: one row per real run, reused across pause/resume
      // (via the same executionId) so a single logical run — even one spanning a
      // multi-day delay — shows up as one entry in the Execuções tab.
      const workflowTriggerType = isManualNodeExecution ? "manual_node_test"
        : isResumedExecution ? "resumed"
        : isTriggeredExecution ? "webhook"
        : isDirectSequenceExecution ? "manual"
        : "message";

      let workflowExecutionId: string = (isResumedExecution && executionId) ? executionId : crypto.randomUUID();
      globalWorkflowExecutionId = workflowExecutionId;

      // ── REGRA DE EXECUÇÃO ÚNICA POR WORKFLOW POR LEAD ──────────────────────────
      const effectiveLeadId = triggerContext?.leadId || triggerContext?.contactId;
      const effectivePhone = (triggerContext?.respondentPhone || triggerContext?.contactPhone || "") as string;
      const cleanTriggerPhone = effectivePhone ? effectivePhone.replace(/\D/g, "") : "";

      if (effectiveSequenceId && (effectiveLeadId || cleanTriggerPhone)) {
        try {
          let existingExecQuery = supabase
            .from("sequence_executions")
            .select("id, status, created_at")
            .eq("sequence_id", effectiveSequenceId)
            .in("status", ["running", "paused", "waiting"]);

          if (effectiveLeadId) {
            existingExecQuery = existingExecQuery.or(`trigger_context->>leadId.eq.${effectiveLeadId},trigger_context->>contactId.eq.${effectiveLeadId}`);
          } else if (cleanTriggerPhone) {
            existingExecQuery = existingExecQuery.or(`trigger_context->>respondentPhone.ilike.%${cleanTriggerPhone}%,trigger_context->>contactPhone.ilike.%${cleanTriggerPhone}%`);
          }

          const { data: activeList } = await existingExecQuery;

          if (activeList && activeList.length > 0) {
            if (isResumedExecution) {
              // Retomada: se não tiver executionId passado, reutilizar a execução ativa existente!
              if (!executionId) {
                workflowExecutionId = activeList[0].id;
              } else {
                workflowExecutionId = executionId;
              }
              // Marcar qualquer outra execução duplicada desse mesmo fluxo para esse lead como superseded/concluída
              const dupIds = activeList.filter(e => e.id !== workflowExecutionId).map(e => e.id);
              if (dupIds.length > 0) {
                console.log(`[ExecuteMessage] Limpando ${dupIds.length} execuções duplicadas da sequência ${effectiveSequenceId} no lead ${effectiveLeadId || cleanTriggerPhone}`);
                await Promise.all([
                  supabase.from("sequence_executions").update({ status: "superseded", error_message: "Substituído por retomada de execução", updated_at: new Date().toISOString() }).in("id", dupIds),
                  supabase.from("workflow_executions").update({ status: "success", finished_at: new Date().toISOString() }).in("id", dupIds),
                ]);
              }
            } else {
              // Nova execução do mesmo fluxo para o mesmo lead:
              // Regra: "o mesmo fluxo não pode executar ao mesmo tempo dentro do mesmo lead, não importa a fase"
              // Cancelar a execução anterior para que apenas a nova permaneça ativa
              console.log(`[ExecuteMessage] Substituindo ${activeList.length} execução(ões) anterior(es) da sequência ${effectiveSequenceId} no lead ${effectiveLeadId || cleanTriggerPhone}`);
              const oldIds = activeList.map(e => e.id);
              await Promise.all([
                supabase.from("sequence_executions").update({ status: "superseded", error_message: "Substituído por nova execução do mesmo fluxo", updated_at: new Date().toISOString() }).in("id", oldIds),
                supabase.from("workflow_executions").update({ status: "cancelled", finished_at: new Date().toISOString(), error_message: "Substituído por nova execução do mesmo fluxo" }).in("id", oldIds),
              ]);
            }
          }
        } catch (checkErr) {
          console.warn("[ExecuteMessage] Erro na verificação de deduplicação (não-fatal):", checkErr);
        }
      }

      try {
        if (isResumedExecution && (executionId || workflowExecutionId)) {
          if (executionId) workflowExecutionId = executionId;
          await supabase.from("workflow_executions").update({ status: "running", updated_at: new Date().toISOString() }).eq("id", workflowExecutionId);
        } else {
          const { data: newExecution, error: newExecutionError } = await supabase
            .from("workflow_executions")
            .insert({
              id: workflowExecutionId,
              user_id: userId,
              campaign_id: effectiveCampaignId,
              sequence_id: effectiveSequenceId,
              sequence_type: "message",
              status: "running",
              trigger_type: workflowTriggerType,
              trigger_payload: triggerContext || {},
            })
            .select("id")
            .single();
          if (newExecutionError) throw newExecutionError;
          if (newExecution?.id) workflowExecutionId = newExecution.id;
        }
      } catch (err) {
        console.error("[ExecuteMessage] Failed to create/resume workflow_executions row (non-fatal):", err);
      }

      while (currentNodeId) {
        let node = sortedNodes.find(n => n.id === currentNodeId);
        if (!node) {
          console.warn(`[ExecuteMessage] Node ${currentNodeId} not found directly in sortedNodes, attempting robust recovery...`);

          // 1. Try to find the node in savedExecutionRecord.nodes_data (snapshot from when execution was paused)
          if (savedExecutionRecord?.nodes_data && Array.isArray(savedExecutionRecord.nodes_data)) {
            const savedNode = (savedExecutionRecord.nodes_data as SequenceNode[]).find((n: SequenceNode) => n.id === currentNodeId);
            if (savedNode) {
              const matchedNode = sortedNodes.find(n => n.node_order === savedNode.node_order) 
                               || sortedNodes.find(n => n.node_type === savedNode.node_type);
              if (matchedNode) {
                console.log(`[ExecuteMessage] 🔄 Recovered node by saved order/type: ${currentNodeId} -> ${matchedNode.id} (${matchedNode.node_type})`);
                node = matchedNode;
                currentNodeId = matchedNode.id;
              } else {
                console.log(`[ExecuteMessage] 🔄 Using saved node snapshot directly: ${savedNode.id} (${savedNode.node_type})`);
                node = savedNode;
              }
            }
          }

          // 2. Try to find the target of the last executed node (e.g. the delay node) via sequence_connections
          if (!node && workflowExecutionId) {
            try {
              const { data: lastExecNodes } = await supabase
                .from("workflow_node_executions")
                .select("node_id, node_type, status, created_at")
                .eq("execution_id", workflowExecutionId)
                .eq("status", "success")
                .order("created_at", { ascending: false })
                .limit(5);

              if (lastExecNodes && lastExecNodes.length > 0) {
                for (const lastNode of lastExecNodes) {
                  const conn = connections.find(c => c.source_node_id === lastNode.node_id);
                  if (conn) {
                    const targetNode = sortedNodes.find(n => n.id === conn.target_node_id);
                    if (targetNode) {
                      console.log(`[ExecuteMessage] 🔄 Recovered node via connection from last executed node (${lastNode.node_type} ${lastNode.node_id}): -> ${targetNode.id} (${targetNode.node_type})`);
                      node = targetNode;
                      currentNodeId = targetNode.id;
                      break;
                    }
                  }
                }
              }
            } catch (recovErr) {
              console.warn("[ExecuteMessage] Connection-based node recovery error (non-fatal):", recovErr);
            }
          }

          // 3. Fallback: match by startFromNodeIndex or current_node_index
          if (!node) {
            const targetIdx = (startFromNodeIndex !== undefined && startFromNodeIndex >= 0) 
              ? startFromNodeIndex 
              : (savedExecutionRecord?.current_node_index !== undefined && savedExecutionRecord.current_node_index >= 0)
              ? savedExecutionRecord.current_node_index
              : -1;
            if (targetIdx >= 0 && targetIdx < sortedNodes.length) {
              console.log(`[ExecuteMessage] 🔄 Recovered node by index ${targetIdx}: ${sortedNodes[targetIdx].id} (${sortedNodes[targetIdx].node_type})`);
              node = sortedNodes[targetIdx];
              currentNodeId = node.id;
            }
          }

          if (!node) {
            console.error(`[ExecuteMessage] ❌ Could not recover node ${currentNodeId} in sequence, terminating execution.`);
            break;
          }
        }

        // Loop counter prevention (max 5 executions of same node)
        const visits = (visitCounts.get(node.id) || 0) + 1;
        if (visits > 5) {
          console.error(`[ExecuteMessage] Loop limit exceeded at node ${node.id} (${node.node_type}). Terminating execution.`);
          break;
        }
        visitCounts.set(node.id, visits);

        // Check if execution was cancelled by user
        if (workflowExecutionId) {
          const { data: execCheck } = await supabase
            .from("workflow_executions")
            .select("status")
            .eq("id", workflowExecutionId)
            .maybeSingle();
          if (execCheck?.status === "cancelled") {
            console.log(`[ExecuteMessage] 🛑 Execução ${workflowExecutionId} foi cancelada pelo usuário. Encerrando processamento.`);
            break;
          }
        }

        const activeProcessingTime = Date.now() - startTime - accumulatedDelayMs;
        if (activeProcessingTime > 60000) {
          throw new Error(`Timeout: A execução excedeu o limite de 1 minuto de processamento ativo (tempo real: ${activeProcessingTime}ms).`);
        }

        console.log(`[ExecuteMessage] Processing node: ${node.id} (${node.node_type})`);
        const nodeStartedAt = new Date();
        const initialNodesFailed = nodesFailed;

        // Check if node overrides the WhatsApp instance
        const nodeInstanceIds = node.config?.instanceIds as string[] | undefined;
        const nodeInstanceId = node.config?.instanceId as string | undefined;

        let overrideId: string | undefined = undefined;

        if (nodeInstanceIds && nodeInstanceIds.length > 0) {
          overrideId = nodeInstanceIds[Math.floor(Math.random() * nodeInstanceIds.length)];
          console.log(`[ExecuteMessage] Node ${node.id} picked instance ${overrideId} from pool of ${nodeInstanceIds.length}`);
        } else if (nodeInstanceId && nodeInstanceId !== "default" && nodeInstanceId !== "") {
          overrideId = nodeInstanceId;
        }

        if (overrideId && overrideId !== activeInstanceId) {
          console.log(`[ExecuteMessage] Node ${node.id} requested instance override: ${overrideId}`);
          
          const { data: overrideInst } = await supabase
            .from("instances")
            .select("id, name, phone, provider, external_instance_id, external_instance_token, status")
            .eq("id", overrideId)
            .maybeSingle();
            
          if (overrideInst && overrideInst.status === "connected") {
            instance = overrideInst as any;
            activeInstanceId = overrideInst.id;
            console.log(`[ExecuteMessage] Successfully switched active instance to: ${instance.name}`);
          } else {
            console.warn(`[ExecuteMessage] Override instance ${overrideId} not found or not connected. Continuing with current.`);
          }
        } else if ((!overrideId || overrideId === "default" || overrideId === "") && activeInstanceId !== defaultInstanceId && defaultInstance) {
          console.log(`[ExecuteMessage] Node ${node.id} é Conexão Padrão. Retornando para a conexão padrão do lead: ${defaultInstance.name}`);
          instance = defaultInstance;
          activeInstanceId = defaultInstance.id;
        }

        // ============= TRIGGER (START) NODE =============
        // The trigger/start node is a canvas entry-point marker, not a sendable
        // message node — its "config.content" is decorative UI copy only. It must
        // never reach the generic send branch below (which would otherwise send
        // that copy as a real WhatsApp message). It just passes the trigger
        // payload through to the next connected node.
        if (node.node_type === "trigger" || node.node_type === "start" || node.node_type === "inicio") {
          await logNodeExecution(supabase, {
            executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
            status: "success", startedAt: nodeStartedAt,
            input: triggerContext || {}, output: triggerContext || {},
          });
          
          const tId = triggerContext?.triggerId as string | undefined;
          let nextConn = null;
          
          if (tId) {
            // Priority 1: Match connection with condition_path equal to triggerId
            nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path === tId);
          }
          
          if (!nextConn) {
            // Priority 2: Match any connection (fallback)
            nextConn = connections.find(c => c.source_node_id === node.id);
          }
          
          currentNodeId = nextConn ? nextConn.target_node_id : null;
          nodesProcessed++;
          continue;
        }

        // ============= CHANNEL SELECTOR NODES =============
        if (node.node_type === "channel_select") {
          const selectedInstanceId = node.config.instanceId as string;
          if (selectedInstanceId) {
            activeInstanceId = selectedInstanceId;
            console.log(`[ExecuteMessage] Channel selector: switching to instance ${activeInstanceId}`);
          }
          await logNodeExecution(supabase, {
            executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
            status: "success", startedAt: nodeStartedAt,
            input: node.config, output: { switchedToInstanceId: selectedInstanceId || null },
          });
          const nextConn = connections.find(c => c.source_node_id === node.id);
          currentNodeId = nextConn ? nextConn.target_node_id : null;
          nodesProcessed++;
          continue;
        }

        // ============= ACTION CRM NODES (Extensible Engine for Leads & Deals) =============
        if (
          node.node_type !== "condition" &&
          node.node_type !== "trigger" &&
          node.node_type !== "start" &&
          node.node_type !== "inicio" &&
          node.node_type !== "content" &&
          node.node_type !== "message" &&
          node.node_type !== "delay" &&
          node.node_type !== "channel_select" &&
          (
            node.node_type === "action" ||
            node.node_type === "create_lead" ||
            node.node_type === "lead_create" ||
            node.node_type === "delete_lead" ||
            node.node_type === "add_lead_tags" ||
            node.node_type === "remove_lead_tags" ||
            node.node_type === "tag_add" ||
            node.node_type === "tag_remove" ||
            node.node_type === "deal_move" ||
            node.node_type === "move_deal" ||
            node.node_type === "move_deal_stage" ||
            node.node_type === "create_deal" ||
            node.node_type === "deal_create" ||
            node.config?.category === "deal" ||
            node.config?.category === "lead"
          )
        ) {
          const actionType =
            (node.config.actionType as string) ||
            ((node.config.parameters as Record<string, any>)?.actionType as string) ||
            (node.node_type === "create_lead" || node.node_type === "lead_create"
              ? "create_lead"
              : node.node_type === "delete_lead"
              ? "delete_lead"
              : (node.node_type === "tag_add" || node.node_type === "add_lead_tags")
              ? "add_lead_tags"
              : (node.node_type === "tag_remove" || node.node_type === "remove_lead_tags")
              ? "remove_lead_tags"
              : (node.node_type === "deal_move" || node.node_type === "move_deal" || node.node_type === "move_deal_stage")
              ? "move_deal_stage"
              : (node.node_type === "create_deal" || node.node_type === "deal_create")
              ? "create_deal"
              : node.config?.category === "deal"
              ? ((node.config.parameters as any)?.stageId && !(node.config.parameters as any)?.title ? "move_deal_stage" : "create_deal")
              : "create_lead");
          const params = (node.config.parameters as Record<string, any>) || node.config;
          const companyId = typedCampaign.company_id || triggerContext?.companyId || "dcb34e9a-1510-4137-aecd-cec0c6d548c4";
          const affectedLeadIds: string[] = [];
          const affectedDealIds: string[] = [];

          for (const dest of activeDestinations) {
            const rawPhone = triggerContext?.respondentPhone || (dest.isPrivate ? dest.group_jid.split("@")[0] : "");
            const phoneClean = rawPhone ? rawPhone.replace(/\D/g, "") : dest.group_jid.split("@")[0].replace(/\D/g, "");
            const { data: leadData } = await supabase
              .from("leads")
              .select("*")
              .eq("company_id", companyId)
              .eq("phone", phoneClean)
              .maybeSingle();

            const resolveVariables = (str?: string, ctx?: any, lead?: any): string => {
              if (!str) return "";
              let res = String(str);
              const name = lead?.name || ctx?.respondentName || ctx?.contactName || "";
              const phone = lead?.phone || ctx?.respondentPhone || ctx?.contactPhone || ctx?.phone || "";
              const email = lead?.email || ctx?.email || "";
              const cpf = lead?.cpf || lead?.document || ctx?.cpf || "";

              res = res.replace(/\{\{name\}\}/g, name);
              res = res.replace(/\{\{phone\}\}/g, phone);
              res = res.replace(/\{\{email\}\}/g, email);
              res = res.replace(/\{\{cpf\}\}/g, cpf);

              if (ctx?.customFields && typeof ctx.customFields === "object") {
                for (const [key, value] of Object.entries(ctx.customFields)) {
                  const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
                  res = res.replace(regex, String(value || ""));
                }
              }
              return res;
            };

            if (actionType === "create_lead") {
              const rawName = (params.name as string) || (triggerContext?.respondentName as string) || null;
              const rawPhone = (params.phone as string) || (triggerContext?.respondentPhone as string) || phoneClean;

              const resolvedName = rawName ? (resolveVariables(rawName, triggerContext, leadData) || null) : null;
              const resolvedPhone = cleanPhone(resolveVariables(rawPhone, triggerContext, leadData) || phoneClean);
              const resolvedEmail = resolveVariables(params.email as string, triggerContext, leadData) || null;
              const resolvedCpf = cleanCpf(resolveVariables(params.cpf as string, triggerContext, leadData) || "");
              const resolvedSource = resolveVariables(params.source as string, triggerContext, leadData) || (triggerContext?.groupJid ? `Grupo: ${triggerContext.groupJid}` : "Workflow Action");
              const resolvedCompanyName = resolveVariables(params.companyName as string, triggerContext, leadData) || null;
              const tags = Array.isArray(params.tags) ? params.tags : [];
              const targetUserId = typedCampaign?.user_id || triggerContext?.userId || null;

              // Validar se o telefone é real e descartar LIDs internos do WhatsApp (14 a 16 dígitos)
              const isLidOrInvalidPhone =
                (triggerContext?.respondentJid && triggerContext.respondentJid.includes("@lid")) ||
                resolvedPhone.length < 10 ||
                resolvedPhone.length > 13;

              if (resolvedPhone && !isLidOrInvalidPhone) {
                let existingLeadQuery = supabase
                  .from("leads")
                  .select("id, name, company_id, tags")
                  .order("created_at", { ascending: false })
                  .limit(1);

                const suffix = resolvedPhone.slice(-8);
                if (suffix.length >= 8) {
                  existingLeadQuery = existingLeadQuery.or(`phone.eq.${resolvedPhone},phone.ilike.%${suffix}`);
                } else {
                  existingLeadQuery = existingLeadQuery.eq("phone", resolvedPhone);
                }

                const { data: existingLeads } = await existingLeadQuery;
                const existing = existingLeads?.[0];

                if (!existing) {
                  const { data: created, error: createError } = await supabase
                    .from("leads")
                    .insert({
                      company_id: companyId,
                      user_id: targetUserId,
                      name: resolvedName,
                      phone: resolvedPhone,
                      email: resolvedEmail,
                      document: resolvedCpf || null,
                      source_name: resolvedSource,
                      company_name: resolvedCompanyName,
                      tags,
                    })
                    .select("*")
                    .maybeSingle();

                  if (created) {
                    affectedLeadIds.push(created.id);
                    console.log(`[ExecuteMessage] 🆕 Lead ${created.id} created via Action Node for phone ${resolvedPhone}`);
                  } else if (createError) {
                    console.error(`[ExecuteMessage] Error creating lead for phone ${resolvedPhone}:`, createError);
                  }
                } else {
                  affectedLeadIds.push(existing.id);
                  const updates: Record<string, any> = {};
                  if (!existing.company_id && companyId) updates.company_id = companyId;
                  if ((!existing.name || existing.name === resolvedPhone) && resolvedName && resolvedName !== resolvedPhone) {
                    updates.name = resolvedName;
                  }
                  if (tags.length > 0) {
                    const currentTags = existing.tags || [];
                    updates.tags = Array.from(new Set([...currentTags, ...tags]));
                  }
                  if (Object.keys(updates).length > 0) {
                    await supabase.from("leads").update(updates).eq("id", existing.id);
                  }
                  console.log(`[ExecuteMessage] Lead ${existing.id} already exists for phone ${resolvedPhone}`);
                }
              }
            } else if (leadData || triggerContext?.leadId || phoneClean) {
              if (leadData) affectedLeadIds.push(leadData.id);

              if (actionType === "delete_lead") {
                if (params.confirmed !== false && leadData) {
                  await supabase.from("leads").delete().eq("id", leadData.id);
                  console.log(`[ExecuteMessage] 🗑️ Lead ${leadData.id} deleted`);
                }
              } else if (actionType === "add_lead_tags") {
                if (leadData) {
                  const newTagsToAppend = Array.isArray(params.tags) ? params.tags : (params.tag ? [params.tag] : []);
                  const currentTags = leadData.tags || [];
                  const merged = Array.from(new Set([...currentTags, ...newTagsToAppend]));
                  await supabase.from("leads").update({ tags: merged }).eq("id", leadData.id);
                  console.log(`[ExecuteMessage] Tags ${newTagsToAppend.join(", ")} added to lead ${leadData.id}`);
                }
              } else if (actionType === "remove_lead_tags") {
                if (leadData) {
                  const tagsToRemove = Array.isArray(params.tags) ? params.tags : (params.tag ? [params.tag] : []);
                  const currentTags = leadData.tags || [];
                  const filtered = currentTags.filter((t: string) => !tagsToRemove.includes(t));
                  await supabase.from("leads").update({ tags: filtered }).eq("id", leadData.id);
                  console.log(`[ExecuteMessage] Tags ${tagsToRemove.join(", ")} removed from lead ${leadData.id}`);
                }
              } else if (actionType === "add_lead_comment") {
                if (leadData) {
                  const comment = params.comment || "";
                  if (comment) {
                    await supabase.from("lead_notes").insert({
                      company_id: companyId,
                      lead_id: leadData.id,
                      content: comment,
                    });
                    console.log(`[ExecuteMessage] Comment added to lead ${leadData.id}`);
                  }
                }
              } else if (actionType === "transfer_lead_assignee") {
                if (leadData) {
                  const assigneeId = params.assigneeId;
                  if (assigneeId) {
                    await supabase.from("leads").update({ owner_id: assigneeId }).eq("id", leadData.id);
                    console.log(`[ExecuteMessage] Lead ${leadData.id} transferred to ${assigneeId}`);
                  }
                }
              } else if (actionType === "remove_lead_assignee") {
                if (leadData) {
                  await supabase.from("leads").update({ owner_id: null }).eq("id", leadData.id);
                  console.log(`[ExecuteMessage] Assignee removed from lead ${leadData.id}`);
                }
              } else if (actionType === "create_deal") {
                const pipelineId = params.pipelineId;
                const stageId = params.stageId;
                let targetLeadId = leadData?.id || triggerContext?.leadId || null;
                const effectiveCompanyId = companyId || triggerContext?.companyId || "dcb34e9a-1510-4137-aecd-cec0c6d548c4";

                const isDealLid =
                  (triggerContext?.respondentJid && triggerContext.respondentJid.includes("@lid")) ||
                  (phoneClean && (phoneClean.length < 10 || phoneClean.length > 13));

                if (!targetLeadId && phoneClean && !isDealLid) {
                  const { data: existingLead } = await supabase
                    .from("leads")
                    .select("id")
                    .eq("company_id", effectiveCompanyId)
                    .eq("phone", phoneClean)
                    .maybeSingle();

                  if (existingLead) {
                    targetLeadId = existingLead.id;
                  } else {
                    const suffix = phoneClean.slice(-8);
                    if (suffix.length >= 8) {
                      const { data: flexLeads } = await supabase
                        .from("leads")
                        .select("id")
                        .eq("company_id", effectiveCompanyId)
                        .ilike("phone", `%${suffix}`)
                        .limit(1);
                      if (flexLeads && flexLeads.length > 0) {
                        targetLeadId = flexLeads[0].id;
                      }
                    }
                  }

                  if (!targetLeadId && !isDealLid) {
                    const leadName = triggerContext?.respondentName || null;
                    const { data: newLead } = await supabase
                      .from("leads")
                      .insert({
                        company_id: effectiveCompanyId,
                        name: leadName,
                        phone: phoneClean,
                        source_name: "Criar Negócio (Workflow)",
                      })
                      .select("id")
                      .single();

                    if (newLead) {
                      targetLeadId = newLead.id;
                    }
                  }
                }

                if (pipelineId && stageId && targetLeadId && !isDealLid) {
                  // Check if an open deal already exists for this lead in this pipeline
                  const { data: existingDeals } = await supabase
                    .from("deals")
                    .select("id")
                    .eq("company_id", effectiveCompanyId)
                    .eq("lead_id", targetLeadId)
                    .eq("pipeline_id", pipelineId)
                    .limit(1);

                  if (existingDeals && existingDeals.length > 0) {
                    affectedDealIds.push(existingDeals[0].id);
                    console.log(`[ExecuteMessage] ℹ️ Deal ${existingDeals[0].id} already exists for lead ${targetLeadId} in pipeline ${pipelineId}`);
                  } else {
                    const dealTitle = (params.title && params.title.trim() !== "") ? params.title : `Negócio - ${leadData?.name || triggerContext?.respondentName || phoneClean}`;
                    const dealValue = Number(params.value) || 0;
                    const assigneeId = params.assigneeId || leadData?.owner_id || null;

                    const { data: createdDeal, error: dealErr } = await supabase
                      .from("deals")
                      .insert({
                        company_id: effectiveCompanyId,
                        lead_id: targetLeadId,
                        pipeline_id: pipelineId,
                        stage_id: stageId,
                        title: dealTitle,
                        value: dealValue,
                        owner_id: assigneeId || null,
                        status: "open",
                      })
                      .select()
                      .single();

                    if (createdDeal) {
                      affectedDealIds.push(createdDeal.id);
                      console.log(`[ExecuteMessage] 💼 Deal ${createdDeal.id} created for lead ${targetLeadId} in pipeline ${pipelineId}`);
                      // Auto-dispatch downstream workflows listening to pipeline_changed
                      dispatchDealWorkflows(supabase, supabaseUrl, supabaseServiceKey, {
                        dealId: createdDeal.id,
                        pipelineId: pipelineId,
                        stageId: stageId,
                        leadId: targetLeadId,
                        leadName: leadData?.name || triggerContext?.respondentName,
                        leadPhone: phoneClean || leadData?.phone,
                        companyId: effectiveCompanyId,
                      });
                    } else if (dealErr) {
                      console.error(`[ExecuteMessage] ❌ Error creating deal:`, dealErr);
                    }
                  }
                }
              } else if (actionType === "move_deal_stage") {
                const targetStageId = params.stageId || params.stage_id;
                const targetPipelineId = params.pipelineId;
                const unifyDeals = params.unify_deals !== false;
                let targetLeadId = leadData?.id || triggerContext?.leadId || null;

                if (!targetLeadId && phoneClean) {
                  const { data: existingLead } = await supabase
                    .from("leads")
                    .select("id")
                    .eq("company_id", companyId)
                    .eq("phone", phoneClean)
                    .maybeSingle();
                  if (existingLead) targetLeadId = existingLead.id;
                }

                if (targetLeadId && targetStageId) {
                  // Buscar todos os negócios abertos do lead, ordenados pelo MAIS ANTIGO primeiro (created_at ASC)
                  const { data: allDeals } = await supabase
                    .from("deals")
                    .select("id, pipeline_id, created_at")
                    .eq("company_id", companyId)
                    .eq("lead_id", targetLeadId)
                    .eq("status", "open")
                    .order("created_at", { ascending: true });

                  if (allDeals && allDeals.length > 0) {
                    const oldestDeal = allDeals[0]; // Mantém o negócio original mais antigo
                    const duplicateDeals = allDeals.slice(1); // Negócios mais novos/recentes a excluir

                    const updatePayload: Record<string, any> = { stage_id: targetStageId };
                    if (targetPipelineId) updatePayload.pipeline_id = targetPipelineId;
                    await supabase.from("deals").update(updatePayload).eq("id", oldestDeal.id);
                    affectedDealIds.push(oldestDeal.id);
                    console.log(`[ExecuteMessage] 🔄 Deal mais antigo ${oldestDeal.id} movido para etapa ${targetStageId}`);

                    // Se unificação estiver ativa e houver múltiplos negócios abertos, exclui os mais recentes
                    if (unifyDeals && duplicateDeals.length > 0) {
                      const dupIds = duplicateDeals.map((d: any) => d.id);
                      await supabase.from("deals").delete().in("id", dupIds);
                      console.log(`[ExecuteMessage] 🗑️ Unificação: excluídos ${dupIds.length} negócios mais recentes duplicados:`, dupIds);
                    }

                    // Auto-dispatch downstream workflows listening to pipeline_changed
                    dispatchDealWorkflows(supabase, supabaseUrl, supabaseServiceKey, {
                      dealId: oldestDeal.id,
                      pipelineId: targetPipelineId || oldestDeal.pipeline_id,
                      stageId: targetStageId,
                      leadId: targetLeadId,
                      leadName: leadData?.name || triggerContext?.respondentName,
                      leadPhone: phoneClean || leadData?.phone,
                      companyId: companyId,
                    });
                  }
                }
              } else if (actionType === "win_deal") {
                await supabase
                  .from("deals")
                  .update({ status: "won", won_at: new Date().toISOString() })
                  .eq("company_id", companyId)
                  .eq("lead_id", leadData.id)
                  .eq("status", "open");
                console.log(`[ExecuteMessage] Deals won for lead ${leadData.id}`);
              } else if (actionType === "lose_deal") {
                await supabase
                  .from("deals")
                  .update({ status: "lost", lost_at: new Date().toISOString() })
                  .eq("company_id", companyId)
                  .eq("lead_id", leadData.id)
                  .eq("status", "open");
                console.log(`[ExecuteMessage] Deals lost for lead ${leadData.id}`);
              } else if (actionType === "restore_deal") {
                await supabase
                  .from("deals")
                  .update({ status: "open", won_at: null, lost_at: null })
                  .eq("company_id", companyId)
                  .eq("lead_id", leadData.id);
                console.log(`[ExecuteMessage] Deals restored for lead ${leadData.id}`);
              } else if (actionType === "transfer_deal_assignee") {
                const assigneeId = params.assigneeId;
                if (assigneeId) {
                  await supabase.from("deals").update({ owner_id: assigneeId }).eq("company_id", companyId).eq("lead_id", leadData.id);
                }
              } else if (actionType === "remove_deal_assignee") {
                await supabase.from("deals").update({ owner_id: null }).eq("company_id", companyId).eq("lead_id", leadData.id);
              } else if (actionType === "delete_deal") {
                if (params.confirmed !== false) {
                  await supabase.from("deals").delete().eq("company_id", companyId).eq("lead_id", leadData.id);
                  console.log(`[ExecuteMessage] 🗑️ Deals deleted for lead ${leadData.id}`);
                }
              }
            }
          }

          await logNodeExecution(supabase, {
            executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
            status: "success", startedAt: nodeStartedAt,
            input: { actionType, parameters: params },
            output: { affectedLeadIds },
          });

          const nextConn = connections.find(c => c.source_node_id === node.id);
          currentNodeId = nextConn ? nextConn.target_node_id : null;
          nodesProcessed++;
          continue;
        }

        // ============= TRIGGER WORKFLOW (Ativar outro fluxo) =============
        if (node.node_type === "trigger_workflow") {
          const nodeConfig = node.config || {};
          let targetWorkflowId = (nodeConfig.targetWorkflowId as string) || (nodeConfig.workflowId as string) || (nodeConfig.sequenceId as string);
          const targetWorkflowName = (nodeConfig.targetWorkflowName as string) || (nodeConfig.workflowName as string) || "Workflow de Destino";
          const companyId = typedCampaign.company_id || triggerContext?.companyId;

          console.log(`[ExecuteMessage] 🚀 Executando nó trigger_workflow: acionando "${targetWorkflowName}" (${targetWorkflowId})`);

          if (!targetWorkflowId) {
            console.warn(`[ExecuteMessage] ⚠️ Nó trigger_workflow ${node.id} sem targetWorkflowId configurado. Pulando para o próximo nó.`);
            await logNodeExecution(supabase, {
              executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
              status: "skipped", startedAt: nodeStartedAt,
              input: { targetWorkflowId, targetWorkflowName },
              output: { message: "Nenhum workflow de destino configurado" },
            });
            const nextConn = connections.find(c => c.source_node_id === node.id);
            currentNodeId = nextConn ? nextConn.target_node_id : null;
            nodesProcessed++;
            continue;
          }

          // Se targetWorkflowId for o ID da tabela workflow_definitions, resolver o source_id correspondente
          try {
            const { data: wfDef } = await supabase
              .from("workflow_definitions")
              .select("id, source_id, name, status")
              .eq("id", targetWorkflowId)
              .maybeSingle();

            if (wfDef?.source_id) {
              console.log(`[ExecuteMessage] 🔗 Resolvido workflow_definitions (${wfDef.name}) -> source_id: ${wfDef.source_id}`);
              targetWorkflowId = wfDef.source_id;
            }
          } catch (wfErr) {
            console.warn(`[ExecuteMessage] Aviso ao resolver workflow_definition:`, wfErr);
          }

          // Disparar o novo fluxo para cada destino ativo
          const triggeredResults: Array<{ destPhone: string; success: boolean; data?: any; error?: string }> = [];

          for (const dest of activeDestinations) {
            const rawPhone = triggerContext?.respondentPhone || (dest.isPrivate ? dest.group_jid.split("@")[0] : "");
            const phoneClean = rawPhone ? rawPhone.replace(/\D/g, "") : dest.group_jid.split("@")[0].replace(/\D/g, "");

            try {
              const triggerUrl = `${supabaseUrl}/functions/v1/trigger-sequence`;
              const response = await fetch(triggerUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  sequenceId: targetWorkflowId,
                  phone: phoneClean,
                  group_jid: dest.isPrivate ? undefined : dest.group_jid,
                  companyId: companyId,
                  userId: userId || typedCampaign.user_id,
                  skipDedupe: true,
                  triggerContext: {
                    ...triggerContext,
                    parentWorkflowId: effectiveSequenceId,
                    parentExecutionId: workflowExecutionId,
                    parentNodeId: node.id,
                    respondentPhone: phoneClean,
                    respondentName: triggerContext?.respondentName || dest.group_name || phoneClean,
                    instanceId: activeInstanceId || triggerContext?.instanceId,
                  },
                }),
              });

              const resultText = await response.text();
              let resultJson: any = null;
              try {
                resultJson = JSON.parse(resultText);
              } catch (_) {
                resultJson = { raw: resultText };
              }

              if (response.ok) {
                console.log(`[ExecuteMessage] ✅ Workflow ${targetWorkflowId} ativado com sucesso para ${phoneClean}`);
                triggeredResults.push({ destPhone: phoneClean, success: true, data: resultJson });
              } else {
                console.error(`[ExecuteMessage] ❌ Falha ao acionar workflow ${targetWorkflowId} para ${phoneClean}:`, resultText);
                triggeredResults.push({ destPhone: phoneClean, success: false, error: resultText });
              }
            } catch (callErr: any) {
              console.error(`[ExecuteMessage] ❌ Erro ao chamar trigger-sequence:`, callErr);
              triggeredResults.push({ destPhone: phoneClean, success: false, error: callErr?.message || "Network error" });
            }
          }

          await logNodeExecution(supabase, {
            executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
            status: triggeredResults.some(r => r.success) ? "success" : "failed",
            startedAt: nodeStartedAt,
            input: { targetWorkflowId, targetWorkflowName },
            output: { results: triggeredResults },
          });

          // Segue para a próxima conexão configurada
          const nextConn = connections.find(c => c.source_node_id === node.id);
          currentNodeId = nextConn ? nextConn.target_node_id : null;
          nodesProcessed++;
          continue;
        }

        // ============= FIELD OPERATION NODES =============
        if (node.node_type === "field_op") {
          const nodeConfig = node.config || {};
          let mappings = nodeConfig.mappings as Array<{
            source: string;
            targetType: string;
            targetField: string;
            transform?: string;
          }> | undefined;

          // Backward compatibility check: if no new mappings but old field config exists
          if (!mappings && nodeConfig.field) {
            const op = nodeConfig.operation || "set";
            let sourceVal = "";
            if (op === "set") {
              sourceVal = String(nodeConfig.value || "");
            } else if (op === "copy" || op === "transform") {
              sourceVal = String(nodeConfig.sourceField || "");
            } else if (op === "concatenate") {
              sourceVal = (nodeConfig.parts as string[] || []).join(nodeConfig.separator as string || "");
            }
            
            mappings = [{
              source: sourceVal,
              targetType: "lead",
              targetField: nodeConfig.field as string,
              transform: op === "transform" ? (nodeConfig.transformType as string) : undefined
            }];
          }

          const affectedLeadIds: string[] = [];
          const affectedDealIds: string[] = [];
          const webhookPayload = triggerContext?.webhookPayload as Record<string, any> | undefined;

          if (mappings && mappings.length > 0) {
            for (const dest of activeDestinations) {
              let phoneClean = dest.group_jid.split("@")[0].replace(/\D/g, "");
              const candidatePhone = triggerContext?.respondentPhone ? triggerContext.respondentPhone.replace(/\D/g, "") : phoneClean;

              // 0. Pre-fetch target lead if available, so its properties are available as variables
              let targetLead: any = null;
              if (triggerContext?.leadId) {
                const { data: leadData } = await supabase
                  .from("leads")
                  .select("id, name, phone, email, company_name, document, source_type, tags, custom_fields")
                  .eq("id", triggerContext.leadId)
                  .maybeSingle();
                targetLead = leadData;
              } else if (candidatePhone) {
                const suffix = candidatePhone.slice(-8);
                const { data: leadData } = await supabase
                  .from("leads")
                  .select("id, name, phone, email, company_name, document, source_type, tags, custom_fields")
                  .eq("company_id", typedCampaign.company_id || typedCampaign.company_id)
                  .or(`phone.eq.${candidatePhone},phone.ilike.%${suffix}`)
                  .maybeSingle();
                targetLead = leadData;
              }

              if (targetLead && triggerContext) {
                triggerContext.leadId = targetLead.id;
                if (!triggerContext.respondentName && targetLead.name) triggerContext.respondentName = targetLead.name;
                if (!triggerContext.respondentPhone && targetLead.phone) triggerContext.respondentPhone = targetLead.phone;
                if (!triggerContext.customFields) triggerContext.customFields = {};
                triggerContext.customFields["name"] = targetLead.name || "";
                triggerContext.customFields["nome"] = targetLead.name || "";
                triggerContext.customFields["phone"] = targetLead.phone || "";
                triggerContext.customFields["telefone"] = targetLead.phone || "";
                triggerContext.customFields["email"] = targetLead.email || "";
                triggerContext.customFields["document"] = targetLead.document || "";
                triggerContext.customFields["company_name"] = targetLead.company_name || "";
                triggerContext.customFields["empresa"] = targetLead.company_name || "";
                if (targetLead.custom_fields && typeof targetLead.custom_fields === "object") {
                  for (const [cfKey, cfVal] of Object.entries(targetLead.custom_fields)) {
                    triggerContext.customFields[cfKey] = cfVal;
                    triggerContext.customFields[`custom_fields.${cfKey}`] = cfVal;
                  }
                }
              }
              
              // 1. Compute mappings
              const leadUpdates: Record<string, any> = {};
              const cfUpdates: Record<string, any> = {};
              const dealUpdates: Record<string, any> = {};
              let newTags: string[] | null = null;
              let leadUpdated = false;

              for (const mapping of mappings) {
                // Resolve source value
                let rawVal = "";
                let cleanSource = (mapping.source || "").trim();

                // If only a single raw webhook property (e.g. body.campo) without brackets
                if (cleanSource && !cleanSource.includes("{") && webhookPayload && (cleanSource.startsWith("body.") || cleanSource.startsWith("headers.") || cleanSource.startsWith("query_params.") || cleanSource === "method")) {
                  rawVal = getValueFromPath(webhookPayload, cleanSource);
                } else {
                  // Resolve all variables (name, phone, userResponse, body.xxx, custom_fields) in the manual text
                  rawVal = replaceVariables(mapping.source || "");
                  console.log(`[ExecuteMessage] Resolved field_op source: "${mapping.source}" => "${rawVal}"`);
                }

                // Apply transformations
                if (mapping.transform === "uppercase") {
                  rawVal = rawVal.toUpperCase();
                } else if (mapping.transform === "lowercase") {
                  rawVal = rawVal.toLowerCase();
                } else if (mapping.transform === "trim") {
                  rawVal = rawVal.replace(/\s+/g, " ").trim();
                } else if (mapping.transform === "capitalize") {
                  rawVal = rawVal.replace(/\b\w/g, (c) => c.toUpperCase());
                } else if (mapping.transform === "numbers_only") {
                  rawVal = rawVal.replace(/\D/g, "");
                } else if (mapping.transform === "format_phone_br") {
                  let onlyNums = rawVal.replace(/\D/g, "");
                  if (onlyNums.length >= 10 && !onlyNums.startsWith("55")) {
                    onlyNums = "55" + onlyNums;
                  }
                  rawVal = onlyNums;
                }

                // Normalization for phone
                if (mapping.targetField === "phone" || mapping.targetField?.endsWith(".phone")) {
                  rawVal = rawVal.replace(/\D/g, "");
                }
                let targetType = mapping.targetType;
                let targetField = mapping.targetField || "";
                
                // If targetType is missing, infer it from targetField (e.g., 'lead.name' -> type 'lead', field 'name')
                if (!targetType && targetField.includes('.')) {
                  const parts = targetField.split('.');
                  targetType = parts[0];
                  targetField = parts.slice(1).join('.');
                }

                // Process target updates
                if (targetType === "lead") {
                  const fieldKey = targetField;
                  if (fieldKey.startsWith("custom_fields.")) {
                    const cfKey = fieldKey.substring("custom_fields.".length);
                    cfUpdates[cfKey] = rawVal;
                    leadUpdated = true;
                    
                    if (!triggerContext.customFields) triggerContext.customFields = {};
                    (triggerContext.customFields as Record<string, string>)[cfKey] = rawVal;
                    (triggerContext.customFields as Record<string, string>)[`custom_fields.${cfKey}`] = rawVal;
                  } else if (fieldKey.startsWith("custom.")) {
                    const cfKey = fieldKey.substring("custom.".length).replace(/^lead\./, "");
                    cfUpdates[cfKey] = rawVal;
                    leadUpdated = true;
                    if (!triggerContext.customFields) triggerContext.customFields = {};
                    (triggerContext.customFields as Record<string, string>)[cfKey] = rawVal;
                    (triggerContext.customFields as Record<string, string>)[`custom_fields.${cfKey}`] = rawVal;
                  } else if (["name", "phone", "email", "company_name", "document", "source"].includes(fieldKey)) {
                    leadUpdates[fieldKey] = rawVal;
                    leadUpdated = true;
                    
                    if (!triggerContext.customFields) triggerContext.customFields = {};
                    (triggerContext.customFields as Record<string, string>)[`lead.${fieldKey}`] = rawVal;
                    if (fieldKey === "name") {
                      triggerContext.respondentName = rawVal;
                      (triggerContext.customFields as Record<string, string>)["name"] = rawVal;
                    }
                    if (fieldKey === "phone") {
                      triggerContext.respondentPhone = rawVal;
                      (triggerContext.customFields as Record<string, string>)["phone"] = rawVal;
                      // Update the active destination and phoneClean for fetching lead
                      phoneClean = rawVal;
                      if (dest.isPrivate) {
                        dest.group_jid = `${rawVal}@s.whatsapp.net`;
                        (dest as any).respondentJid = `${rawVal}@s.whatsapp.net`;
                      }
                    }
                  } else if (fieldKey === "tags") {
                    newTags = rawVal.split(",").map((t: string) => t.trim()).filter(Boolean);
                    leadUpdated = true;
                  } else {
                    cfUpdates[fieldKey] = rawVal;
                    leadUpdated = true;
                    if (!triggerContext.customFields) triggerContext.customFields = {};
                    (triggerContext.customFields as Record<string, string>)[fieldKey] = rawVal;
                    (triggerContext.customFields as Record<string, string>)[`custom_fields.${fieldKey}`] = rawVal;
                  }
                } else if (targetType === "custom") {
                  let cfKey = targetField;
                  if (cfKey.startsWith("lead.")) {
                    cfKey = cfKey.substring("lead.".length);
                  }
                  cfUpdates[cfKey] = rawVal;
                  leadUpdated = true;
                  if (!triggerContext.customFields) triggerContext.customFields = {};
                  (triggerContext.customFields as Record<string, string>)[cfKey] = rawVal;
                  (triggerContext.customFields as Record<string, string>)[`custom_fields.${cfKey}`] = rawVal;
                  (triggerContext.customFields as Record<string, string>)[`custom.lead.${cfKey}`] = rawVal;
                } else if (targetType === "deal") {
                  const dealField = targetField;
                  if (dealField === "title") dealUpdates.title = rawVal;
                  else if (dealField === "value") dealUpdates.value = Number(rawVal) || 0;
                  else if (dealField === "pipeline_id") dealUpdates.pipeline_id = rawVal || null;
                  else if (dealField === "stage_id") dealUpdates.stage_id = rawVal || null;
                } else if (targetType === "conversation") {
                  if (targetField === "phone") {
                    triggerContext.respondentPhone = rawVal;
                    // Also update dest and phoneClean so the lead lookup uses the mapped phone
                    phoneClean = rawVal;
                    if (dest.isPrivate) {
                      dest.group_jid = `${rawVal}@s.whatsapp.net`;
                    }
                  }
                } else if (targetType === "variable") {
                  if (!triggerContext.customFields) triggerContext.customFields = {};
                  (triggerContext.customFields as Record<string, string>)[targetField] = rawVal;
                }
              }

              // Auto-create lead if not exists yet so custom fields are saved
              if (!targetLead && (phoneClean || triggerContext?.respondentPhone)) {
                const effectivePhone = phoneClean || triggerContext?.respondentPhone;
                const { data: newLead } = await supabase
                  .from("leads")
                  .insert({
                    company_id: typedCampaign.company_id || triggerContext?.companyId,
                    phone: effectivePhone,
                    name: triggerContext?.respondentName || effectivePhone,
                    custom_fields: {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .select("id, name, phone, email, company_name, document, source_type, tags, custom_fields")
                  .maybeSingle();
                targetLead = newLead;
                if (targetLead && triggerContext) {
                  triggerContext.leadId = targetLead.id;
                }
              }

              // 3. Apply updates to the lead and deal if lead exists
              if (targetLead) {
                affectedLeadIds.push(targetLead.id);
                const currentCf = { ...((targetLead.custom_fields as Record<string, any>) || {}) };
                Object.assign(currentCf, cfUpdates);

                if (newTags && newTags.length > 0) {
                  const existingTags = Array.isArray(targetLead.tags) ? targetLead.tags : [];
                  leadUpdates.tags = Array.from(new Set([...existingTags, ...newTags]));
                }

                if (leadUpdated) {
                  const finalLeadUpdates = { ...leadUpdates };
                  if (Object.keys(cfUpdates).length > 0) {
                    finalLeadUpdates.custom_fields = currentCf;
                  }
                  await supabase
                    .from("leads")
                    .update(finalLeadUpdates)
                    .eq("id", targetLead.id);
                  console.log(`[ExecuteMessage] 📝 Updated lead ${targetLead.id} in field_op`);
                }

                if (Object.keys(dealUpdates).length > 0) {
                  // Update or create CRM Deal
                  const { data: existingDeal } = await supabase
                    .from("deals")
                    .select("id, title, value, pipeline_id, stage_id")
                    .eq("lead_id", targetLead.id)
                    .eq("company_id", typedCampaign.company_id || typedCampaign.company_id)
                    .eq("status", "open")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (existingDeal) {
                    await supabase
                      .from("deals")
                      .update(dealUpdates)
                      .eq("id", existingDeal.id);
                    affectedDealIds.push(existingDeal.id);

                    if (dealUpdates.stage_id || dealUpdates.pipeline_id) {
                      dispatchDealWorkflows(supabase, supabaseUrl, supabaseServiceKey, {
                        dealId: existingDeal.id,
                        pipelineId: dealUpdates.pipeline_id || existingDeal.pipeline_id,
                        stageId: dealUpdates.stage_id || existingDeal.stage_id,
                        leadId: targetLead.id,
                        leadName: targetLead.name,
                        leadPhone: targetLead.phone,
                        companyId: typedCampaign.company_id,
                      });
                    }
                  } else {
                    const { data: newDeal } = await supabase
                      .from("deals")
                      .insert({
                        company_id: typedCampaign.company_id || typedCampaign.company_id,
                        lead_id: targetLead.id,
                        title: dealUpdates.title || `Negócio ${targetLead.name || targetLead.phone}`,
                        value: dealUpdates.value || 0,
                        pipeline_id: dealUpdates.pipeline_id || null,
                        stage_id: dealUpdates.stage_id || null,
                        status: "open"
                      })
                      .select("id")
                      .single();
                    if (newDeal) {
                      affectedDealIds.push(newDeal.id);
                      if (dealUpdates.stage_id || dealUpdates.pipeline_id) {
                        dispatchDealWorkflows(supabase, supabaseUrl, supabaseServiceKey, {
                          dealId: newDeal.id,
                          pipelineId: dealUpdates.pipeline_id,
                          stageId: dealUpdates.stage_id,
                          leadId: targetLead.id,
                          leadName: targetLead.name,
                          leadPhone: targetLead.phone,
                          companyId: typedCampaign.company_id,
                        });
                      }
                    }
                  }
                }
              }


            }
          }

          await logNodeExecution(supabase, {
            executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
            status: "success", startedAt: nodeStartedAt,
            input: { mappings },
            output: { affectedLeadIds, affectedDealIds },
          });
          const nextConn = connections.find(c => c.source_node_id === node.id);
          currentNodeId = nextConn ? nextConn.target_node_id : null;
          nodesProcessed++;
          continue;
        }

        // ============= CONDITION / FORK NODES =============
        if (node.node_type === "condition") {
          let leadData: any = null;
          const companyId = typedCampaign.company_id || typedCampaign.company_id;

          const ctxLeadId = triggerContext?.leadId || triggerContext?.lead_id || triggerContext?.contactId;
          const ctxPhone = triggerContext?.contactPhone || triggerContext?.respondentPhone || triggerContext?.phone;

          if (ctxLeadId) {
            const { data } = await supabase
              .from("leads")
              .select("*")
              .eq("id", ctxLeadId)
              .maybeSingle();

            if (data) leadData = data;
          }

          if (!leadData && ctxPhone) {
            const cleanCtxPhone = (ctxPhone as string).replace(/\D/g, "");
            if (cleanCtxPhone) {
              let query = supabase.from("leads").select("*").limit(1);
              const suffix = cleanCtxPhone.slice(-8);
              if (suffix.length >= 8) {
                query = query.or(`phone.eq.${cleanCtxPhone},phone.ilike.%${suffix}`);
              } else {
                query = query.eq("phone", cleanCtxPhone);
              }
              if (companyId) {
                query = query.or(`company_id.eq.${companyId},company_id.is.null`);
              }
              const { data: dbLeads } = await query;
              if (dbLeads && dbLeads.length > 0) {
                leadData = dbLeads[0];
              }
            }
          }

          if (!leadData && activeDestinations.length > 0) {
            const dest = activeDestinations[0];
            const phoneClean = dest.group_jid.split("@")[0].replace(/\D/g, "");
            if (phoneClean) {
              let query = supabase.from("leads").select("*").limit(1);
              const suffix = phoneClean.slice(-8);
              if (suffix.length >= 8) {
                query = query.or(`phone.eq.${phoneClean},phone.ilike.%${suffix}`);
              } else {
                query = query.eq("phone", phoneClean);
              }
              if (companyId) {
                query = query.or(`company_id.eq.${companyId},company_id.is.null`);
              }
              const { data: dbLeads } = await query;
              if (dbLeads && dbLeads.length > 0) {
                leadData = dbLeads[0];
              }
            }
          }

          const rules = (Array.isArray(node.config.rules) && node.config.rules.length > 0)
            ? (node.config.rules as any[])
            : node.config.conditionType
            ? [{ id: "yes", category: node.config.category, conditionType: node.config.conditionType, parameters: node.config.parameters }]
            : [];

          let matched = false;
          let branch = "fallback";
          let matchedRuleId: string | null = null;

          if (rules.length > 0) {
            for (const rule of rules) {
              const ruleResult = await evaluateExtensibleCondition(
                { conditionType: rule.conditionType, parameters: rule.parameters },
                leadData,
                supabase,
                companyId,
                triggerContext
              );
              if (ruleResult.matched) {
                matched = true;
                matchedRuleId = rule.id || null;
                branch = rule.id || ruleResult.branch || "yes";
                break;
              }
            }
          } else {
            const singleResult = await evaluateExtensibleCondition(
              node.config,
              leadData,
              supabase,
              companyId,
              triggerContext
            );
            matched = singleResult.matched;
            branch = singleResult.branch;
          }

          console.log(`[ExecuteMessage] Extensible condition node ${node.id} evaluated as: ${matched} (${branch} branch, matchedRuleId=${matchedRuleId})`);

          await logNodeExecution(supabase, {
            executionId: workflowExecutionId,
            userId,
            nodeId: node.id,
            nodeType: node.node_type,
            status: "success",
            startedAt: nodeStartedAt,
            input: node.config,
            output: {
              result: matched,
              branch,
              category: node.config.category || "lead",
              condition: node.config.conditionType || "legacy",
            },
          });

          let matchConn = connections.find(c =>
            c.source_node_id === node.id && (
              c.condition_path === branch ||
              (matchedRuleId && c.condition_path === matchedRuleId) ||
              (matched && (c.condition_path === "yes" || c.condition_path === "true" || c.condition_path === "found" || c.condition_path === "matched")) ||
              (!matched && (c.condition_path === "no" || c.condition_path === "false" || c.condition_path === "not_found" || c.condition_path === "not_matched" || c.condition_path === "fallback"))
            )
          );

          if (!matchConn && !matched) {
            matchConn = connections.find(c =>
              c.source_node_id === node.id && (c.condition_path === "fallback" || c.condition_path === "no" || c.condition_path === "not_found" || c.condition_path === null)
            );
          }

          currentNodeId = matchConn ? matchConn.target_node_id : null;
          nodesProcessed++;
          continue;
        }

        // ============= RANDOMIZER NODES =============
        if (node.node_type === "randomizer") {
          const randomizerConfig = node.config as { mode?: string; branches?: Array<{ id: string; label: string; weight: number; position: number }> };
          const mode = randomizerConfig.mode || "weighted_random";
          const branches = (randomizerConfig.branches || []).slice().sort((a, b) => a.position - b.position);

          let selectedBranchId: string | null = null;
          let selectedWeight: number | undefined;

          if (branches.length > 0) {
            if (mode === "round_robin") {
              const branchIds = branches.map(b => b.id);
              const { data: rpcResult, error: rpcError } = await supabase.rpc("get_next_randomizer_branch", {
                p_company_id: typedCampaign.company_id || typedCampaign.company_id,
                p_sequence_id: effectiveSequenceId,
                p_node_id: node.id,
                p_branch_ids: branchIds,
              });
              if (rpcError) {
                console.error(`[ExecuteMessage] Randomizer RPC failed for node ${node.id}, falling back to first branch:`, rpcError);
              }
              selectedBranchId = (rpcResult as string) || branches[0].id;
            } else {
              // weighted_random: pure in-memory weighted pick, no persisted state
              const total = branches.reduce((sum, b) => sum + (Number(b.weight) || 0), 0) || 100;
              const r = Math.random() * total;
              let acc = 0;
              for (const b of branches) {
                acc += Number(b.weight) || 0;
                if (r < acc) { selectedBranchId = b.id; break; }
              }
              selectedBranchId = selectedBranchId || branches[branches.length - 1].id;
            }
            selectedWeight = branches.find(b => b.id === selectedBranchId)?.weight;
          }

          const selectedBranchLabel = branches.find(b => b.id === selectedBranchId)?.label || null;
          console.log(`[ExecuteMessage] Randomizer node ${node.id} (${mode}) selected branch: ${selectedBranchId} (${selectedBranchLabel})`);

          await logNodeExecution(supabase, {
            executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
            status: "success", startedAt: nodeStartedAt,
            input: node.config,
            output: {
              mode,
              selectedBranchId,
              selectedBranchLabel,
              branch: selectedBranchId, // mirrors condition node's output.branch field so branch-coloring in ExecutionCanvas works unchanged
              ...(mode === "weighted_random" ? { selectedWeight } : {}),
            },
          });

          const matchConn = connections.find(c => c.source_node_id === node.id && c.condition_path === selectedBranchId);
          currentNodeId = matchConn ? matchConn.target_node_id : null;
          nodesProcessed++;
          continue;
        }

        // Handle DELAY nodes
        if (node.node_type === "delay") {
          const normalized = normalizeDelayConfig(node.config);
          const delayMs = normalized.delayMs;
          const resumeAt = new Date(nodeStartedAt.getTime() + delayMs);
          const nextConn = connections.find(c => c.source_node_id === node.id);
          const nextNodeId = nextConn ? nextConn.target_node_id : null;
          const nextNodeIndex = nextNodeId ? sortedNodes.findIndex(n => n.id === nextNodeId) : nodesProcessed + 1;

          const delayOutput = {
            delay: {
              delayMs,
              value: normalized.value,
              unit: normalized.unit,
              startedAt: nodeStartedAt.toISOString(),
              resumeAt: resumeAt.toISOString()
            },
            context: triggerContext || {}
          };
          
          if (delayMs > MAX_DELAY_MS) {
            // Save execution state
            const { data: savedExecution, error: saveError } = await supabase
              .from("sequence_executions")
              .upsert({
                id: workflowExecutionId, // reuse the same id as workflow_executions so resume can correlate them
                user_id: userId,
                campaign_id: effectiveCampaignId,
                sequence_id: effectiveSequenceId,
                message_id: typedMessage?.id || null,
                current_node_id: nextNodeId,
                current_node_index: nextNodeIndex >= 0 ? nextNodeIndex : nodesProcessed + 1,
                trigger_context: {
                  ...(triggerContext || {}),
                  instanceId: activeInstanceId,
                  resumeNodeId: nextNodeId,
                  waitingType: "delay",
                  delayNodeId: node.id,
                  delayFormatted: `${normalized.value} ${normalized.unit === 'seconds' ? 'segundos' : normalized.unit === 'minutes' ? 'minutos' : normalized.unit === 'hours' ? 'horas' : normalized.unit === 'days' ? 'dias' : normalized.unit}`,
                  delayDurationMs: delayMs,
                },
                nodes_data: sortedNodes,
                destinations: activeDestinations,
                status: "paused",
                resume_at: resumeAt.toISOString(),
                nodes_processed: nodesProcessed + 1,
                nodes_failed: nodesFailed,
              })
              .select()
              .single();
            
            if (saveError) {
              console.error("[ExecuteMessage] Failed to save execution state:", saveError);
              // Continue with capped delay as fallback
              const effectiveDelay = Math.min(delayMs, MAX_DELAY_MS);
              console.log(`[ExecuteMessage] ⏱️ Fallback: waiting ${effectiveDelay}ms`);
              await new Promise(resolve => setTimeout(resolve, effectiveDelay));
            } else {
              console.log(`[ExecuteMessage] ✅ Execution ${savedExecution.id} paused, will resume at ${resumeAt.toISOString()}`);

              await logNodeExecution(supabase, {
                executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
                status: "success", startedAt: nodeStartedAt,
                input: node.config, output: delayOutput,
              });
              await supabase.from("workflow_executions")
                .update({ status: "waiting" })
                .eq("id", workflowExecutionId);

              // Return partial response
              const totalTimeMs = Date.now() - startTime;
              return new Response(
                JSON.stringify({
                  success: true,
                  status: "paused",
                  executionId: savedExecution.id,
                  resumeAt: resumeAt.toISOString(),
                  nodesProcessed: nodesProcessed + 1,
                  nodesFailed,
                  totalTimeMs,
                  message: `Execution paused. Will resume in ${Math.round(delayMs / 60000)} minutes.`,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } else if (delayMs > 0) {
            console.log(`[ExecuteMessage] ⏱️ Short delay: waiting ${delayMs}ms`);
            accumulatedDelayMs += delayMs;
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }

          await logNodeExecution(supabase, {
            executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
            status: "success", startedAt: nodeStartedAt,
            input: node.config, output: delayOutput,
          });
          currentNodeId = nextNodeId;
          nodesProcessed++;
          continue;
        }

        if (node.node_type === "group_management") {
          const actions = (node.config.actions as any[]) || [];
          const targetMode = node.config.targetMode || "workflow_groups";
          
          let targets = effectiveDests;

          const replaceDeep = (val: unknown): unknown => {
            if (typeof val === "string") return replaceVariables(val);
            if (Array.isArray(val)) return val.map(replaceDeep);
            if (val && typeof val === "object") {
              return Object.fromEntries(
                Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, replaceDeep(v)])
              );
            }
            return val;
          };

          const nodeResults: Array<{ destination: string; status: string; subResults: any[] }> = [];

          for (const dest of targets) {
            const subResults = [];
            let groupFailed = false;
            for (const subAction of actions) {
              const actionName = getActionForNodeType(subAction.type);
              const formattedConfig = formatNodeConfig(subAction, subAction.type);
              const resolvedConfig = replaceDeep(formattedConfig) as Record<string, unknown>;
              Object.assign(formattedConfig, resolvedConfig);
              formattedConfig.mention_all = Boolean(subAction.mention_all ?? subAction.mentionAll ?? false);

              if (subAction.type === "delay") {
                const normalized = normalizeDelayConfig(formattedConfig);
                const effectiveDelay = Math.min(normalized.delayMs, MAX_DELAY_MS);
                if (effectiveDelay > 0) {
                  console.log(`[ExecuteMessage] ⏱️ Group management delay: waiting ${effectiveDelay}ms`);
                  accumulatedDelayMs += effectiveDelay;
                  await new Promise(resolve => setTimeout(resolve, effectiveDelay));
                }
                subResults.push({ destination: dest.group_jid, status: "success", action: "delay" });
                continue;
              }

              const payload = buildStandardPayload({
                action: actionName,
                node: { id: node.id, type: subAction.type, order: node.node_order, config: formattedConfig },
                campaign: { id: typedCampaign.id || effectiveSequenceId, name: typedCampaign.name || (typedCampaign.name || 'Workflow') },
                instance: {
                  id: activeInstanceId, name: instance.name, phone: instance.phone || "",
                  provider: instance.provider, externalId: instance.external_instance_id || instance.id || "",
                  externalToken: instance.external_instance_token || "",
                },
                destination: { jid: dest.group_jid, name: dest.group_name },
              });

              const sendStartTime = Date.now();
              const { data: logEntry } = await supabase
                .from("group_message_logs")
                .insert({
                  user_id: userId, group_campaign_id: typedCampaign.id || effectiveSequenceId,
                  sequence_id: effectiveSequenceId, node_type: subAction.type,
                  node_order: node.node_order, group_jid: dest.group_jid,
                  group_name: dest.group_name, instance_id: activeInstanceId,
                  instance_name: instance.name, campaign_name: typedCampaign.name || (typedCampaign.name || 'Workflow'),
                  status: "sending", payload,
                }).select().single();

              try {
                const result = await sendWhatsAppMessage(payload);
                const responseData = result.details || result;
                if (logEntry?.id) {
                  await supabase.from("group_message_logs").update({
                    status: result.ok ? "sent" : "failed",
                    error_message: result.ok ? null : `HTTP ${result.status}`,
                    response_time_ms: Date.now() - sendStartTime, 
                    provider_response: responseData,
                    payload: { ...payload, zapiUrl: result.requestUrl, zapiBody: result.requestBody, curl: result.curl } as any,
                  }).eq("id", logEntry.id);
                }
                
                if (result.ok) {
                  console.log(`[ExecuteMessage] ✅ Group mgmt subaction ${subAction.type} on ${dest.group_name}`);
                  webhookResponses.push({ nodeType: subAction.type, nodeOrder: node.node_order, destination: dest.group_jid, status: "sent", data: responseData });
                  subResults.push({ type: subAction.type, status: "sent" });
                } else {
                  console.log(`[ExecuteMessage] ❌ Group mgmt subaction ${subAction.type} failed: HTTP ${result.status}`);
                  webhookResponses.push({ nodeType: subAction.type, nodeOrder: node.node_order, destination: dest.group_jid, status: "failed", data: responseData });
                  subResults.push({ type: subAction.type, status: "failed" });
                  groupFailed = true;
                  break; // Stop further subactions for this group
                }
              } catch (err) {
                if (logEntry?.id) {
                  await supabase.from("group_message_logs").update({
                    status: "failed", error_message: err instanceof Error ? err.message : "Unknown error",
                    response_time_ms: Date.now() - sendStartTime,
                  }).eq("id", logEntry.id);
                }
                console.error(`[ExecuteMessage] ❌ Group mgmt subaction error:`, err);
                subResults.push({ type: subAction.type, status: "failed", error: err instanceof Error ? err.message : "Unknown error" });
                groupFailed = true;
                break; // Stop further subactions for this group
              }
            }
            nodeResults.push({ destination: dest.group_jid, status: groupFailed ? "failed" : "sent", subResults });
          }

          const hasErrors = nodeResults.some(r => r.status === "failed");
          if (hasErrors) nodesFailed++;
          
          await logNodeExecution(supabase, {
            executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
            status: hasErrors ? "error" : "success", startedAt: nodeStartedAt,
            input: node.config, output: { results: nodeResults },
          });

          let nextNodeId = null;
          if (hasErrors) {
             const errorConn = connections.find(c => c.source_node_id === node.id && c.source_port_id === "error");
             if (errorConn) nextNodeId = errorConn.target_node_id;
          }
          if (!nextNodeId && !hasErrors) {
             const defaultConn = connections.find(c => c.source_node_id === node.id && (!c.source_port_id || c.source_port_id === "default"));
             nextNodeId = defaultConn ? defaultConn.target_node_id : null;
          }

          if (hasErrors && !nextNodeId) {
             console.log(`[ExecuteMessage] Node ${node.id} failed without error path, aborting.`);
             break;
          }

          currentNodeId = nextNodeId;
          nodesProcessed++;
          continue;
        }


        // ============= GROUP MANAGEMENT NODES =============
        if (GROUP_MANAGEMENT_NODE_TYPES.includes(node.node_type)) {
          const action = getActionForNodeType(node.node_type);
          const formattedConfig = formatNodeConfig(node.config, node.node_type);
          
          // Recursively replace variables in all config fields
          const replaceDeep = (val: unknown): unknown => {
            if (typeof val === "string") return replaceVariables(val);
            if (Array.isArray(val)) return val.map(replaceDeep);
            if (val && typeof val === "object") {
              return Object.fromEntries(
                Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, replaceDeep(v)])
              );
            }
            return val;
          };
          const resolvedConfig = replaceDeep(formattedConfig) as Record<string, unknown>;
          Object.assign(formattedConfig, resolvedConfig);

          const nodeResults: Array<{ destination: string; status: string }> = [];

          // Group management nodes operate on linked groups (using group_jid)
          for (const dest of effectiveDests) {
            const payload = buildStandardPayload({
              action,
              node: { id: node.id, type: node.node_type, order: node.node_order, config: formattedConfig },
              campaign: { id: typedCampaign.id || effectiveSequenceId, name: typedCampaign.name || (typedCampaign.name || 'Workflow') },
              instance: {
                id: activeInstanceId, name: instance.name, phone: instance.phone || "",
                provider: instance.provider, externalId: instance.external_instance_id || instance.id || "",
                externalToken: instance.external_instance_token || "",
              },
              destination: { jid: dest.group_jid, name: dest.group_name },
            });

            const sendStartTime = Date.now();

            const { data: logEntry } = await supabase
              .from("group_message_logs")
              .insert({
                user_id: userId, group_campaign_id: typedCampaign.id || effectiveSequenceId,
                sequence_id: effectiveSequenceId, node_type: node.node_type,
                node_order: node.node_order, group_jid: dest.group_jid,
                group_name: dest.group_name, instance_id: activeInstanceId,
                instance_name: instance.name, campaign_name: typedCampaign.name || (typedCampaign.name || 'Workflow'),
                status: "sending", payload,
              })
              .select().single();

            const msgText = (formattedConfig.text || formattedConfig.content || formattedConfig.message || formattedConfig.caption || "") as string;
            const mediaUrl = (formattedConfig.url || formattedConfig.mediaUrl || formattedConfig.image || formattedConfig.fileUrl || formattedConfig.audio || formattedConfig.video || formattedConfig.document || "") as string;
            const isGroupDest = Boolean(
              dest.group_jid?.includes("@g.us") ||
              dest.group_jid?.includes("-group") ||
              !dest.isPrivate
            );
            const destPhone = isGroupDest
              ? (dest.group_jid || "")
              : (dest.group_jid ? dest.group_jid.split("@")[0] : triggerContext?.respondentPhone || "");
            const effectiveCompanyId = triggerContext?.companyId || typedCampaign?.company_id;

            // Reflete o status "enviando" imediatamente no chat (reloginho 🕒)
            let pendingChatSync: { conversationId?: string; messageId?: string } | null = null;
            if ((msgText || mediaUrl) && destPhone && effectiveCompanyId) {
              pendingChatSync = await syncSentMessageToChat(supabase, {
                companyId: effectiveCompanyId,
                instanceId: activeInstanceId,
                phone: destPhone,
                name: isGroupDest ? (dest.group_name || dest.group_jid) : (dest.group_name || triggerContext?.respondentName),
                leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                isGroup: isGroupDest,
                groupJid: isGroupDest ? dest.group_jid : undefined,
                body: msgText,
                mediaUrl: mediaUrl || null,
                messageType: node.node_type === "message" ? (mediaUrl ? "image" : "text") : node.node_type,
                mediaType: node.node_type === "message" ? (mediaUrl ? "image" : null) : node.node_type,
                status: "sending",
              });
            }

            try {
              const result = await sendWhatsAppMessage(payload);

              const responseTimeMs = Date.now() - sendStartTime;
              const responseData = result.details || result;

              if (logEntry?.id) {
                await supabase.from("group_message_logs").update({
                  status: result.ok ? "sent" : "failed",
                  error_message: result.ok ? null : `HTTP ${result.status}`,
                  response_time_ms: responseTimeMs, 
                  provider_response: responseData,
                  payload: {
                    ...payload,
                    zapiUrl: result.requestUrl,
                    zapiBody: result.requestBody,
                    curl: result.curl,
                  } as any,
                }).eq("id", logEntry.id);
              }

              if (result.ok) {
                console.log(`[ExecuteMessage] ✅ Group mgmt ${node.node_type} on ${dest.group_name}`);
                webhookResponses.push({ nodeType: node.node_type, nodeOrder: node.node_order, destination: dest.group_jid, status: "sent", data: responseData });
                nodeResults.push({ destination: dest.group_jid, status: "sent" });

                if (pendingChatSync?.messageId) {
                  await syncSentMessageToChat(supabase, {
                    chatMessageId: pendingChatSync.messageId,
                    conversationId: pendingChatSync.conversationId,
                    status: "sent",
                    externalMessageId: result.messageId || null,
                    body: msgText,
                    mediaUrl: mediaUrl || null,
                  });
                } else if ((msgText || mediaUrl) && destPhone && effectiveCompanyId) {
                  await syncSentMessageToChat(supabase, {
                    companyId: effectiveCompanyId,
                    instanceId: activeInstanceId,
                    phone: destPhone,
                    name: isGroupDest ? (dest.group_name || dest.group_jid) : (dest.group_name || triggerContext?.respondentName),
                    leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                    isGroup: isGroupDest,
                    groupJid: isGroupDest ? dest.group_jid : undefined,
                    body: msgText,
                    mediaUrl: mediaUrl || null,
                    messageType: node.node_type === "message" ? (mediaUrl ? "image" : "text") : node.node_type,
                    mediaType: node.node_type === "message" ? (mediaUrl ? "image" : null) : node.node_type,
                    externalMessageId: result.messageId || null,
                    status: "sent",
                  });
                }
              } else {
                nodesFailed++;
                console.log(`[ExecuteMessage] ❌ Group mgmt ${node.node_type} failed: HTTP ${result.status}`);
                webhookResponses.push({ nodeType: node.node_type, nodeOrder: node.node_order, destination: dest.group_jid, status: "failed", data: responseData });
                nodeResults.push({ destination: dest.group_jid, status: "failed" });

                if (pendingChatSync?.messageId) {
                  await syncSentMessageToChat(supabase, {
                    chatMessageId: pendingChatSync.messageId,
                    conversationId: pendingChatSync.conversationId,
                    status: "failed",
                    errorMessage: `HTTP ${result.status}`,
                    body: msgText,
                    mediaUrl: mediaUrl || null,
                  });
                } else if ((msgText || mediaUrl) && destPhone && effectiveCompanyId) {
                  await syncSentMessageToChat(supabase, {
                    companyId: effectiveCompanyId,
                    instanceId: activeInstanceId,
                    phone: destPhone,
                    name: isGroupDest ? (dest.group_name || dest.group_jid) : (dest.group_name || triggerContext?.respondentName),
                    leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                    isGroup: isGroupDest,
                    groupJid: isGroupDest ? dest.group_jid : undefined,
                    body: msgText,
                    mediaUrl: mediaUrl || null,
                    messageType: node.node_type === "message" ? (mediaUrl ? "image" : "text") : node.node_type,
                    mediaType: node.node_type === "message" ? (mediaUrl ? "image" : null) : node.node_type,
                    externalMessageId: null,
                    status: "failed",
                    errorMessage: `HTTP ${result.status}`,
                  });
                }
              }
            } catch (err) {
              nodesFailed++;
              const errMessage = err instanceof Error ? err.message : "Unknown error";
              if (logEntry?.id) {
                await supabase.from("group_message_logs").update({
                  status: "failed", error_message: errMessage,
                  response_time_ms: Date.now() - sendStartTime,
                }).eq("id", logEntry.id);
              }
              console.error(`[ExecuteMessage] ❌ Group mgmt error:`, err);
              nodeResults.push({ destination: dest.group_jid, status: "failed" });

              if (pendingChatSync?.messageId) {
                await syncSentMessageToChat(supabase, {
                  chatMessageId: pendingChatSync.messageId,
                  conversationId: pendingChatSync.conversationId,
                  status: "failed",
                  errorMessage: errMessage,
                  body: msgText,
                  mediaUrl: mediaUrl || null,
                });
              } else if ((msgText || mediaUrl) && destPhone && effectiveCompanyId) {
                await syncSentMessageToChat(supabase, {
                  companyId: effectiveCompanyId,
                  instanceId: activeInstanceId,
                  phone: destPhone,
                  name: isGroupDest ? (dest.group_name || dest.group_jid) : (dest.group_name || triggerContext?.respondentName),
                  leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                  isGroup: isGroupDest,
                  groupJid: isGroupDest ? dest.group_jid : undefined,
                  body: msgText,
                  mediaUrl: mediaUrl || null,
                  messageType: node.node_type === "message" ? (mediaUrl ? "image" : "text") : node.node_type,
                  mediaType: node.node_type === "message" ? (mediaUrl ? "image" : null) : node.node_type,
                  externalMessageId: null,
                  status: "failed",
                  errorMessage: errMessage,
                });
              }
            }
          }

          await logNodeExecution(supabase, {
            executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
            status: nodeResults.some(r => r.status === "failed") ? "error" : "success", startedAt: nodeStartedAt,
            input: formattedConfig, output: { results: nodeResults },
          });
          const nextConn = connections.find(c => c.source_node_id === node.id);
          currentNodeId = nextConn ? nextConn.target_node_id : null;
          nodesProcessed++;
          continue;
        }

        // ============= WEBHOOK FORWARD NODES =============
        if (node.node_type === "webhook_forward") {
          const targetUrl = replaceVariables((node.config.url as string) || "");
          const method = (node.config.method as string) || "POST";
          const customHeaders = (node.config.headers as Array<{key: string; value: string}>) || [];
          const includeInstance = (node.config.includeInstance as boolean) ?? true;
          const includeGroups = (node.config.includeGroups as boolean) ?? true;
          let customPayloadData = {};
          
          try {
            const raw = (node.config.customPayload as string) || "";
            if (raw.trim()) customPayloadData = JSON.parse(raw);
          } catch { /* ignore invalid JSON */ }

          if (!targetUrl) {
            console.log(`[ExecuteMessage] ⚠️ webhook_forward: no URL configured, skipping`);
            await logNodeExecution(supabase, {
              executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
              status: "not_executed", startedAt: nodeStartedAt,
              input: node.config, error: { message: "No URL configured" },
            });
            const nextConn = connections.find(c => c.source_node_id === node.id);
            currentNodeId = nextConn ? nextConn.target_node_id : null;
            nodesProcessed++;
            continue;
          }

          // Build automatic payload
          const forwardPayload: Record<string, unknown> = {
            event: "sequence.webhook_forward",
            lead: triggerContext ? {
              phone: triggerContext.respondentPhone,
              name: triggerContext.respondentName,
              jid: triggerContext.respondentJid,
              customFields: triggerContext.customFields || {},
            } : null,
            campaign: {
              id: typedCampaign.id || effectiveSequenceId,
              name: typedCampaign.name || (typedCampaign.name || 'Workflow'),
            },
            sequence: {
              id: effectiveSequenceId,
            },
            node: {
              id: node.id,
              type: node.node_type,
              order: node.node_order,
            },
            timestamp: new Date().toISOString(),
            ...customPayloadData,
          };

          if (includeInstance) {
            forwardPayload.instance = {
              id: activeInstanceId,
              name: instance.name,
              phone: instance.phone || "",
              provider: instance.provider,
            };
          }

          if (includeGroups && groups.length > 0) {
            forwardPayload.groups = groups.map(g => ({
              jid: g.group_jid,
              name: g.group_name,
            }));
          }

          // Build headers
          const fetchHeaders: Record<string, string> = { "Content-Type": "application/json" };
          for (const h of customHeaders) {
            if (h.key && h.value) fetchHeaders[h.key] = replaceVariables(h.value);
          }

          const sendStartTime = Date.now();

          // Log entry
          const { data: logEntry } = await supabase
            .from("group_message_logs")
            .insert({
              user_id: userId, group_campaign_id: typedCampaign.id || effectiveSequenceId,
              sequence_id: effectiveSequenceId, node_type: node.node_type,
              node_order: node.node_order, instance_id: activeInstanceId,
              instance_name: instance.name, campaign_name: typedCampaign.name || (typedCampaign.name || 'Workflow'),
              status: "sending", payload: forwardPayload,
            })
            .select().single();

          let webhookNodeError: unknown = null;
          try {
            const response = await fetch(targetUrl, {
              method,
              headers: fetchHeaders,
              body: JSON.stringify(forwardPayload),
            });

            const responseTimeMs = Date.now() - sendStartTime;
            const responseText = await response.text();
            let responseData;
            try { responseData = JSON.parse(responseText); } catch { responseData = { raw: responseText }; }

            if (logEntry?.id) {
              await supabase.from("group_message_logs").update({
                status: response.ok ? "sent" : "failed",
                error_message: response.ok ? null : `HTTP ${response.status}`,
                response_time_ms: responseTimeMs, provider_response: responseData,
              }).eq("id", logEntry.id);
            }

            if (response.ok) {
              console.log(`[ExecuteMessage] ✅ webhook_forward sent to ${targetUrl}`);
              webhookResponses.push({ nodeType: node.node_type, nodeOrder: node.node_order, destination: targetUrl, status: "sent", data: responseData });
            } else {
              nodesFailed++;
              console.log(`[ExecuteMessage] ❌ webhook_forward failed: HTTP ${response.status}`);
              webhookResponses.push({ nodeType: node.node_type, nodeOrder: node.node_order, destination: targetUrl, status: "failed", data: responseData });
              webhookNodeError = { message: `HTTP ${response.status}`, details: responseData };
            }
          } catch (err) {
            nodesFailed++;
            if (logEntry?.id) {
              await supabase.from("group_message_logs").update({
                status: "failed", error_message: err instanceof Error ? err.message : "Unknown error",
                response_time_ms: Date.now() - sendStartTime,
              }).eq("id", logEntry.id);
            }
            console.error(`[ExecuteMessage] ❌ webhook_forward error:`, err);
            webhookNodeError = { message: err instanceof Error ? err.message : "Unknown error" };
          }

          await logNodeExecution(supabase, {
            executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
            status: webhookNodeError ? "error" : "success", startedAt: nodeStartedAt,
            input: { url: targetUrl, method, payload: forwardPayload },
            error: webhookNodeError,
          });
          if (nodesFailed > initialNodesFailed) {
            console.log(`[ExecuteMessage] Webhook node ${node.id} failed, aborting.`);
            break;
          }
          const nextConn = connections.find(c => c.source_node_id === node.id);
          currentNodeId = nextConn ? nextConn.target_node_id : null;
          nodesProcessed++;
          continue;
        }

        // Check if we are resuming from a poll vote
        const isResumedFromPollNode = triggerContext?.resumedFromPoll && (triggerContext?.resumeNodeId === node.id || !triggerContext?.resumeNodeId);
        if (isResumedFromPollNode && (node.node_type === "content" || node.node_type === "poll")) {
          const selectedOptionId = triggerContext?.selectedOptionId;
          const selectedOptionLabel = triggerContext?.selectedOptionLabel;
          console.log(`[ExecuteMessage] 🗳️ Resuming execution from poll response at node ${node.id}: option ID = "${selectedOptionId}", label = "${selectedOptionLabel}"`);

          await logNodeExecution(supabase, {
            executionId: workflowExecutionId,
            userId,
            nodeId: node.id,
            nodeType: node.node_type,
            status: "success",
            startedAt: nodeStartedAt,
            input: node.config,
            output: {
              status: "completed",
              selectedOptionId,
              selectedOptionLabel,
              pollResponse: triggerContext?.pollResponse || null
            },
          });

          // Multi-candidate connection matching for poll option paths
          const nodeConns = connections.filter((c) => c.source_node_id === node.id);
          const candidates = new Set<string>();

          if (selectedOptionId) candidates.add(selectedOptionId);
          if (selectedOptionLabel) candidates.add(selectedOptionLabel);

          const rawOptIndex = (triggerContext as any)?.pollResponse?.option_index ?? (triggerContext as any)?.response?.option_index;
          if (rawOptIndex !== undefined && rawOptIndex !== null) {
            const idxNum = Number(rawOptIndex);
            candidates.add(String(idxNum));
            candidates.add(String(idxNum + 1));
            candidates.add(`poll_opt_${idxNum + 1}`);
            candidates.add(`opt_${idxNum}`);
            candidates.add(`opt_${idxNum + 1}`);
            candidates.add(`option_${idxNum}`);
            candidates.add(`option_${idxNum + 1}`);
          }

          let nextConn = nodeConns.find((c) => c.condition_path && candidates.has(c.condition_path));

          if (!nextConn && selectedOptionLabel) {
            const lowerLabel = selectedOptionLabel.toLowerCase().trim();
            nextConn = nodeConns.find((c) => c.condition_path && c.condition_path.toLowerCase().trim() === lowerLabel);
          }

          if (!nextConn && nodeConns.length > 0) {
            const idxNum = rawOptIndex !== undefined && rawOptIndex !== null ? Number(rawOptIndex) : -1;
            if (idxNum >= 0 && idxNum < nodeConns.length) {
              nextConn = nodeConns[idxNum];
            } else if (nodeConns.length === 1) {
              nextConn = nodeConns[0];
            }
          }

          if (nextConn) {
            console.log(`[ExecuteMessage] ✅ Found outgoing edge for poll option "${selectedOptionLabel || selectedOptionId}" -> target node ${nextConn.target_node_id}`);
            currentNodeId = nextConn.target_node_id;
            nodesProcessed++;
            triggerContext.resumedFromPoll = false;
            continue;
          } else {
            console.log(`[ExecuteMessage] ℹ️ Poll option selected ("${selectedOptionLabel || selectedOptionId}") but no outgoing edge configured for node ${node.id}. Completing branch.`);
            triggerContext.resumedFromPoll = false;
            break;
          }
        }

        // ============= CONTENT CONTAINER NODES =============
        if (node.node_type === "content") {
          const subMessages = (node.config?.messages as any[]) || [];
          
          // Special case: if it contains only a single delay, treat it exactly as a standalone delay node
          if (subMessages.length === 1 && subMessages[0]?.type === "delay") {
            const delayConfig = subMessages[0];
            const normalized = normalizeDelayConfig(delayConfig);
            const delayMs = normalized.delayMs;
            const resumeAt = new Date(nodeStartedAt.getTime() + delayMs);
            const nextConn = connections.find(c => c.source_node_id === node.id);
            const nextNodeId = nextConn ? nextConn.target_node_id : null;
            const nextNodeIndex = nextNodeId ? sortedNodes.findIndex(n => n.id === nextNodeId) : nodesProcessed + 1;

            const delayOutput = {
              delay: {
                delayMs,
                value: normalized.value,
                unit: normalized.unit,
                startedAt: nodeStartedAt.toISOString(),
                resumeAt: resumeAt.toISOString()
              },
              context: triggerContext || {}
            };
            
            if (delayMs > MAX_DELAY_MS) {
              console.log(`[ExecuteMessage] ⏱️ Long delay inside single-action content node: ${delayMs}ms. Scheduling continuation...`);
              
              const { data: savedExecution, error: saveError } = await supabase
                .from("sequence_executions")
                .upsert({
                  id: workflowExecutionId,
                  user_id: userId,
                  campaign_id: effectiveCampaignId,
                  sequence_id: effectiveSequenceId,
                  message_id: typedMessage?.id || null,
                  current_node_id: nextNodeId,
                  current_node_index: nextNodeIndex >= 0 ? nextNodeIndex : nodesProcessed + 1,
                  trigger_context: {
                    ...(triggerContext || {}),
                    instanceId: activeInstanceId,
                    resumeNodeId: nextNodeId,
                    waitingType: "delay",
                    delayNodeId: node.id,
                    delayFormatted: `${normalized.value} ${normalized.unit === 'seconds' ? 'segundos' : normalized.unit === 'minutes' ? 'minutos' : normalized.unit === 'hours' ? 'horas' : normalized.unit === 'days' ? 'dias' : normalized.unit}`,
                    delayDurationMs: delayMs,
                  },
                  nodes_data: sortedNodes,
                  destinations: activeDestinations,
                  status: "paused",
                  resume_at: resumeAt.toISOString(),
                  nodes_processed: nodesProcessed + 1,
                  nodes_failed: nodesFailed,
                })
                .select()
                .single();
                
              if (saveError) {
                console.error("[ExecuteMessage] Failed to save execution state:", saveError);
                const effectiveDelay = Math.min(delayMs, MAX_DELAY_MS);
                await new Promise(resolve => setTimeout(resolve, effectiveDelay));
              } else {
                console.log(`[ExecuteMessage] ✅ Execution ${savedExecution.id} paused inside single-action content node, will resume at ${resumeAt.toISOString()}`);
                await logNodeExecution(supabase, {
                  executionId: workflowExecutionId,
                  userId,
                  nodeId: node.id,
                  nodeType: "delay",
                  status: "success",
                  startedAt: nodeStartedAt,
                  input: delayConfig,
                  output: delayOutput
                });
                await supabase.from("workflow_executions")
                  .update({ status: "waiting" })
                  .eq("id", workflowExecutionId);
                const totalTimeMs = Date.now() - startTime;
                return new Response(
                  JSON.stringify({
                    success: true,
                    status: "paused",
                    executionId: savedExecution.id,
                    resumeAt: resumeAt.toISOString(),
                    nodesProcessed: nodesProcessed + 1,
                    nodesFailed,
                    totalTimeMs,
                    message: `Execution paused. Will resume in ${Math.round(delayMs / 60000)} minutes.`,
                  }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            } else {
              console.log(`[ExecuteMessage] ⏱️ Short delay inside single-action content node: ${delayMs}ms`);
              if (delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
              }
              
              await logNodeExecution(supabase, {
                executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: "delay",
                status: "success", startedAt: nodeStartedAt,
                input: delayConfig,
                output: delayOutput
              });
            }
            
            currentNodeId = nextConn ? nextConn.target_node_id : null;
            nodesProcessed++;
            continue;
          }

          console.log(`[ExecuteMessage] Processing content node ${node.id} with ${subMessages.length} sub-messages`);
          
          let subFailed = false;
          let subFailedError: string | null = null;
          let hasSentPollInSubMessages = false;
          let hasSentUserInputInSubMessages = false;
          let userInputSubMsgConfig: any = null;
          
          for (const subMsg of subMessages) {
            const subNodeType = subMsg.type || "message";
            
            // Inline delay handling inside a list of sub-messages
            if (subNodeType === "delay") {
              const delayMs = calculateDelayMs(subMsg);
              const sleepTime = Math.min(delayMs, 20000); // Cap at 20 seconds to prevent Edge Function timeouts
              console.log(`[ExecuteMessage] ⏱️ Inline delay in content node: waiting ${sleepTime}ms`);
              if (sleepTime > 0) {
                await new Promise(resolve => setTimeout(resolve, sleepTime));
              }
              continue;
            }

            const subAction = getActionForNodeType(subNodeType);
            
            // Format the sub-message config as if it was a standalone node config
            const subConfig = { ...subMsg };
            delete subConfig.id;
            delete subConfig.type;
            
            // Format text fields and replace variables
            const formattedConfig = formatNodeConfig(subConfig, subNodeType);
            const textFields = ["text", "content", "message", "caption", "title", "description", "footer", "question", "url", "filename"];
            textFields.forEach((field) => {
              if (typeof formattedConfig[field] === "string") {
                formattedConfig[field] = replaceVariables(formattedConfig[field] as string);
              }
            });
            formattedConfig.mention_all = Boolean(subConfig.mention_all ?? subConfig.mentionAll ?? false);

            const isUserInputSubNode = subNodeType === "user_input" || subNodeType === "question" || subNodeType === "pergunta";
            if (isUserInputSubNode) {
              hasSentUserInputInSubMessages = true;
              userInputSubMsgConfig = subMsg;

              const questionText = (
                formattedConfig.question ||
                formattedConfig.text ||
                formattedConfig.content ||
                formattedConfig.message ||
                subMsg.question ||
                subMsg.content ||
                subMsg.text ||
                ""
              ).trim();

              if (!questionText) {
                console.log(`[ExecuteMessage] ℹ️ Entrada do Usuário sem pergunta de texto no bloco de conteúdo ${node.id}. Pulando envio de mensagem vazia para WhatsApp e ativando modo de espera por resposta.`);
                break;
              }
            }
            
            // Send to all destinations in parallel
            const destResults = await Promise.allSettled(
              activeDestinations.map(async (dest) => {
                const isSubNodePrivate = Boolean(
                  formattedConfig.sendPrivate ?? formattedConfig.send_private ?? subMsg.sendPrivate ?? subMsg.send_private ?? false
                );
                const targetDestJid = (isSubNodePrivate && triggerContext?.respondentPhone)
                  ? (triggerContext.respondentJid && triggerContext.respondentJid.includes('@s.whatsapp.net') ? triggerContext.respondentJid : `${triggerContext.respondentPhone}@s.whatsapp.net`)
                  : dest.group_jid;
                const targetDestName = (isSubNodePrivate && triggerContext?.respondentPhone)
                  ? (triggerContext.respondentName || triggerContext.respondentPhone)
                  : dest.group_name;

                const payload = buildStandardPayload({
                  action: subAction,
                  node: {
                    id: subMsg.id || node.id,
                    type: subNodeType,
                    order: node.node_order,
                    config: formattedConfig,
                  },
                  campaign: {
                    id: typedCampaign.id || effectiveSequenceId,
                    name: typedCampaign.name || (typedCampaign.name || 'Workflow'),
                  },
                  instance: {
                    id: activeInstanceId,
                    name: instance.name,
                    phone: instance.phone || "",
                    provider: instance.provider,
                    externalId: instance.external_instance_id || instance.id || "",
                    externalToken: instance.external_instance_token || "",
                  },
                  destination: {
                    jid: targetDestJid,
                    name: targetDestName,
                    phone: triggerContext?.respondentPhone || dest.recipient_phone || dest.phone || "",
                  },
                });
                
                const sendStartTime = Date.now();
                
                // Create log entry
                const { data: logEntry } = await supabase
                  .from("group_message_logs")
                  .insert({
                    user_id: userId,
                    group_campaign_id: typedCampaign.id || effectiveSequenceId,
                    message_id: typedMessage?.id || null,
                    sequence_id: effectiveSequenceId,
                    node_type: subNodeType,
                    node_order: node.node_order,
                    group_jid: dest.group_jid,
                    group_name: dest.group_name,
                    recipient_phone: dest.isPrivate ? triggerContext?.respondentPhone : null,
                    instance_id: activeInstanceId,
                    instance_name: instance.name,
                    campaign_name: typedCampaign.name || (typedCampaign.name || 'Workflow'),
                    status: "sending",
                    payload,
                  })
                  .select()
                  .single();
                  
                const msgText = (formattedConfig.text || formattedConfig.content || formattedConfig.message || formattedConfig.question || formattedConfig.caption || subMsg.content || subMsg.text || subMsg.message || subMsg.question || "") as string;
                const mediaUrl = (formattedConfig.url || formattedConfig.mediaUrl || formattedConfig.image || formattedConfig.fileUrl || formattedConfig.audio || formattedConfig.video || formattedConfig.document || subMsg.url || subMsg.mediaUrl || subMsg.image || "") as string;
                const isGroupDest = !isSubNodePrivate && Boolean(
                  isWorkflowGroupMode ||
                  dest.group_jid?.includes("@g.us") ||
                  dest.group_jid?.includes("-group") ||
                  !dest.isPrivate
                );
                const destPhone = isGroupDest
                  ? (dest.group_jid || "")
                  : ((isSubNodePrivate && triggerContext?.respondentPhone)
                      ? triggerContext.respondentPhone
                      : (dest.group_jid ? dest.group_jid.split("@")[0] : triggerContext?.respondentPhone || triggerContext?.contactPhone || "")
                    );
                const destName = isGroupDest
                  ? (dest.group_name || dest.group_jid)
                  : (isSubNodePrivate
                      ? (triggerContext?.respondentName || triggerContext?.respondentPhone)
                      : (dest.group_name || triggerContext?.respondentName)
                    );
                const effectiveCompanyId = triggerContext?.companyId || typedCampaign?.company_id || "dcb34e9a-1510-4137-aecd-cec0c6d548c4";

                // Reflete o status "enviando" imediatamente no chat (reloginho 🕒)
                let pendingChatSync: { conversationId?: string; messageId?: string } | null = null;
                if ((msgText || mediaUrl) && destPhone) {
                  pendingChatSync = await syncSentMessageToChat(supabase, {
                    companyId: effectiveCompanyId,
                    instanceId: activeInstanceId,
                    phone: destPhone,
                    name: destName,
                    leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                    isGroup: isGroupDest,
                    groupJid: isGroupDest ? dest.group_jid : undefined,
                    body: msgText,
                    mediaUrl: mediaUrl || null,
                    messageType: subNodeType === "message" ? (mediaUrl ? "image" : "text") : subNodeType,
                    mediaType: subNodeType === "message" ? (mediaUrl ? "image" : null) : subNodeType,
                    status: "sending",
                  });
                }

                try {
                  const result = await sendWhatsAppMessage(payload);
                  const responseTimeMs = Date.now() - sendStartTime;
                  const responseData = result.details || result;
                  
                  const zaapId = result.zaapId || null;
                  const externalMessageId = result.messageId || null;
                  
                  if (logEntry?.id) {
                    await supabase
                      .from("group_message_logs")
                      .update({
                        status: result.ok ? "sent" : "failed",
                        error_message: result.ok ? null : `HTTP ${result.status}`,
                        response_time_ms: responseTimeMs,
                        provider_response: responseData,
                        zaap_id: zaapId,
                        external_message_id: externalMessageId,
                        payload: {
                          ...payload,
                          zapiUrl: result.requestUrl,
                          zapiBody: result.requestBody,
                          curl: result.curl,
                        } as any,
                      })
                      .eq("id", logEntry.id);
                  }

                  if (!result.ok) {
                    const errDetail = typeof result.details === "string" ? result.details : JSON.stringify(result.details || "");
                    const errorMsg = `Falha ao enviar ${subNodeType} (HTTP ${result.status})${errDetail ? `: ${errDetail}` : ""}`;
                    console.error(`[ExecuteMessage] ❌ Failed to send sub-message ${subNodeType} to ${dest.group_name}:`, errorMsg);

                    // Atualiza para falha (alerta vermelho com tooltip de erro)
                    if (pendingChatSync?.messageId) {
                      await syncSentMessageToChat(supabase, {
                        chatMessageId: pendingChatSync.messageId,
                        conversationId: pendingChatSync.conversationId,
                        status: "failed",
                        errorMessage: errorMsg,
                        body: msgText,
                        mediaUrl: mediaUrl || null,
                      });
                    } else if ((msgText || mediaUrl) && destPhone) {
                      await syncSentMessageToChat(supabase, {
                        companyId: effectiveCompanyId,
                        instanceId: activeInstanceId,
                        phone: destPhone,
                        name: destName,
                        leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                        isGroup: isGroupDest,
                        groupJid: isGroupDest ? dest.group_jid : undefined,
                        body: msgText,
                        mediaUrl: mediaUrl || null,
                        messageType: subNodeType === "message" ? (mediaUrl ? "image" : "text") : subNodeType,
                        mediaType: subNodeType === "message" ? (mediaUrl ? "image" : null) : subNodeType,
                        externalMessageId: null,
                        status: "failed",
                        errorMessage: errorMsg,
                      });
                    }
                    return { ok: false, dest, error: errorMsg };
                  } else {
                    console.log(`[ExecuteMessage] ✅ Sub-message ${subNodeType} sent to ${dest.group_name}`);
                    // Atualiza para enviado com sucesso (check 1 pauzinho)
                    if (pendingChatSync?.messageId) {
                      await syncSentMessageToChat(supabase, {
                        chatMessageId: pendingChatSync.messageId,
                        conversationId: pendingChatSync.conversationId,
                        status: "sent",
                        externalMessageId: externalMessageId,
                        body: msgText,
                        mediaUrl: mediaUrl || null,
                      });
                    } else if ((msgText || mediaUrl) && destPhone) {
                      await syncSentMessageToChat(supabase, {
                        companyId: effectiveCompanyId,
                        instanceId: activeInstanceId,
                        phone: destPhone,
                        name: destName,
                        leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                        isGroup: isGroupDest,
                        groupJid: isGroupDest ? dest.group_jid : undefined,
                        body: msgText,
                        mediaUrl: mediaUrl || null,
                        messageType: subNodeType === "message" ? (mediaUrl ? "image" : "text") : subNodeType,
                        mediaType: subNodeType === "message" ? (mediaUrl ? "image" : null) : subNodeType,
                        externalMessageId: externalMessageId,
                        status: "sent",
                      });
                    }
                    if (subNodeType === "poll" && (externalMessageId || zaapId)) {
                      const messageIdForInsert = externalMessageId || zaapId;
                      const pollQuestion = (formattedConfig.question as string) || (formattedConfig.title as string) || "";
                      const rawOpts = (formattedConfig.options as any[]) || (subMsg.options as any[]) || [];
                      const pollOptions = rawOpts.map((opt, idx) => {
                        if (typeof opt === "string") return { id: `poll_opt_${idx + 1}`, label: replaceVariables(opt) };
                        if (opt && typeof opt === "object") return { id: opt.id || `poll_opt_${idx + 1}`, label: replaceVariables(opt.label || "") };
                        return { id: `poll_opt_${idx + 1}`, label: String(opt || "") };
                      });

                      if (messageIdForInsert) {
                        await supabase.from("poll_messages").insert({
                          user_id: userId,
                          message_id: messageIdForInsert,
                          zaap_id: zaapId,
                          node_id: node.id,
                          sequence_id: effectiveSequenceId,
                          campaign_id: typedCampaign.id || effectiveSequenceId,
                          group_jid: dest.group_jid,
                          instance_id: activeInstanceId,
                          question_text: pollQuestion,
                          options: pollOptions,
                          sent_at: new Date().toISOString(),
                        });
                        hasSentPollInSubMessages = true;
                      }
                    }

                    if (subNodeType === "user_input" || subNodeType === "question" || subNodeType === "pergunta") {
                      hasSentUserInputInSubMessages = true;
                      userInputSubMsgConfig = subMsg;
                    }

                    return { ok: true, dest };
                  }
                } catch (err: any) {
                  const errorMsg = err.message || String(err);
                  console.error(`[ExecuteMessage] ❌ Error sending sub-message ${subNodeType} to ${dest.group_name}:`, err);
                  if (logEntry?.id) {
                    await supabase
                      .from("group_message_logs")
                      .update({
                        status: "failed",
                        error_message: errorMsg,
                        response_time_ms: Date.now() - sendStartTime,
                      })
                      .eq("id", logEntry.id);
                  }

                  // Sync caught exception failure to chat
                  if (pendingChatSync?.messageId) {
                    await syncSentMessageToChat(supabase, {
                      chatMessageId: pendingChatSync.messageId,
                      conversationId: pendingChatSync.conversationId,
                      status: "failed",
                      errorMessage: errorMsg,
                      body: msgText,
                      mediaUrl: mediaUrl || null,
                    });
                  } else if ((msgText || mediaUrl) && destPhone) {
                    await syncSentMessageToChat(supabase, {
                      companyId: effectiveCompanyId,
                      instanceId: activeInstanceId,
                      phone: destPhone,
                      name: destName,
                      leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                      isGroup: isGroupDest,
                      groupJid: isGroupDest ? dest.group_jid : undefined,
                      body: msgText,
                      mediaUrl: mediaUrl || null,
                      messageType: subNodeType === "message" ? (mediaUrl ? "image" : "text") : subNodeType,
                      mediaType: subNodeType === "message" ? (mediaUrl ? "image" : null) : subNodeType,
                      externalMessageId: null,
                      status: "failed",
                      errorMessage: errorMsg,
                    });
                  }
                  return { ok: false, dest, error: errorMsg };
                }
              })
            );

            const successfulSubDests: DestinationData[] = [];
            for (const r of destResults) {
              if (r.status === "fulfilled" && r.value.ok) {
                successfulSubDests.push(r.value.dest);
              } else {
                const err = r.status === "fulfilled" ? r.value.error : String(r.reason);
                subFailedError = err;
              }
            }

            activeDestinations = successfulSubDests;
            if (activeDestinations.length === 0) {
              subFailed = true;
              console.log(`[ExecuteMessage] ❌ Content node ${node.id} sub-message failed for all destinations.`);
              break;
            }

            if (isUserInputSubNode) {
              break;
            }
          }
          
          await logNodeExecution(supabase, {
            executionId: workflowExecutionId,
            userId,
            nodeId: node.id,
            nodeType: node.node_type,
            status: !subFailed ? "success" : "error",
            startedAt: nodeStartedAt,
            input: node.config,
            output: { status: !subFailed ? "completed" : "failed", subMessagesCount: subMessages.length },
            error: subFailed ? subFailedError : null,
          });
          
          if (subFailed) {
            nodesFailed++;
            console.log(`[ExecuteMessage] ❌ Content node ${node.id} sub-message failed, aborting sequence continuation.`);
            break;
          }

          // If a user_input message was sent in this content node, pause to wait for reply
          if (hasSentUserInputInSubMessages) {
            console.log(`[ExecuteMessage] ⏸️ User Input message sent in content node ${node.id}. Pausing workflow ${workflowExecutionId} to wait for reply...`);

            const nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path !== "timeout" && c.condition_path !== "error")
              || connections.find(c => c.source_node_id === node.id);
            const nextNodeId = nextConn ? nextConn.target_node_id : null;

            const timeoutConn = connections.find(c => c.source_node_id === node.id && c.condition_path === "timeout");
            const timeoutNodeId = timeoutConn ? timeoutConn.target_node_id : null;

            for (const dest of activeDestinations) {
              const rawDestPhone = triggerContext?.respondentPhone || (dest.group_jid ? dest.group_jid.split("@")[0] : "");
              const destPhoneClean = rawDestPhone ? rawDestPhone.replace(/\D/g, "") : "";
              const targetField = (userInputSubMsgConfig?.targetField || (node.config as any)?.targetField || "") as string;
              const timeoutMs = (userInputSubMsgConfig?.timeoutMs || (node.config as any)?.timeoutMs || 3600000) as number;

              let effectiveLeadId = triggerContext?.leadId || null;
              if (!effectiveLeadId && destPhoneClean) {
                const suffix = destPhoneClean.slice(-8);
                const { data: leadFound } = await supabase
                  .from("leads")
                  .select("id")
                  .or(`phone.eq.${destPhoneClean},phone.ilike.%${suffix}`)
                  .limit(1)
                  .maybeSingle();
                if (leadFound) effectiveLeadId = leadFound.id;
              }

              if (destPhoneClean || dest.group_jid) {
                await supabase.from("workflow_user_inputs").insert({
                  company_id: typedCampaign.company_id || triggerContext?.companyId || null,
                  user_id: userId,
                  execution_id: workflowExecutionId,
                  sequence_id: effectiveSequenceId,
                  node_id: node.id,
                  lead_id: effectiveLeadId,
                  instance_id: activeInstanceId,
                  phone: destPhoneClean || (dest.group_jid ? dest.group_jid.replace(/\D/g, "") : ""),
                  group_jid: dest.group_jid,
                  target_field: targetField || null,
                  timeout_ms: timeoutMs,
                  status: "waiting",
                  expires_at: new Date(Date.now() + timeoutMs).toISOString(),
                });
              }
            }

            await supabase
              .from("workflow_executions")
              .update({
                status: "waiting",
                updated_at: new Date().toISOString(),
                trigger_payload: {
                  ...(triggerContext || {}),
                  instanceId: activeInstanceId,
                  waitingNodeId: node.id,
                  resumeNodeId: nextNodeId,
                  timeoutNodeId: timeoutNodeId,
                  waitingType: "user_input"
                }
              })
              .eq("id", workflowExecutionId);

            await supabase
              .from("sequence_executions")
              .upsert({
                id: workflowExecutionId,
                user_id: userId,
                campaign_id: effectiveCampaignId,
                sequence_id: effectiveSequenceId,
                message_id: typedMessage?.id || null,
                current_node_id: nextNodeId,
                trigger_context: {
                  ...(triggerContext || {}),
                  instanceId: activeInstanceId,
                  waitingNodeId: node.id,
                  resumeNodeId: nextNodeId,
                  timeoutNodeId: timeoutNodeId,
                  waitingType: "user_input"
                },
                nodes_data: sortedNodes,
                destinations: activeDestinations,
                status: "paused",
                resume_at: null,
                nodes_processed: nodesProcessed + 1,
                nodes_failed: nodesFailed,
              }, { onConflict: "user_id,sequence_id" });

            return new Response(
              JSON.stringify({
                success: true,
                status: "waiting_for_user_input",
                executionId: workflowExecutionId,
                message: "Execution paused waiting for user response."
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // If a poll message was sent in this content node and execution wasn't resumed from a vote, pause to wait for response
          if (hasSentPollInSubMessages && !triggerContext?.resumedFromPoll) {
            console.log(`[ExecuteMessage] ⏸️ Poll message sent in content node ${node.id}. Pausing workflow ${workflowExecutionId} to wait for poll vote...`);

            await supabase
              .from("workflow_executions")
              .update({ status: "waiting", updated_at: new Date().toISOString() })
              .eq("id", workflowExecutionId);

            await supabase
              .from("sequence_executions")
              .upsert({
                id: workflowExecutionId,
                user_id: userId,
                campaign_id: effectiveCampaignId,
                sequence_id: effectiveSequenceId,
                message_id: typedMessage?.id || null,
                trigger_context: {
                  ...(triggerContext || {}),
                  instanceId: activeInstanceId,
                  resumeNodeId: node.id,
                },
                nodes_data: sortedNodes,
                destinations: activeDestinations,
                status: "paused",
                resume_at: null,
                nodes_processed: nodesProcessed + 1,
                nodes_failed: nodesFailed,
              }, { onConflict: "user_id,sequence_id" });

            return new Response(
              JSON.stringify({
                success: true,
                status: "paused",
                executionId: workflowExecutionId,
                message: "Execution paused waiting for poll response."
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          const nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path !== "timeout" && c.condition_path !== "error")
            || connections.find(c => c.source_node_id === node.id);
          currentNodeId = nextConn ? nextConn.target_node_id : null;
          nodesProcessed++;
          continue;
        }

        // ============= URA / IVR NODES =============
        if (node.node_type === "ura") {
          console.log(`[ExecuteMessage] 🔊 Processing URA node ${node.id}`);
          const config = node.config || {};

          // Verify MOS Campaign or URA ID before dispatching
          const mosCampaignId = config.mos?.idType === "ura" ? config.mos?.mosUraId : config.mos?.mosCampaignId;

          if (!mosCampaignId) {
            console.warn(`[ExecuteMessage] ⚠️ URA node ${node.id} execution blocked. ID MOS BR empty.`);
            
            // Log warning execution
            await logNodeExecution(supabase, {
              executionId: workflowExecutionId,
              userId,
              nodeId: node.id,
              nodeType: node.node_type,
              status: "error",
              startedAt: nodeStartedAt,
              input: node.config,
              output: { 
                error: "Informe o ID da URA/Campanha MOS BR antes de ativar o workflow.", 
                mosCampaignId
              },
            });

            // Route to error outcome port
            const nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path === "error");
            currentNodeId = nextConn ? nextConn.target_node_id : null;
            nodesProcessed++;
            continue;
          }
          
          // Check if we are resuming from a URA callback result
          const uraResult = triggerContext?.uraResult;
          if (uraResult) {
            console.log(`[ExecuteMessage] Resuming URA node ${node.id} with result: ${uraResult}`);
            
            // Register node execution outcome
            await logNodeExecution(supabase, {
              executionId: workflowExecutionId,
              userId,
              nodeId: node.id,
              nodeType: node.node_type,
              status: "success",
              startedAt: nodeStartedAt,
              input: node.config,
              output: { status: "completed", uraResult },
            });

            // Map DTMF digit to path: if digit is in 0-9, *, #, map to "dtmf_" + digit
            let conditionPath = uraResult;
            if (["0","1","2","3","4","5","6","7","8","9","*","#"].includes(uraResult)) {
              conditionPath = `dtmf_${uraResult}`;
            }

            // Find the connection matching the condition path
            const nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path === conditionPath);
            currentNodeId = nextConn ? nextConn.target_node_id : null;
            nodesProcessed++;
            continue;
          }

          // If not resuming, we must queue a new URA task, call the dispatch function, and pause the workflow
          const companyId = triggerContext?.companyId || typedCampaign.company_id;
          let lead = null;
          const resolvedLeadId = triggerContext?.leadId || triggerContext?.respondentId;
          const firstDest = activeDestinations[0];
          const phoneClean = firstDest?.group_jid?.split("@")[0]?.replace(/\D/g, "");
          const resolvedPhone = phoneClean || triggerContext?.respondentPhone || triggerContext?.contactPhone;

          if (resolvedLeadId) {
            const { data: lData } = await supabase
              .from("leads")
              .select("id, name, phone, company_id")
              .eq("id", resolvedLeadId)
              .maybeSingle();
            lead = lData;
          } else if (resolvedPhone) {
            const { data: lData } = await supabase
              .from("leads")
              .select("id, name, phone, company_id")
              .eq("company_id", companyId)
              .eq("phone", resolvedPhone)
              .maybeSingle();
            lead = lData;
          }

          const leadId = resolvedLeadId || lead?.id;
          const leadPhone = lead?.phone || resolvedPhone || "";

          if (!leadId || !leadPhone) {
            console.error(`[ExecuteMessage] ❌ Cannot queue URA task: lead_id or phone is missing.`);
            await logNodeExecution(supabase, {
              executionId: workflowExecutionId,
              userId,
              nodeId: node.id,
              nodeType: node.node_type,
              status: "error",
              startedAt: nodeStartedAt,
              input: node.config,
              output: { error: "Missing lead ID or phone" },
            });
            const nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path === "error");
            currentNodeId = nextConn ? nextConn.target_node_id : null;
            nodesProcessed++;
            continue;
          }

          // Evaluate audio variables if type is TTS
          let audioValue = config.audio?.value || "";
          if (config.audio?.type === "tts" && audioValue) {
            audioValue = replaceVariables(audioValue);
          } else {
            audioValue = config.audio?.mosAudioName || config.audio?.fileUrl || "";
          }

          // Create URA task
          const taskPayload = {
            company_id: companyId,
            user_id: userId || typedCampaign.user_id,
            workflow_id: effectiveSequenceId,
            workflow_execution_id: workflowExecutionId,
            node_id: node.id,
            lead_id: leadId,
            phone: leadPhone.replace(/\D/g, ""),
            status: "pending",
            attempt_count: 0,
            max_attempts: config.attempts?.maxAttempts || 2,
            audio_type: config.audio?.type || "tts",
            audio_value: audioValue,
            dtmf_actions: config.dtmf?.actions || [],
            mos_campaign_id: config.mos?.mosCampaignId || null,
            mos_ura_id: config.mos?.mosUraId || null,
            mos_id_type: config.mos?.idType || "campaign",
          };

          const { data: taskData, error: taskError } = await supabase
            .from("workflow_ura_tasks")
            .insert(taskPayload)
            .select("id")
            .single();

          if (taskError) {
            console.error(`[ExecuteMessage] ❌ Failed to insert URA task:`, taskError);
            await logNodeExecution(supabase, {
              executionId: workflowExecutionId,
              userId,
              nodeId: node.id,
              nodeType: node.node_type,
              status: "error",
              startedAt: nodeStartedAt,
              input: node.config,
              output: { error: taskError.message },
            });
            const nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path === "error");
            currentNodeId = nextConn ? nextConn.target_node_id : null;
            nodesProcessed++;
            continue;
          }

          // Register node execution as paused/waiting URA callback
          await logNodeExecution(supabase, {
            executionId: workflowExecutionId,
            userId,
            nodeId: node.id,
            nodeType: node.node_type,
            status: "success",
            startedAt: nodeStartedAt,
            input: node.config,
            output: { status: "waiting_ura_callback", taskId: taskData.id },
          });

          // Update workflow execution status to waiting
          await supabase
            .from("workflow_executions")
            .update({ 
              status: "waiting", 
              updated_at: new Date().toISOString() 
            })
            .eq("id", workflowExecutionId);

          // Update sequence execution state
          await supabase
            .from("sequence_executions")
            .upsert({
              user_id: userId || typedCampaign.user_id,
              sequence_id: effectiveSequenceId,
              status: "paused",
              resume_at: null,
              trigger_context: {
                ...triggerContext,
                instanceId: activeInstanceId,
                resumeNodeId: node.id,
              }
            }, {
              onConflict: "user_id,sequence_id"
            });

          // Dispatch the task asynchronously
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          
          fetch(`${supabaseUrl}/functions/v1/workflow-ura-dispatch`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ taskId: taskData.id })
          }).catch(err => {
            console.error(`[ExecuteMessage] Failed to trigger workflow-ura-dispatch for task ${taskData.id}:`, err);
          });

          return new Response(
            JSON.stringify({
              success: true,
              status: "paused",
              executionId: workflowExecutionId,
              message: "Execution paused waiting for URA callback."
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        }

        // ============= PHONE CALL NODES =============
        if (node.node_type === "phone_call") {
          console.log(`[ExecuteMessage] 📞 Processing phone_call node ${node.id}`);
          const config = node.config || {};
          
          // Check if we are resuming from a call task action result
          const callResult = triggerContext?.callResult;
          if (callResult) {
            console.log(`[ExecuteMessage] Resuming phone_call node ${node.id} with result: ${callResult}`);
            
            // Register node execution outcome
            await logNodeExecution(supabase, {
              executionId: workflowExecutionId,
              userId,
              nodeId: node.id,
              nodeType: node.node_type,
              status: "success",
              startedAt: nodeStartedAt,
              input: node.config,
              output: { status: "completed", callResult },
            });

            // Find the connection matching the callResult or action ID/output
            const nextConn = connections.find(c => 
              (c.source_node_id === node.id || c.source_node_id === currentNodeId) && 
              (c.condition_path === callResult || 
               c.condition_path === triggerContext?.actionId || 
               c.condition_path === triggerContext?.actionOutput ||
               (callResult === "success" && (c.condition_path === "success" || c.condition_path === "completed")) ||
               (callResult === "no_success" && (c.condition_path === "no_success" || c.condition_path === "failed")))
            );
            currentNodeId = nextConn ? nextConn.target_node_id : null;
            nodesProcessed++;
            continue;
          }

          // If not resuming, we must queue a new call task and pause the workflow
          const companyId = triggerContext?.companyId || typedCampaign.company_id;
          let lead = null;
          const resolvedLeadId = triggerContext?.leadId || triggerContext?.respondentId;
          const firstDest = activeDestinations[0];
          const phoneClean = firstDest?.group_jid?.split("@")[0]?.replace(/\D/g, "");
          const resolvedPhone = phoneClean || triggerContext?.respondentPhone || triggerContext?.contactPhone;

          if (resolvedLeadId) {
            const { data: lData } = await supabase
              .from("leads")
              .select("id, name, phone, company_id")
              .eq("id", resolvedLeadId)
              .maybeSingle();
            lead = lData;
          } else if (resolvedPhone) {
            const { data: lData } = await supabase
              .from("leads")
              .select("id, name, phone, company_id")
              .eq("company_id", companyId)
              .eq("phone", resolvedPhone)
              .maybeSingle();
            lead = lData;
          }

          const leadId = resolvedLeadId || lead?.id;
          const leadPhone = lead?.phone || resolvedPhone || "";

          if (!leadId) {
            console.error(`[ExecuteMessage] ❌ Cannot queue phone_call task: lead_id is missing.`);
            await logNodeExecution(supabase, {
              executionId: workflowExecutionId,
              userId,
              nodeId: node.id,
              nodeType: node.node_type,
              status: "error",
              startedAt: nodeStartedAt,
              input: node.config,
              output: { error: "Missing lead ID" },
            });
            const nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path === "error");
            currentNodeId = nextConn ? nextConn.target_node_id : null;
            nodesProcessed++;
            continue;
          }

          // Format script content with lead variables
          let formattedScript = "";
          if (config.script?.type === "quiz") {
            const formattedQuiz = (config.script.quiz || []).map((q: any) => ({
              ...q,
              questionText: replaceVariables(q.questionText || ""),
              alternatives: (q.alternatives || []).map((alt: any) => ({
                ...alt,
                text: replaceVariables(alt.text || "")
              }))
            }));
            formattedScript = JSON.stringify({
              type: "quiz",
              title: config.script.title || "Quiz Interativo",
              quiz: formattedQuiz
            });
          } else {
            const scriptContent = config.script?.content || "";
            formattedScript = replaceVariables(scriptContent);
          }
          
          // Default operator actions
          const actions = config.actions || [
            { id: "success", label: "Sucesso", type: "success", color: "green", output: "success", requiresNote: false, finalizesCall: true, scheduleRetry: false },
            { id: "no_success", label: "Sem Sucesso", type: "no_success", color: "red", output: "no_success", requiresNote: true, finalizesCall: true, scheduleRetry: false }
          ];

          // Create the workflow call task
          const taskPayload = {
            company_id: companyId,
            user_id: userId || typedCampaign.user_id,
            workflow_id: effectiveSequenceId,
            workflow_execution_id: workflowExecutionId,
            node_id: node.id,
            lead_id: leadId,
            phone: leadPhone || lead?.phone || "",
            status: "queued",
            attempt_count: 0,
            max_attempts: config.attempts?.maxAttempts || 3,
            script: formattedScript,
            actions: actions,
            queue_id: config.assignment?.mode === "queue" ? config.assignment?.queueId : null,
            assigned_operator_id: config.assignment?.mode === "operator" ? config.assignment?.operatorId : null,
            department_id: config.assignment?.mode === "department" ? config.assignment?.departmentId : null,
          };

          const { data: taskData, error: taskError } = await supabase
            .from("workflow_call_tasks")
            .insert(taskPayload)
            .select("id")
            .single();

          if (taskError) {
            console.error(`[ExecuteMessage] ❌ Failed to insert call task:`, taskError);
            await logNodeExecution(supabase, {
              executionId: workflowExecutionId,
              userId,
              nodeId: node.id,
              nodeType: node.node_type,
              status: "error",
              startedAt: nodeStartedAt,
              input: node.config,
              output: { error: taskError.message },
            });
            const nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path === "error");
            currentNodeId = nextConn ? nextConn.target_node_id : null;
            nodesProcessed++;
            continue;
          }
          // Register node execution as paused/waiting
          await logNodeExecution(supabase, {
            executionId: workflowExecutionId,
            userId,
            nodeId: node.id,
            nodeType: node.node_type,
            status: "success",
            startedAt: nodeStartedAt,
            input: node.config,
            output: { status: "waiting_call", taskId: taskData.id },
          });

          // Update workflow execution status to waiting
          await supabase
            .from("workflow_executions")
            .update({ 
              status: "waiting", 
              updated_at: new Date().toISOString() 
            })
            .eq("id", workflowExecutionId);

          // Update sequence execution state
          await supabase
            .from("sequence_executions")
            .upsert({
              user_id: userId || typedCampaign.user_id,
              sequence_id: effectiveSequenceId,
              status: "paused",
              resume_at: null,
              trigger_context: {
                ...triggerContext,
                instanceId: activeInstanceId,
                resumeNodeId: node.id,
              }
            }, {
              onConflict: "user_id,sequence_id"
            });

          return new Response(
            JSON.stringify({
              success: true,
              status: "paused",
              executionId: workflowExecutionId,
              message: "Execution paused waiting for call task completion."
            }),
            { headers: { "Content-Type": "application/json" } }
          );
        }

        // ============= STATUS NODES =============
        if (node.node_type === "status") {
          const config = node.config || {};
          const statusType = (config.statusType as string) || "text";
          
          // Clone and format config, applying variable replacement
          const formattedConfig = formatNodeConfig(node.config, node.node_type);
          const textFields = ["text", "content", "message", "caption", "url"];
          textFields.forEach((field) => {
            if (typeof formattedConfig[field] === "string") {
              formattedConfig[field] = replaceVariables(formattedConfig[field] as string);
            }
          });

          // Build standardized payload for WAHA status posting
          const payload = {
            action: "status.post",
            node: {
              id: node.id,
              type: node.node_type,
              order: node.node_order,
              config: formattedConfig,
            },
            campaign: {
              id: typedCampaign.id || effectiveSequenceId,
              name: typedCampaign.name || (typedCampaign.name || 'Workflow'),
            },
            instance: {
              id: activeInstanceId,
              name: instance.name,
              phone: instance.phone || "",
              provider: instance.provider,
              externalId: instance.external_instance_id || "",
              externalToken: instance.external_instance_token || "",
            },
            destination: {
              jid: `${instance.phone || "status"}@s.whatsapp.net`,
              name: "Status",
              phone: "",
            },
          };

          // Create log entry in group_message_logs for execution history
          const { data: logEntry } = await supabase
            .from("group_message_logs")
            .insert({
              user_id: userId,
              group_campaign_id: typedCampaign.id || effectiveSequenceId,
              message_id: typedMessage?.id || null,
              sequence_id: effectiveSequenceId,
              node_type: node.node_type,
              node_order: node.node_order,
              group_jid: `${instance.phone || "status"}@s.whatsapp.net`,
              group_name: "Status",
              instance_id: activeInstanceId,
              instance_name: instance.name,
              campaign_name: typedCampaign.name || (typedCampaign.name || 'Workflow'),
              status: "sending",
              payload,
            })
            .select().single();

          try {
            // Publish status via WAHA/Zapi dispatcher
            const result = await sendWhatsAppMessage(payload);
            
            if (logEntry) {
              await supabase
                .from("group_message_logs")
                .update({
                  status: result.ok ? "sent" : "failed",
                  error_message: result.ok ? null : result.details ? JSON.stringify(result.details) : "Unknown error",
                  provider_response: result || {},
                })
                .eq("id", logEntry.id);
            }
            if (!result.ok) {
              nodesFailed++;
            }
          } catch (err: any) {
            console.error(`[ExecuteMessage] Failed to post status:`, err);
            if (logEntry) {
              await supabase
                .from("group_message_logs")
                .update({
                  status: "failed",
                  error_message: err.message || String(err),
                })
                .eq("id", logEntry.id);
            }
            nodesFailed++;
          }

          await logNodeExecution(supabase, {
            executionId: workflowExecutionId,
            userId,
            nodeId: node.id,
            nodeType: node.node_type,
            status: nodesFailed === 0 ? "success" : "error",
            startedAt: nodeStartedAt,
            input: formattedConfig,
            output: { status: "queued", type: statusType, instance_id: activeInstanceId },
          });

          const nextConn = connections.find(c => c.source_node_id === node.id);
          currentNodeId = nextConn ? nextConn.target_node_id : null;
          nodesProcessed++;
          continue;
        }

        const isStandaloneUserInput = node.node_type === "user_input" || node.node_type === "question" || node.node_type === "pergunta";
        if (isStandaloneUserInput) {
          const formattedConfig = formatNodeConfig(node.config, node.node_type);
          const standaloneQuestionText = (
            formattedConfig.question ||
            formattedConfig.text ||
            formattedConfig.content ||
            formattedConfig.message ||
            (node.config as any)?.question ||
            (node.config as any)?.text ||
            (node.config as any)?.content ||
            ""
          ).trim();

          if (!standaloneQuestionText) {
            console.log(`[ExecuteMessage] ℹ️ Entrada do Usuário vazia no node ${node.id}. Pulando envio de mensagem para WhatsApp e pausando workflow para aguardar resposta...`);

            const nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path !== "timeout" && c.condition_path !== "error")
              || connections.find(c => c.source_node_id === node.id);
            const nextNodeId = nextConn ? nextConn.target_node_id : null;

            const timeoutConn = connections.find(c => c.source_node_id === node.id && c.condition_path === "timeout");
            const timeoutNodeId = timeoutConn ? timeoutConn.target_node_id : null;

            for (const dest of activeDestinations) {
              const rawDestPhone = triggerContext?.respondentPhone || (dest.group_jid ? dest.group_jid.split("@")[0] : "");
              const destPhoneClean = rawDestPhone ? rawDestPhone.replace(/\D/g, "") : "";
              const targetField = ((node.config as any)?.targetField || "") as string;
              const timeoutMs = ((node.config as any)?.timeoutMs || 3600000) as number;

              let effectiveLeadId = triggerContext?.leadId || null;
              if (!effectiveLeadId && destPhoneClean) {
                const suffix = destPhoneClean.slice(-8);
                const { data: leadFound } = await supabase
                  .from("leads")
                  .select("id")
                  .or(`phone.eq.${destPhoneClean},phone.ilike.%${suffix}`)
                  .limit(1)
                  .maybeSingle();
                if (leadFound) effectiveLeadId = leadFound.id;
              }

              if (destPhoneClean || dest.group_jid) {
                await supabase.from("workflow_user_inputs").insert({
                  company_id: typedCampaign.company_id || triggerContext?.companyId || null,
                  user_id: userId,
                  execution_id: workflowExecutionId,
                  sequence_id: effectiveSequenceId,
                  node_id: node.id,
                  lead_id: effectiveLeadId,
                  instance_id: activeInstanceId,
                  phone: destPhoneClean || (dest.group_jid ? dest.group_jid.replace(/\D/g, "") : ""),
                  group_jid: dest.group_jid,
                  target_field: targetField || null,
                  timeout_ms: timeoutMs,
                  status: "waiting",
                  expires_at: new Date(Date.now() + timeoutMs).toISOString(),
                });
              }
            }

            await logNodeExecution(supabase, {
              executionId: workflowExecutionId,
              userId,
              nodeId: node.id,
              nodeType: node.node_type,
              status: "success",
              startedAt: nodeStartedAt,
              input: formattedConfig,
              output: { status: "waiting_for_user_input", reason: "empty_prompt_wait" },
            });

            await supabase
              .from("workflow_executions")
              .update({
                status: "waiting",
                updated_at: new Date().toISOString(),
                trigger_payload: {
                  ...(triggerContext || {}),
                  instanceId: activeInstanceId,
                  waitingNodeId: node.id,
                  resumeNodeId: nextNodeId,
                  timeoutNodeId: timeoutNodeId,
                  waitingType: "user_input"
                }
              })
              .eq("id", workflowExecutionId);

            await supabase
              .from("sequence_executions")
              .upsert({
                id: workflowExecutionId,
                user_id: userId,
                campaign_id: effectiveCampaignId,
                sequence_id: effectiveSequenceId,
                message_id: typedMessage?.id || null,
                current_node_id: nextNodeId,
                trigger_context: {
                  ...(triggerContext || {}),
                  instanceId: activeInstanceId,
                  waitingNodeId: node.id,
                  resumeNodeId: nextNodeId,
                  timeoutNodeId: timeoutNodeId,
                  waitingType: "user_input"
                },
                nodes_data: sortedNodes,
                destinations: activeDestinations,
                status: "paused",
                resume_at: null,
                nodes_processed: nodesProcessed + 1,
                nodes_failed: nodesFailed,
              }, { onConflict: "user_id,sequence_id" });

            return new Response(
              JSON.stringify({
                success: true,
                status: "waiting_for_user_input",
                executionId: workflowExecutionId,
                message: "Execution paused waiting for user response (empty prompt)."
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Send this node to all destinations in parallel
        const nextActiveDestinations: DestinationData[] = [];
        const nodeSendResults: Array<{ destination: string; status: string }> = [];
        let pauseForPoll = false;
        let pauseForUserInput = false;
        let userInputNextNodeId: string | null = null;
        let userInputTimeoutNodeId: string | null = null;

        const destResults = await Promise.allSettled(
          activeDestinations.map(async (dest) => {
            const action = getActionForNodeType(node.node_type);
            
            // Clone and format config, applying variable replacement
            const formattedConfig = formatNodeConfig(node.config, node.node_type);
            
            // Replace variables in text fields (including url and filename for dynamic media)
            const textFields = ["text", "content", "message", "caption", "title", "description", "footer", "question", "url", "filename"];
            textFields.forEach((field) => {
              if (typeof formattedConfig[field] === "string") {
                formattedConfig[field] = replaceVariables(formattedConfig[field] as string);
              }
            });
            formattedConfig.mention_all = Boolean(node.config?.mention_all ?? node.config?.mentionAll ?? false);
            
            const isNodePrivate = Boolean(
              formattedConfig.sendPrivate ?? formattedConfig.send_private ?? node.config?.sendPrivate ?? node.config?.send_private ?? false
            );
            const targetDestJid = (isNodePrivate && triggerContext?.respondentPhone)
              ? (triggerContext.respondentJid && triggerContext.respondentJid.includes('@s.whatsapp.net') ? triggerContext.respondentJid : `${triggerContext.respondentPhone}@s.whatsapp.net`)
              : dest.group_jid;
            const targetDestName = (isNodePrivate && triggerContext?.respondentPhone)
              ? (triggerContext.respondentName || triggerContext.respondentPhone)
              : dest.group_name;

            const payload = buildStandardPayload({
              action,
              node: {
                id: node.id,
                type: node.node_type,
                order: node.node_order,
                config: formattedConfig,
              },
              campaign: {
                id: typedCampaign.id || effectiveSequenceId,
                name: typedCampaign.name || (typedCampaign.name || 'Workflow'),
              },
              instance: {
                id: activeInstanceId,
                name: instance.name,
                phone: instance.phone || "",
                provider: instance.provider,
                externalId: instance.external_instance_id || instance.id || "",
                externalToken: instance.external_instance_token || "",
              },
              destination: {
                jid: targetDestJid,
                name: targetDestName,
                phone: triggerContext?.respondentPhone || dest.recipient_phone || dest.phone || "",
              },
            });

            const sendStartTime = Date.now();

            // Create log entry
            const { data: logEntry } = await supabase
              .from("group_message_logs")
              .insert({
                user_id: userId,
                group_campaign_id: typedCampaign.id || effectiveSequenceId,
                message_id: typedMessage?.id || null,
                sequence_id: effectiveSequenceId,
                node_type: node.node_type,
                node_order: node.node_order,
                group_jid: dest.group_jid,
                group_name: dest.group_name,
                recipient_phone: dest.isPrivate ? triggerContext?.respondentPhone : null,
                instance_id: activeInstanceId,
                instance_name: instance.name,
                campaign_name: typedCampaign.name || (typedCampaign.name || 'Workflow'),
                status: "sending",
                payload,
              })
              .select()
              .single();

            const msgText = (formattedConfig.text || formattedConfig.content || formattedConfig.message || formattedConfig.question || formattedConfig.caption || "") as string;
            const mediaUrl = (formattedConfig.url || formattedConfig.mediaUrl || formattedConfig.image || formattedConfig.fileUrl || formattedConfig.audio || formattedConfig.video || formattedConfig.document || "") as string;
            const isGroupDest = !isNodePrivate && Boolean(
              isWorkflowGroupMode ||
              dest.group_jid?.includes("@g.us") ||
              dest.group_jid?.includes("-group") ||
              !dest.isPrivate
            );
            const destPhone = isGroupDest
              ? (dest.group_jid || "")
              : ((isNodePrivate && triggerContext?.respondentPhone)
                  ? triggerContext.respondentPhone
                  : (dest.group_jid ? dest.group_jid.split("@")[0] : triggerContext?.respondentPhone || triggerContext?.contactPhone || "")
                );
            const destName = isGroupDest
              ? (dest.group_name || dest.group_jid)
              : (isNodePrivate
                  ? (triggerContext?.respondentName || triggerContext?.respondentPhone)
                  : (dest.group_name || triggerContext?.respondentName)
                );
            const effectiveCompanyId = triggerContext?.companyId || typedCampaign?.company_id || "dcb34e9a-1510-4137-aecd-cec0c6d548c4";

            // Reflete o status "enviando" imediatamente no chat (reloginho 🕒)
            let pendingChatSync: { conversationId?: string; messageId?: string } | null = null;
            if ((msgText || mediaUrl) && destPhone) {
              pendingChatSync = await syncSentMessageToChat(supabase, {
                companyId: effectiveCompanyId,
                instanceId: activeInstanceId,
                phone: destPhone,
                name: destName,
                leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                isGroup: isGroupDest,
                groupJid: isGroupDest ? dest.group_jid : undefined,
                body: msgText,
                mediaUrl: mediaUrl || null,
                messageType: node.node_type === "message" ? (mediaUrl ? "image" : "text") : node.node_type,
                mediaType: node.node_type === "message" ? (mediaUrl ? "image" : null) : node.node_type,
                status: "sending",
              });
            }

            try {
              const result = await sendWhatsAppMessage(payload);

              const responseTimeMs = Date.now() - sendStartTime;
              const responseData = result.details || result;

              // Parse Z-API response
              const zaapId = result.zaapId || null;
              const externalMessageId = result.messageId || null;

              // Update log
              if (logEntry?.id) {
                await supabase
                  .from("group_message_logs")
                  .update({
                    status: result.ok ? "sent" : "failed",
                    error_message: result.ok ? null : `HTTP ${result.status}`,
                    response_time_ms: responseTimeMs,
                    provider_response: responseData,
                    zaap_id: zaapId,
                    external_message_id: externalMessageId,
                    payload: {
                      ...payload,
                      zapiUrl: result.requestUrl,
                      zapiBody: result.requestBody,
                      curl: result.curl,
                    } as any,
                  })
                  .eq("id", logEntry.id);
              }

              if (result.ok) {
                console.log(`[ExecuteMessage] ✅ Node ${node.node_type} sent to ${dest.group_name}${dest.isPrivate ? ' (private)' : ''}`);
                webhookResponses.push({ nodeType: node.node_type, nodeOrder: node.node_order, destination: dest.group_jid, status: "sent", data: responseData });

                // Atualiza mensagem existente para "sent"
                if (pendingChatSync?.messageId) {
                  await syncSentMessageToChat(supabase, {
                    chatMessageId: pendingChatSync.messageId,
                    conversationId: pendingChatSync.conversationId,
                    status: "sent",
                    externalMessageId: externalMessageId || zaapId || null,
                    body: msgText,
                    mediaUrl: mediaUrl || null,
                  });
                } else if ((msgText || mediaUrl) && destPhone) {
                  await syncSentMessageToChat(supabase, {
                    companyId: effectiveCompanyId,
                    instanceId: activeInstanceId,
                    phone: destPhone,
                    name: destName,
                    leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                    isGroup: isGroupDest,
                    groupJid: isGroupDest ? dest.group_jid : undefined,
                    body: msgText,
                    mediaUrl: mediaUrl || null,
                    messageType: node.node_type === "message" ? (mediaUrl ? "image" : "text") : node.node_type,
                    mediaType: node.node_type === "message" ? (mediaUrl ? "image" : null) : node.node_type,
                    externalMessageId: externalMessageId || zaapId || null,
                    status: "sent",
                  });
                }

                // If this is a poll node and send was successful, register in poll_messages
                if (node.node_type === "poll" && (zaapId || externalMessageId)) {
                  const pollQuestion = (formattedConfig.question as string) || (formattedConfig.title as string) || "";
                  const rawOptions = (formattedConfig.options as any[]) || [];
                  const pollOptions = rawOptions.map((opt, idx) => {
                    if (typeof opt === 'string') return { id: `poll_opt_${idx + 1}`, label: replaceVariables(opt) };
                    if (opt && typeof opt === 'object') return { id: opt.id || `poll_opt_${idx + 1}`, label: replaceVariables(opt.label || '') };
                    return { id: `poll_opt_${idx + 1}`, label: String(opt || '') };
                  });
                  
                  const optionActions = ((node.config as Record<string, unknown>).optionActions as Record<string, unknown>) || {};
                  const messageIdForInsert = externalMessageId || zaapId;
                  if (!messageIdForInsert) {
                    console.error(`[ExecuteMessage] ❌ Cannot register poll: both externalMessageId and zaapId are missing`);
                  } else {
                    const pollPayload = {
                      user_id: userId,
                      message_id: messageIdForInsert,
                      zaap_id: zaapId,
                      node_id: node.id,
                      sequence_id: effectiveSequenceId,
                      campaign_id: typedCampaign.id || effectiveSequenceId,
                      group_jid: dest.group_jid,
                      instance_id: instance.id,
                      question_text: pollQuestion,
                      options: pollOptions,
                      option_actions: optionActions,
                      sent_at: new Date().toISOString(),
                    };
                    
                    const { error: pollInsertError } = await supabase
                      .from("poll_messages")
                      .insert(pollPayload);
                    
                    if (pollInsertError) {
                      console.error(`[ExecuteMessage] ❌ Failed to register poll:`, pollInsertError.message);
                    } else {
                      console.log(`[ExecuteMessage] ✅ Poll registered: zaap_id=${zaapId}, message_id=${messageIdForInsert}`);
                    }
                  }

                  if (!triggerContext?.resumedFromPoll) {
                    pauseForPoll = true;
                  }
                }

                if (node.node_type === "user_input" || node.node_type === "question" || node.node_type === "pergunta") {
                  pauseForUserInput = true;
                  const nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path !== "timeout" && c.condition_path !== "error")
                    || connections.find(c => c.source_node_id === node.id);
                  userInputNextNodeId = nextConn ? nextConn.target_node_id : null;

                  const timeoutConn = connections.find(c => c.source_node_id === node.id && c.condition_path === "timeout");
                  userInputTimeoutNodeId = timeoutConn ? timeoutConn.target_node_id : null;

                  const rawDestPhone = triggerContext?.respondentPhone || (dest.group_jid ? dest.group_jid.split("@")[0] : "");
                  const destPhoneClean = rawDestPhone ? rawDestPhone.replace(/\D/g, "") : "";
                  const targetField = ((node.config as any)?.targetField || "") as string;
                  const timeoutMs = ((node.config as any)?.timeoutMs || 3600000) as number;

                  let effectiveLeadId = triggerContext?.leadId || null;
                  if (!effectiveLeadId && destPhoneClean) {
                    const suffix = destPhoneClean.slice(-8);
                    const { data: leadFound } = await supabase
                      .from("leads")
                      .select("id")
                      .or(`phone.eq.${destPhoneClean},phone.ilike.%${suffix}`)
                      .limit(1)
                      .maybeSingle();
                    if (leadFound) effectiveLeadId = leadFound.id;
                  }

                  if (destPhoneClean || dest.group_jid) {
                    await supabase.from("workflow_user_inputs").insert({
                      company_id: typedCampaign.company_id || triggerContext?.companyId || null,
                      user_id: userId,
                      execution_id: workflowExecutionId,
                      sequence_id: effectiveSequenceId,
                      node_id: node.id,
                      lead_id: effectiveLeadId,
                      instance_id: activeInstanceId,
                      phone: destPhoneClean || (dest.group_jid ? dest.group_jid.replace(/\D/g, "") : ""),
                      group_jid: dest.group_jid,
                      target_field: targetField || null,
                      timeout_ms: timeoutMs,
                      status: "waiting",
                      expires_at: new Date(Date.now() + timeoutMs).toISOString(),
                    });
                  }
                }

                // Delivery wait only for 1-on-1 chats, never for groups
                if (!isGroupDest && activeDestinations.length === 1) {
                  await waitForMessageDelivery(supabase, result.messageId, result.zaapId, 2500);
                }

                return { ok: true, dest, status: "sent" };
              } else {
                console.log(`[ExecuteMessage] ❌ Node ${node.node_type} failed for ${dest.group_name}: HTTP ${result.status}`);
                webhookResponses.push({ nodeType: node.node_type, nodeOrder: node.node_order, destination: dest.group_jid, status: "failed", data: responseData });

                const nodeFailedError = (result as any).error || (responseData && typeof responseData === "object" && ((responseData as any).message || (responseData as any).error)) || `HTTP ${result.status}`;
                if (pendingChatSync?.messageId) {
                  await syncSentMessageToChat(supabase, {
                    chatMessageId: pendingChatSync.messageId,
                    conversationId: pendingChatSync.conversationId,
                    status: "failed",
                    errorMessage: String(nodeFailedError),
                    body: msgText,
                    mediaUrl: mediaUrl || null,
                  });
                } else if ((msgText || mediaUrl) && destPhone) {
                  await syncSentMessageToChat(supabase, {
                    companyId: effectiveCompanyId,
                    instanceId: activeInstanceId,
                    phone: destPhone,
                    name: destName,
                    leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                    isGroup: isGroupDest,
                    groupJid: isGroupDest ? dest.group_jid : undefined,
                    body: msgText,
                    mediaUrl: mediaUrl || null,
                    messageType: node.node_type === "message" ? (mediaUrl ? "image" : "text") : node.node_type,
                    mediaType: node.node_type === "message" ? (mediaUrl ? "image" : null) : node.node_type,
                    externalMessageId: externalMessageId || zaapId || null,
                    status: "failed",
                    errorMessage: String(nodeFailedError),
                  });
                }
                return { ok: false, dest, status: "failed", error: String(nodeFailedError) };
              }
            } catch (err: any) {
              const errMessage = err instanceof Error ? err.message : "Unknown error";
              console.error(`[ExecuteMessage] ❌ Error sending node to ${dest.group_name}:`, err);

              if (logEntry?.id) {
                await supabase
                  .from("group_message_logs")
                  .update({
                    status: "failed",
                    error_message: errMessage,
                    response_time_ms: Date.now() - sendStartTime,
                  })
                  .eq("id", logEntry.id);
              }

              if (pendingChatSync?.messageId) {
                await syncSentMessageToChat(supabase, {
                  chatMessageId: pendingChatSync.messageId,
                  conversationId: pendingChatSync.conversationId,
                  status: "failed",
                  errorMessage: errMessage,
                  body: msgText,
                  mediaUrl: mediaUrl || null,
                });
              } else if ((msgText || mediaUrl) && destPhone) {
                await syncSentMessageToChat(supabase, {
                  companyId: effectiveCompanyId,
                  instanceId: activeInstanceId,
                  phone: destPhone,
                  name: destName,
                  leadId: isGroupDest ? null : (triggerContext?.leadId || null),
                  isGroup: isGroupDest,
                  groupJid: isGroupDest ? dest.group_jid : undefined,
                  body: msgText,
                  mediaUrl: mediaUrl || null,
                  messageType: node.node_type === "message" ? (mediaUrl ? "image" : "text") : node.node_type,
                  mediaType: node.node_type === "message" ? (mediaUrl ? "image" : null) : node.node_type,
                  externalMessageId: null,
                  status: "failed",
                  errorMessage: errMessage,
                });
              }
              return { ok: false, dest, status: "failed", error: errMessage };
            }
          })
        );

        for (const r of destResults) {
          if (r.status === "fulfilled") {
            nodeSendResults.push({ destination: r.value.dest.group_jid, status: r.value.status });
            if (r.value.ok) {
              nextActiveDestinations.push(r.value.dest);
            } else {
              nodesFailed++;
            }
          } else {
            nodesFailed++;
            nodeSendResults.push({ destination: "unknown", status: "failed" });
          }
        }

        if (pauseForPoll) {
          console.log(`[ExecuteMessage] ⏸️ Standalone poll message sent in node ${node.id}. Pausing workflow ${workflowExecutionId}...`);

          await supabase
            .from("workflow_executions")
            .update({ status: "waiting", updated_at: new Date().toISOString() })
            .eq("id", workflowExecutionId);

          await supabase
            .from("sequence_executions")
            .upsert({
              user_id: userId,
              campaign_id: effectiveCampaignId,
              sequence_id: effectiveSequenceId,
              message_id: typedMessage?.id || null,
              trigger_context: {
                ...(triggerContext || {}),
                instanceId: activeInstanceId,
                resumeNodeId: node.id,
              },
              nodes_data: sortedNodes,
              destinations: nextActiveDestinations.length > 0 ? nextActiveDestinations : activeDestinations,
              status: "paused",
              resume_at: null,
              nodes_processed: nodesProcessed + 1,
              nodes_failed: nodesFailed,
            }, { onConflict: "user_id,sequence_id" });

          return new Response(
            JSON.stringify({
              success: true,
              status: "paused",
              executionId: workflowExecutionId,
              message: "Execution paused waiting for poll response."
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (pauseForUserInput) {
          console.log(`[ExecuteMessage] ⏸️ Standalone user_input message sent in node ${node.id}. Pausing workflow ${workflowExecutionId}...`);

          await supabase
            .from("workflow_executions")
            .update({
              status: "waiting",
              updated_at: new Date().toISOString(),
              trigger_payload: {
                ...(triggerContext || {}),
                instanceId: activeInstanceId,
                waitingNodeId: node.id,
                resumeNodeId: userInputNextNodeId,
                timeoutNodeId: userInputTimeoutNodeId,
                waitingType: "user_input"
              }
            })
            .eq("id", workflowExecutionId);

          await supabase
            .from("sequence_executions")
            .upsert({
              id: workflowExecutionId,
              user_id: userId,
              campaign_id: effectiveCampaignId,
              sequence_id: effectiveSequenceId,
              message_id: typedMessage?.id || null,
              current_node_id: userInputNextNodeId,
              trigger_context: {
                ...(triggerContext || {}),
                instanceId: activeInstanceId,
                waitingNodeId: node.id,
                resumeNodeId: userInputNextNodeId,
                timeoutNodeId: userInputTimeoutNodeId,
                waitingType: "user_input"
              },
              nodes_data: sortedNodes,
              destinations: nextActiveDestinations.length > 0 ? nextActiveDestinations : activeDestinations,
              status: "paused",
              resume_at: null,
              nodes_processed: nodesProcessed + 1,
              nodes_failed: nodesFailed,
            }, { onConflict: "user_id,sequence_id" });

          return new Response(
            JSON.stringify({
              success: true,
              status: "waiting_for_user_input",
              executionId: workflowExecutionId,
              message: "Execution paused waiting for user response."
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await logNodeExecution(supabase, {
          executionId: workflowExecutionId, userId, nodeId: node.id, nodeType: node.node_type,
          status: nodeSendResults.some(r => r.status === "failed") ? "error" : "success", startedAt: nodeStartedAt,
          input: node.config, output: { results: nodeSendResults },
        });

        activeDestinations = nextActiveDestinations;
        if (activeDestinations.length === 0) {
          console.log(`[ExecuteMessage] No active destinations left, stopping sequence`);
          break;
        }

        // Advance to the next connected node — this branch handles every
        // "sendable" node type that fell through the specific-type checks
        // above (message/media/poll/buttons/list/etc).
        const nextConn = connections.find(c => c.source_node_id === node.id && c.condition_path !== "timeout" && c.condition_path !== "error")
          || connections.find(c => c.source_node_id === node.id);
        currentNodeId = nextConn ? nextConn.target_node_id : null;
        nodesProcessed++;
      }

      // If this was a resumed execution, update the execution record
      if (isResumedExecution && executionId) {
        await supabase
          .from("sequence_executions")
          .update({
            status: nodesFailed === 0 ? "completed" : "failed",
            nodes_processed: nodesProcessed,
            nodes_failed: nodesFailed,
            updated_at: new Date().toISOString(),
          })
          .eq("id", executionId);
        
        console.log(`[ExecuteMessage] ✅ Resumed execution ${executionId} completed`);
        
        // Only mark old "running" executions for the same sequence and SAME destination as superseded
        if (effectiveSequenceId && executionId) {
          const currentDestJid = (triggerContext?.groupJid || triggerContext?.respondentJid || triggerContext?.respondentPhone) as string | undefined;
          if (currentDestJid) {
            try {
              const { data: supersededExecutions } = await supabase
                .from("sequence_executions")
                .update({
                  status: "superseded",
                  error_message: `Superseded by execution ${executionId}`,
                  updated_at: new Date().toISOString(),
                })
                .eq("sequence_id", effectiveSequenceId)
                .eq("status", "running")
                .neq("id", executionId)
                .contains("trigger_context", { groupJid: currentDestJid })
                .select("id");
              
              if (supersededExecutions && supersededExecutions.length > 0) {
                console.log(`[ExecuteMessage] Marked ${supersededExecutions.length} old executions for ${currentDestJid} as superseded`);
              }
            } catch (supErr) {
              console.warn("[ExecuteMessage] Non-fatal error marking superseded executions:", supErr);
            }
          }
        }
      }

      if (nodesFailed > 0 && !firstNodeError) {
        const firstFailed = webhookResponses.find(r => r.status === "failed");
        if (firstFailed && firstFailed.data) {
          if (typeof firstFailed.data === 'string') {
            firstNodeError = firstFailed.data;
          } else if (typeof firstFailed.data === 'object') {
            firstNodeError = (firstFailed.data as any).error || (firstFailed.data as any).message || JSON.stringify(firstFailed.data);
          }
        }
      }

      // Finalize this run's workflow_executions row (observability, non-fatal)
      try {
        let finalDurationMs = Date.now() - startTime;
        if (isResumedExecution && executionId) {
          const { data: origWf } = await supabase
            .from("workflow_executions")
            .select("started_at")
            .eq("id", executionId)
            .maybeSingle();
          if (origWf?.started_at) {
            finalDurationMs = Math.max(0, Date.now() - new Date(origWf.started_at).getTime());
          }
        }
        await supabase.from("workflow_executions")
          .update({
            status: nodesFailed === 0 ? "success" : "error",
            finished_at: new Date().toISOString(),
            duration_ms: finalDurationMs,
            error_message: nodesFailed > 0 ? (firstNodeError || `${nodesFailed} node(s) failed`) : null,
          })
          .eq("id", workflowExecutionId);
      } catch (err) {
        console.error("[ExecuteMessage] Failed to finalize workflow_executions row (non-fatal):", err);
      }
    }

    const totalTimeMs = Date.now() - startTime;

    console.log(`[ExecuteMessage] ✅ Completed: ${nodesProcessed} nodes processed, ${nodesFailed} failed, ${totalTimeMs}ms`);

    return new Response(
      JSON.stringify({
        success: nodesFailed === 0,
        status: "completed",
        nodesProcessed,
        nodesFailed,
        groupsProcessed: groups.length,
        totalTimeMs,
        webhookResponses,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const totalTimeMs = Date.now() - startTime;
    console.error("[ExecuteMessage] Fatal error:", error);
    
    if (globalWorkflowExecutionId && supabaseGlobal) {
      try {
        await supabaseGlobal.from("workflow_executions")
          .update({
            status: "error",
            finished_at: new Date().toISOString(),
            duration_ms: totalTimeMs,
            error_message: error instanceof Error ? error.message : "Unknown fatal error",
          })
          .eq("id", globalWorkflowExecutionId);
      } catch (updateErr) {
        console.error("[ExecuteMessage] Failed to mark workflow_execution as error:", updateErr);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        totalTimeMs,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
