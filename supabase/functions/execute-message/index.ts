import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default webhook URL for messages category
const DEFAULT_MESSAGES_WEBHOOK = "https://n8n-n8n.nuwfic.easypanel.host/webhook/send_messages";

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
  // For manual single-node execution
  manualNodeIndex?: number;
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

const calculateDelayMs = (config: Record<string, unknown>): number => {
  const days = (config.days as number) || 0;
  const hours = (config.hours as number) || 0;
  const minutes = (config.minutes as number) || 0;
  const seconds = (config.seconds as number) || 0;
  
  return (
    days * 86400000 +
    hours * 3600000 +
    minutes * 60000 +
    seconds * 1000
  );
};

const getActionForNodeType = (nodeType: string): string => {
  const actionMap: Record<string, string> = {
    message: "message.send_text",
    text: "message.send_text",
    image: "message.send_image",
    video: "message.send_video",
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

// ============= Main handler =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: ExecuteMessageRequest = await req.json();
    const { messageId, campaignId, sequenceId, triggerContext, executionId, startFromNodeIndex, manualNodeIndex } = body;

    // Check if this is a resumed execution
    const isResumedExecution = !!executionId && startFromNodeIndex !== undefined;

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
    const { data: campaign, error: campaignError } = await supabase
      .from("group_campaigns")
      .select(`
        id,
        name,
        status,
        instance_id,
        user_id,
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
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError || !campaign) {
      console.error("[ExecuteMessage] Campaign not found:", campaignError, "campaignId:", campaignId);
      return new Response(
        JSON.stringify({ error: "Campaign not found", campaignId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedCampaign = campaign as unknown as CampaignData;
    const instance = typedCampaign.instances;

    if (!typedCampaign.instance_id || !instance) {
      console.error("[ExecuteMessage] Campaign has no instance linked:", campaignId);
      return new Response(
        JSON.stringify({
          error: "Campaign has no WhatsApp instance linked. Open the campaign config and select an instance.",
          campaignId,
          campaignName: typedCampaign.name,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (instance.status !== "connected") {
      return new Response(
        JSON.stringify({ error: "Instance is not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine user_id for logging and webhook lookup
    const userId = typedMessage?.user_id || typedCampaign.user_id;
    
    // For triggered execution with sendPrivate, we send to the respondent, not to groups
    const sendToPrivate = isTriggeredExecution && triggerContext?.sendPrivate;
    
    // Get linked groups (not needed for private sends, but we fetch anyway for logging)
    const { data: linkedGroups, error: groupsError } = await supabase
      .from("campaign_groups")
      .select("id, group_jid, group_name")
      .eq("campaign_id", campaignId);

    // For triggered private sends, we don't need groups
    if (!sendToPrivate && (groupsError || !linkedGroups || linkedGroups.length === 0)) {
      return new Response(
        JSON.stringify({ error: "No linked groups found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groups = (linkedGroups || []) as LinkedGroup[];

    // Get user's webhook config
    const { data: webhookConfig } = await supabase
      .from("webhook_configs")
      .select("url, is_active")
      .eq("user_id", userId)
      .eq("category", "messages")
      .maybeSingle();

    const webhookUrl = (webhookConfig?.is_active && webhookConfig?.url) 
      ? webhookConfig.url 
      : DEFAULT_MESSAGES_WEBHOOK;

    // Get sequence nodes if sequence is linked
    let sequenceNodes: SequenceNode[] = [];
    const effectiveSequenceId = sequenceId || typedMessage?.sequence_id;
    
    if (effectiveSequenceId) {
      const { data: nodes } = await supabase
        .from("sequence_nodes")
        .select("id, node_type, node_order, config")
        .eq("sequence_id", effectiveSequenceId)
        .order("node_order", { ascending: true });
      
      sequenceNodes = (nodes || []) as SequenceNode[];
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
      console.log(`[ExecuteMessage] Manual node execution: filtered to node order ${manualNodeIndex} (${sequenceNodes[0].node_type})`);
    }

    console.log(`[ExecuteMessage] ${sequenceNodes.length} sequence nodes, triggered: ${isTriggeredExecution}, sendPrivate: ${sendToPrivate}, webhook: ${webhookUrl}`);

    let nodesProcessed = isResumedExecution ? (startFromNodeIndex || 0) : 0;
    let nodesFailed = 0;
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
            externalId: instance.external_instance_id || "",
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
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const responseTimeMs = Date.now() - sendStartTime;
          const responseText = await response.text();
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = { raw: responseText };
          }

          // Parse Z-API response
          let zaapId = null;
          let externalMessageId = null;
          if (Array.isArray(responseData) && responseData.length > 0) {
            const firstResult = responseData[0];
            zaapId = firstResult.zaapId || null;
            externalMessageId = firstResult.messageId || firstResult.id || null;
          }

          // Update log
          if (logEntry?.id) {
            await supabase
              .from("group_message_logs")
              .update({
                status: response.ok ? "sent" : "failed",
                error_message: response.ok ? null : `HTTP ${response.status}`,
                response_time_ms: responseTimeMs,
                provider_response: responseData,
                zaap_id: zaapId,
                external_message_id: externalMessageId,
              })
              .eq("id", logEntry.id);
          }

          if (response.ok) {
            nodesProcessed++;
            console.log(`[ExecuteMessage] ✅ Sent to ${group.group_name}`);
          } else {
            nodesFailed++;
            console.log(`[ExecuteMessage] ❌ Failed for ${group.group_name}: HTTP ${response.status}`);
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

      // Helper function to replace variables in text
      const replaceVariables = (text: string): string => {
        if (!text) return text;
        let result = text;
        if (triggerContext) {
          // Built-in variables
          result = result.replace(/\{\{name\}\}/g, triggerContext.respondentName || "");
          result = result.replace(/\{\{phone\}\}/g, triggerContext.respondentPhone || "");
          result = result.replace(/\{\{option\}\}/g, triggerContext.pollOptionText || "");
          
          // Custom fields from webhook payload
          if (triggerContext.customFields) {
            for (const [key, value] of Object.entries(triggerContext.customFields)) {
              const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
              result = result.replace(regex, value || "");
            }
          }
        }
        return result;
      };

      // Determine destinations based on targetPhones or sendToPrivate flag
      const targetPhones = body.targetPhones;
      const destinations: DestinationData[] = targetPhones && targetPhones.length > 0
        ? targetPhones.map((phone: string) => ({
            group_jid: `${phone}@s.whatsapp.net`,
            group_name: phone,
            isPrivate: true,
          }))
        : sendToPrivate && triggerContext
          ? [{ 
              group_jid: triggerContext.respondentJid, 
              group_name: triggerContext.respondentName || triggerContext.respondentPhone,
              isPrivate: true
            }]
          : groups.map(g => ({ group_jid: g.group_jid, group_name: g.group_name, isPrivate: false }));

      // Determine starting node index
      const startNodeIndex = isResumedExecution && startFromNodeIndex !== undefined ? startFromNodeIndex : 0;

      for (let nodeIndex = startNodeIndex; nodeIndex < sortedNodes.length; nodeIndex++) {
        const node = sortedNodes[nodeIndex];
        
        console.log(`[ExecuteMessage] Processing node ${nodeIndex + 1}/${sortedNodes.length}: ${node.node_type}`);

        // Handle DELAY nodes
        if (node.node_type === "delay") {
          const delayMs = calculateDelayMs(node.config);
          
          if (delayMs > MAX_DELAY_MS) {
            // Long delay - save state and schedule continuation
            const resumeAt = new Date(Date.now() + delayMs);
            
            console.log(`[ExecuteMessage] ⏱️ Long delay detected: ${delayMs}ms. Scheduling continuation for ${resumeAt.toISOString()}`);
            
            // Save execution state
            const { data: savedExecution, error: saveError } = await supabase
              .from("sequence_executions")
              .insert({
                user_id: userId,
                campaign_id: campaignId,
                sequence_id: effectiveSequenceId,
                message_id: typedMessage?.id || null,
                trigger_context: triggerContext || {},
                current_node_index: nodeIndex + 1, // Resume from next node
                nodes_data: sortedNodes,
                destinations: destinations,
                status: "paused",
                resume_at: resumeAt.toISOString(),
                nodes_processed: nodesProcessed,
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
              
              // Return partial response
              const totalTimeMs = Date.now() - startTime;
              return new Response(
                JSON.stringify({
                  success: true,
                  status: "paused",
                  executionId: savedExecution.id,
                  resumeAt: resumeAt.toISOString(),
                  nodesProcessed,
                  nodesFailed,
                  totalTimeMs,
                  message: `Execution paused. Will resume in ${Math.round(delayMs / 60000)} minutes.`,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          } else if (delayMs > 0) {
            // Short delay - wait inline
            console.log(`[ExecuteMessage] ⏱️ Short delay: waiting ${delayMs}ms`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          
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
          
          // Group management nodes operate on linked groups (using group_jid)
          for (const dest of destinations) {
            const payload = buildStandardPayload({
              action,
              node: { id: node.id, type: node.node_type, order: node.node_order, config: formattedConfig },
              campaign: { id: typedCampaign.id, name: typedCampaign.name },
              instance: {
                id: instance.id, name: instance.name, phone: instance.phone || "",
                provider: instance.provider, externalId: instance.external_instance_id || "",
                externalToken: instance.external_instance_token || "",
              },
              destination: { jid: dest.group_jid, name: dest.group_name },
            });

            const sendStartTime = Date.now();

            const { data: logEntry } = await supabase
              .from("group_message_logs")
              .insert({
                user_id: userId, group_campaign_id: typedCampaign.id,
                sequence_id: effectiveSequenceId, node_type: node.node_type,
                node_order: node.node_order, group_jid: dest.group_jid,
                group_name: dest.group_name, instance_id: instance.id,
                instance_name: instance.name, campaign_name: typedCampaign.name,
                status: "sending", payload,
              })
              .select().single();

            try {
              const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
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
                console.log(`[ExecuteMessage] ✅ Group mgmt ${node.node_type} on ${dest.group_name}`);
                webhookResponses.push({ nodeType: node.node_type, nodeOrder: node.node_order, destination: dest.group_jid, status: "sent", data: responseData });
              } else {
                nodesFailed++;
                console.log(`[ExecuteMessage] ❌ Group mgmt ${node.node_type} failed: HTTP ${response.status}`);
                webhookResponses.push({ nodeType: node.node_type, nodeOrder: node.node_order, destination: dest.group_jid, status: "failed", data: responseData });
              }
            } catch (err) {
              nodesFailed++;
              if (logEntry?.id) {
                await supabase.from("group_message_logs").update({
                  status: "failed", error_message: err instanceof Error ? err.message : "Unknown error",
                  response_time_ms: Date.now() - sendStartTime,
                }).eq("id", logEntry.id);
              }
            }
          }

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
              id: typedCampaign.id,
              name: typedCampaign.name,
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
              id: instance.id,
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
              user_id: userId, group_campaign_id: typedCampaign.id,
              sequence_id: effectiveSequenceId, node_type: node.node_type,
              node_order: node.node_order, instance_id: instance.id,
              instance_name: instance.name, campaign_name: typedCampaign.name,
              status: "sending", payload: forwardPayload,
            })
            .select().single();

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
          }

          nodesProcessed++;
          continue;
        }

        // Send this node to all destinations
        for (const dest of destinations) {
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
          
          const payload = buildStandardPayload({
            action,
            node: {
              id: node.id,
              type: node.node_type,
              order: node.node_order,
              config: formattedConfig,
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
              externalId: instance.external_instance_id || "",
              externalToken: instance.external_instance_token || "",
            },
            destination: {
              jid: dest.group_jid,
              name: dest.group_name,
            },
          });

          const sendStartTime = Date.now();

          // Create log entry
          const { data: logEntry } = await supabase
            .from("group_message_logs")
            .insert({
              user_id: userId,
              group_campaign_id: typedCampaign.id,
              message_id: typedMessage?.id || null,
              sequence_id: effectiveSequenceId,
              node_type: node.node_type,
              node_order: node.node_order,
              group_jid: dest.group_jid,
              group_name: dest.group_name,
              recipient_phone: dest.isPrivate ? triggerContext?.respondentPhone : null,
              instance_id: instance.id,
              instance_name: instance.name,
              campaign_name: typedCampaign.name,
              status: "sending",
              payload,
            })
            .select()
            .single();

          try {
            const response = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const responseTimeMs = Date.now() - sendStartTime;
            const responseText = await response.text();
            let responseData;
            try {
              responseData = JSON.parse(responseText);
            } catch {
              responseData = { raw: responseText };
            }

            // Parse Z-API response
            let zaapId = null;
            let externalMessageId = null;
            if (Array.isArray(responseData) && responseData.length > 0) {
              const firstResult = responseData[0];
              zaapId = firstResult.zaapId || null;
              externalMessageId = firstResult.messageId || firstResult.id || null;
            }

            // Update log
            if (logEntry?.id) {
              await supabase
                .from("group_message_logs")
                .update({
                  status: response.ok ? "sent" : "failed",
                  error_message: response.ok ? null : `HTTP ${response.status}`,
                  response_time_ms: responseTimeMs,
                  provider_response: responseData,
                  zaap_id: zaapId,
                  external_message_id: externalMessageId,
                })
                .eq("id", logEntry.id);
            }

            if (response.ok) {
              console.log(`[ExecuteMessage] ✅ Node ${node.node_type} sent to ${dest.group_name}${dest.isPrivate ? ' (private)' : ''}`);
              webhookResponses.push({ nodeType: node.node_type, nodeOrder: node.node_order, destination: dest.group_jid, status: "sent", data: responseData });
              
              // If this is a poll node and send was successful, register in poll_messages
              // (includes private sends — webhook-triggered sequences use sendPrivate=true and still need lookup by message_id/zaap_id)
              if (node.node_type === "poll" && (zaapId || externalMessageId)) {
                // Use formattedConfig which has variables already replaced (not node.config which has templates)
                const pollQuestion = (formattedConfig.question as string) || (formattedConfig.title as string) || "";
                
                // Also replace variables in options array
                const rawOptions = (formattedConfig.options as string[]) || [];
                const pollOptions = rawOptions.map(opt => typeof opt === 'string' ? replaceVariables(opt) : opt);
                
                // option_actions still comes from original config (they are action configs, not text)
                const optionActions = ((node.config as Record<string, unknown>).optionActions as Record<string, unknown>) || {};
                
                // CRITICAL: message_id has UNIQUE constraint. Never insert empty string.
                // Use externalMessageId when present, otherwise fall back to zaapId (Z-API always returns one).
                const messageIdForInsert = externalMessageId || zaapId;
                
                if (!messageIdForInsert) {
                  console.error(`[ExecuteMessage] ❌ Cannot register poll: both externalMessageId and zaapId are missing`);
                } else {
                  console.log(`[ExecuteMessage] Registering poll in poll_messages table with resolved values`);
                  console.log(`[ExecuteMessage] Poll question: ${pollQuestion.substring(0, 100)}...`);
                  
                  const pollPayload = {
                    user_id: userId,
                    message_id: messageIdForInsert,
                    zaap_id: zaapId,
                    node_id: node.id,
                    sequence_id: effectiveSequenceId,
                    campaign_id: typedCampaign.id,
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
                    console.error(`[ExecuteMessage] ❌ Failed to register poll:`, JSON.stringify({
                      error: pollInsertError.message,
                      code: pollInsertError.code,
                      details: pollInsertError.details,
                      hint: pollInsertError.hint,
                      payload: { ...pollPayload, options: `[${pollOptions.length} items]` },
                    }));
                  } else {
                    console.log(`[ExecuteMessage] ✅ Poll registered: zaap_id=${zaapId}, message_id=${messageIdForInsert}`);
                  }
                }
              }
            } else {
              nodesFailed++;
              console.log(`[ExecuteMessage] ❌ Node ${node.node_type} failed for ${dest.group_name}: HTTP ${response.status}`);
              webhookResponses.push({ nodeType: node.node_type, nodeOrder: node.node_order, destination: dest.group_jid, status: "failed", data: responseData });
            }
          } catch (err) {
            nodesFailed++;
            console.error(`[ExecuteMessage] ❌ Error sending node to ${dest.group_name}:`, err);
            
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
        
        // Mark other "running" executions for the same sequence as superseded
        if (effectiveSequenceId) {
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
            .select("id");
          
          if (supersededExecutions && supersededExecutions.length > 0) {
            console.log(`[ExecuteMessage] Marked ${supersededExecutions.length} old executions as superseded`);
          }
        }
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
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        totalTimeMs,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
