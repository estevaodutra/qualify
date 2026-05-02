import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default webhook URL for messages category
const DEFAULT_MESSAGES_WEBHOOK = "https://n8n-n8n.nuwfic.easypanel.host/webhook/messages";

// Max delay per node in Edge Function (20 seconds to stay under timeout)
const MAX_DELAY_MS = 20000;

interface ScheduleConfig {
  days: number[];
  times: string[];
  mode?: string;
}

interface GroupMessage {
  id: string;
  user_id: string;
  group_campaign_id: string;
  type: string;
  content: string;
  active: boolean;
  schedule: ScheduleConfig;
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

interface PausedExecution {
  id: string;
  user_id: string;
  campaign_id: string;
  sequence_id: string;
  message_id: string | null;
  trigger_context: Record<string, unknown>;
  current_node_index: number;
  nodes_data: SequenceNode[];
  destinations: Array<{ group_jid: string; group_name: string; isPrivate?: boolean }>;
  status: string;
  resume_at: string;
  nodes_processed: number;
  nodes_failed: number;
}

// ============= Standardized Payload Builder =============

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

// Format line breaks for WhatsApp/n8n (CRLF)
const formatLineBreaks = (text: string | null | undefined): string | null => {
  if (!text) return null;
  return text.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
};

// Process node config to format line breaks
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

// Calculate delay in milliseconds from node config
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

// Get action name based on node type
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
  };
  return actionMap[nodeType] || "message.send_text";
};

// ============= Main handler =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get current time in Brazil timezone
    const now = new Date();
    const brasilFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const brasilDateFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
    });

    const timeParts = brasilFormatter.formatToParts(now);
    const hour = timeParts.find(p => p.type === "hour")?.value || "00";
    const minute = timeParts.find(p => p.type === "minute")?.value || "00";
    const currentTime = `${hour}:${minute}`;
    
    // Get day of week (0 = Sunday, 6 = Saturday)
    const dayString = brasilDateFormatter.format(now);
    const dayMap: Record<string, number> = {
      "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
    };
    const currentDay = dayMap[dayString] ?? new Date().getDay();
    
    // Get today's date for execution tracking
    const todayDate = new Date().toISOString().split("T")[0];

    console.log(`[Scheduler] Running at ${currentTime} (Brazil), day ${currentDay}, date ${todayDate}`);

    // ============= CLEANUP ORPHAN EXECUTIONS =============
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    console.log(`[Scheduler] Checking for orphan executions older than ${thirtyMinutesAgo}`);
    
    const { data: orphanExecutions, error: orphanError } = await supabase
      .from("sequence_executions")
      .update({ 
        status: "orphaned",
        error_message: "Cleaned up - stuck as running for >30 minutes",
        updated_at: new Date().toISOString()
      })
      .eq("status", "running")
      .lt("updated_at", thirtyMinutesAgo)
      .select("id");

    if (orphanError) {
      console.error(`[Scheduler] Error cleaning orphan executions:`, JSON.stringify(orphanError));
    } else if (orphanExecutions && orphanExecutions.length > 0) {
      console.log(`[Scheduler] Cleaned up ${orphanExecutions.length} orphan executions:`, orphanExecutions.map(e => e.id));
    } else {
      console.log(`[Scheduler] No orphan executions to cleanup`);
    }

    // ============= PROCESS PAUSED EXECUTIONS FIRST =============
    const { data: pausedExecutions, error: pausedError } = await supabase
      .from("sequence_executions")
      .select("*")
      .eq("status", "paused")
      .lte("resume_at", now.toISOString());

    if (pausedError) {
      console.error("[Scheduler] Error fetching paused executions:", pausedError);
    } else if (pausedExecutions && pausedExecutions.length > 0) {
      console.log(`[Scheduler] Found ${pausedExecutions.length} paused executions ready to resume`);

      for (const execution of pausedExecutions as PausedExecution[]) {
        try {
          // Check if parent sequence is still active before resuming
          const { data: parentSequence } = await supabase
            .from("message_sequences")
            .select("active")
            .eq("id", execution.sequence_id)
            .single();

          if (!parentSequence || parentSequence.active === false) {
            console.log(`[Scheduler] Sequence ${execution.sequence_id} is inactive — cancelling execution ${execution.id}`);
            await supabase
              .from("sequence_executions")
              .update({ status: "cancelled", error_message: "Sequence deactivated", updated_at: new Date().toISOString() })
              .eq("id", execution.id);
            continue;
          }

          console.log(`[Scheduler] Resuming execution ${execution.id} from node ${execution.current_node_index}`);

          // Mark as running to prevent duplicate processing
          await supabase
            .from("sequence_executions")
            .update({ status: "running", updated_at: new Date().toISOString() })
            .eq("id", execution.id);

          // Call execute-message to continue processing
          const response = await fetch(`${supabaseUrl}/functions/v1/execute-message`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              campaignId: execution.campaign_id,
              sequenceId: execution.sequence_id,
              messageId: execution.message_id,
              triggerContext: execution.trigger_context,
              executionId: execution.id,
              startFromNodeIndex: execution.current_node_index,
            }),
          });

          const result = await response.json();
          console.log(`[Scheduler] Resumed execution ${execution.id} result:`, result);

        } catch (err) {
          console.error(`[Scheduler] Error resuming execution ${execution.id}:`, err);
          
          // Mark as failed
          await supabase
            .from("sequence_executions")
            .update({
              status: "failed",
              error_message: err instanceof Error ? err.message : "Unknown error",
              updated_at: new Date().toISOString(),
            })
            .eq("id", execution.id);
        }
      }
    }

    // ============= PROCESS SCHEDULED MESSAGES =============

    // Fetch all active scheduled messages
    const { data: messages, error: messagesError } = await supabase
      .from("group_messages")
      .select(`
        id,
        user_id,
        group_campaign_id,
        type,
        content,
        active,
        schedule,
        sequence_id,
        media_url,
        media_type,
        media_caption,
        mention_member,
        send_private,
        delay_seconds
      `)
      .eq("type", "scheduled")
      .eq("active", true);

    if (messagesError) {
      console.error("[Scheduler] Error fetching messages:", messagesError);
      throw messagesError;
    }

    console.log(`[Scheduler] Found ${messages?.length || 0} active scheduled messages`);

    // Filter messages that match current day and time
    const messagesToSend = (messages || []).filter((msg: GroupMessage) => {
      const schedule = msg.schedule as ScheduleConfig;
      if (!schedule?.days || !schedule?.times) {
        console.log(`[Scheduler] Message ${msg.id} has invalid schedule`);
        return false;
      }
      
      const matchesDay = schedule.days.includes(currentDay);
      const matchesTime = schedule.times.includes(currentTime);
      
      console.log(`[Scheduler] Message ${msg.id}: day ${currentDay} in [${schedule.days.join(",")}]=${matchesDay}, time ${currentTime} in [${schedule.times.join(",")}]=${matchesTime}`);
      
      return matchesDay && matchesTime;
    });

    console.log(`[Scheduler] ${messagesToSend.length} messages match current schedule`);

    const results: Array<{ messageId: string; status: string; nodesProcessed?: number; error?: string }> = [];

    for (const message of messagesToSend) {
      try {
        // Check if already executed today at this time
        const { data: existingExecution } = await supabase
          .from("scheduled_message_executions")
          .select("id")
          .eq("message_id", message.id)
          .eq("scheduled_date", todayDate)
          .eq("scheduled_time", currentTime)
          .maybeSingle();

        if (existingExecution) {
          console.log(`[Scheduler] Message ${message.id} already executed at ${currentTime} today, skipping`);
          results.push({ messageId: message.id, status: "skipped", error: "Already executed" });
          continue;
        }

        // Check if sequence already has an active execution (paused or running)
        if (message.sequence_id) {
          const { data: activeExecution } = await supabase
            .from("sequence_executions")
            .select("id, current_node_index, status")
            .eq("sequence_id", message.sequence_id)
            .in("status", ["paused", "running"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (activeExecution) {
            console.log(`[Scheduler] Sequence ${message.sequence_id} already has active execution ${activeExecution.id} at node ${activeExecution.current_node_index}, skipping new trigger`);
            results.push({ 
              messageId: message.id, 
              status: "skipped", 
              error: "Execution already in progress" 
            });
            continue;
          }
        }

        // Get campaign details
        const { data: campaign, error: campaignError } = await supabase
          .from("group_campaigns")
          .select(`
            id,
            name,
            status,
            instance_id,
            instances!inner(
              id,
              name,
              phone,
              provider,
              external_instance_id,
              external_instance_token,
              status
            )
          `)
          .eq("id", message.group_campaign_id)
          .single();

        if (campaignError || !campaign) {
          console.error(`[Scheduler] Campaign not found for message ${message.id}:`, campaignError);
          results.push({ messageId: message.id, status: "failed", error: "Campaign not found" });
          continue;
        }

        if (campaign.status !== "active") {
          console.log(`[Scheduler] Campaign ${campaign.id} is not active, skipping`);
          results.push({ messageId: message.id, status: "skipped", error: "Campaign not active" });
          continue;
        }

        const instance = campaign.instances as unknown as InstanceData;

        if (instance.status !== "connected") {
          console.log(`[Scheduler] Instance ${instance.id} is not connected, skipping`);
          results.push({ messageId: message.id, status: "skipped", error: "Instance not connected" });
          continue;
        }

        // Get linked groups
        const { data: linkedGroups, error: groupsError } = await supabase
          .from("campaign_groups")
          .select("group_jid, group_name")
          .eq("campaign_id", campaign.id);

        if (groupsError || !linkedGroups || linkedGroups.length === 0) {
          console.log(`[Scheduler] No linked groups for campaign ${campaign.id}`);
          results.push({ messageId: message.id, status: "skipped", error: "No linked groups" });
          continue;
        }

        // Get user's webhook config for messages
        const { data: webhookConfig } = await supabase
          .from("webhook_configs")
          .select("url, is_active")
          .eq("user_id", message.user_id)
          .eq("category", "messages")
          .maybeSingle();

        const webhookUrl = (webhookConfig?.is_active && webhookConfig?.url) 
          ? webhookConfig.url 
          : DEFAULT_MESSAGES_WEBHOOK;

        // Get sequence nodes if sequence is linked
        let sequenceNodes: SequenceNode[] = [];
        if (message.sequence_id) {
          const { data: nodes } = await supabase
            .from("sequence_nodes")
            .select("id, node_type, node_order, config")
            .eq("sequence_id", message.sequence_id)
            .order("node_order", { ascending: true });
          
          sequenceNodes = (nodes || []) as SequenceNode[];
        }

        console.log(`[Scheduler] Message ${message.id}: ${sequenceNodes.length} sequence nodes, ${linkedGroups.length} groups`);

        // Record execution start
        await supabase
          .from("scheduled_message_executions")
          .insert({
            message_id: message.id,
            scheduled_date: todayDate,
            scheduled_time: currentTime,
            status: "executing",
            groups_count: linkedGroups.length,
            user_id: message.user_id,
          });

        let nodesProcessed = 0;
        let nodesFailed = 0;

        // ============= NODE-FIRST ORCHESTRATION =============
        // If no sequence nodes, send as simple message
        if (sequenceNodes.length === 0) {
          // Simple message without sequence
          const action = message.media_url ? "message.send_media" : "message.send_text";
          
          // Build node config for simple message
          const simpleNodeConfig: Record<string, unknown> = {
            text: formatLineBreaks(message.content),
            sendPrivate: message.send_private,
            mentionMember: message.mention_member,
          };
          
          if (message.media_url) {
            simpleNodeConfig.url = message.media_url;
            simpleNodeConfig.mediaType = message.media_type;
            simpleNodeConfig.caption = formatLineBreaks(message.media_caption);
          }
          
          for (const group of linkedGroups) {
            const payload = buildStandardPayload({
              action,
              node: {
                id: message.id,
                type: message.media_url ? "media" : "text",
                order: 0,
                config: simpleNodeConfig,
              },
              campaign: {
                id: campaign.id,
                name: campaign.name,
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

            try {
              const response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });

              const responseText = await response.text();
              let responseData;
              try {
                responseData = JSON.parse(responseText);
              } catch {
                responseData = { raw: responseText };
              }

              // Log individual send
              await supabase.from("group_message_logs").insert({
                user_id: message.user_id,
                group_campaign_id: message.group_campaign_id,
                message_id: message.id,
                node_type: "simple_message",
                node_order: 0,
                group_jid: group.group_jid,
                group_name: group.group_name,
                instance_id: instance.id,
                instance_name: instance.name,
                campaign_name: campaign.name,
                status: response.ok ? "sent" : "failed",
                error_message: response.ok ? null : `HTTP ${response.status}`,
                payload,
                provider_response: responseData,
              });

              if (response.ok) {
                nodesProcessed++;
              } else {
                nodesFailed++;
              }
            } catch (err) {
              nodesFailed++;
              console.error(`[Scheduler] Error sending to group ${group.group_jid}:`, err);
            }
          }
        } else {
          // ============= SEQUENCE NODE-BY-NODE PROCESSING =============
          const sortedNodes = [...sequenceNodes].sort((a, b) => a.node_order - b.node_order);
          const destinations = linkedGroups.map(g => ({ group_jid: g.group_jid, group_name: g.group_name, isPrivate: false }));

          for (let nodeIndex = 0; nodeIndex < sortedNodes.length; nodeIndex++) {
            const node = sortedNodes[nodeIndex];

            // Check per-node schedule if configured
            const nodeSchedule = node.config?.schedule as { enabled?: boolean; days?: number[]; times?: string[] } | undefined;
            if (nodeSchedule?.enabled) {
              const nodeDayMatch = nodeSchedule.days?.includes(currentDay) ?? false;
              const nodeTimeMatch = nodeSchedule.times?.includes(currentTime) ?? false;
              if (!nodeDayMatch || !nodeTimeMatch) {
                console.log(`[Scheduler] Node ${node.node_type} (order ${node.node_order}) has schedule but doesn't match current time, skipping`);
                continue;
              }
              console.log(`[Scheduler] Node ${node.node_type} (order ${node.node_order}) matches its own schedule`);
            }
            
            console.log(`[Scheduler] Processing node ${nodeIndex + 1}/${sortedNodes.length}: ${node.node_type}`);

            // If it's a DELAY node, check if it's a long delay
            if (node.node_type === "delay") {
              const delayMs = calculateDelayMs(node.config);
              
              if (delayMs > MAX_DELAY_MS) {
                // Long delay - save state and schedule continuation
                const resumeAt = new Date(Date.now() + delayMs);
                
                console.log(`[Scheduler] ⏱️ Long delay: ${delayMs}ms. Scheduling for ${resumeAt.toISOString()}`);
                
                const { data: savedExecution, error: saveError } = await supabase
                  .from("sequence_executions")
                  .insert({
                    user_id: message.user_id,
                    campaign_id: campaign.id,
                    sequence_id: message.sequence_id,
                    message_id: message.id,
                    trigger_context: {},
                    current_node_index: nodeIndex + 1,
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
                  console.error("[Scheduler] Failed to save execution state:", saveError);
                  // Fallback to capped delay
                  const effectiveDelay = Math.min(delayMs, MAX_DELAY_MS);
                  console.log(`[Scheduler] ⏱️ Fallback: waiting ${effectiveDelay}ms`);
                  await new Promise(resolve => setTimeout(resolve, effectiveDelay));
                } else {
                  console.log(`[Scheduler] ✅ Execution ${savedExecution.id} paused`);
                  
                  // Update execution status and break out
                  await supabase
                    .from("scheduled_message_executions")
                    .update({ status: "paused" })
                    .eq("message_id", message.id)
                    .eq("scheduled_date", todayDate)
                    .eq("scheduled_time", currentTime);

                  results.push({ 
                    messageId: message.id, 
                    status: "paused", 
                    nodesProcessed,
                    error: `Will resume at ${resumeAt.toISOString()}`
                  });
                  
                  break; // Exit the node loop
                }
              } else if (delayMs > 0) {
                // Short delay - wait inline
                console.log(`[Scheduler] ⏱️ Short delay: waiting ${delayMs}ms`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
              }
              
              nodesProcessed++;
              continue; // Don't send delay to webhook
            }

            // For each group - send this node to all groups (Node-First strategy)
            for (const group of linkedGroups) {
              const action = getActionForNodeType(node.node_type);
              const formattedConfig = formatNodeConfig(node.config, node.node_type);
              
              const payload = buildStandardPayload({
                action,
                node: {
                  id: node.id,
                  type: node.node_type,
                  order: node.node_order,
                  config: formattedConfig,
                },
                campaign: {
                  id: campaign.id,
                  name: campaign.name,
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

              try {
                const response = await fetch(webhookUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });

                const responseText = await response.text();
                let responseData;
                try {
                  responseData = JSON.parse(responseText);
                } catch {
                  responseData = { raw: responseText };
                }

                // Log individual node execution
                await supabase.from("group_message_logs").insert({
                  user_id: message.user_id,
                  group_campaign_id: message.group_campaign_id,
                  message_id: message.id,
                  sequence_id: message.sequence_id,
                  node_type: node.node_type,
                  node_order: node.node_order,
                  group_jid: group.group_jid,
                  group_name: group.group_name,
                  instance_id: instance.id,
                  instance_name: instance.name,
                  campaign_name: campaign.name,
                  status: response.ok ? "sent" : "failed",
                  error_message: response.ok ? null : `HTTP ${response.status}`,
                  payload,
                  provider_response: responseData,
                });

                if (response.ok) {
                  console.log(`[Scheduler] ✅ Node ${node.node_type} sent to ${group.group_name}`);
                } else {
                  nodesFailed++;
                  console.error(`[Scheduler] ❌ Node ${node.node_type} failed for ${group.group_name}: HTTP ${response.status}`);
                }
              } catch (err) {
                nodesFailed++;
                console.error(`[Scheduler] ❌ Error sending node to ${group.group_jid}:`, err);
                
                // Log failed attempt
                await supabase.from("group_message_logs").insert({
                  user_id: message.user_id,
                  group_campaign_id: message.group_campaign_id,
                  message_id: message.id,
                  sequence_id: message.sequence_id,
                  node_type: node.node_type,
                  node_order: node.node_order,
                  group_jid: group.group_jid,
                  group_name: group.group_name,
                  instance_id: instance.id,
                  instance_name: instance.name,
                  campaign_name: campaign.name,
                  status: "failed",
                  error_message: err instanceof Error ? err.message : "Unknown error",
                  payload: {},
                });
              }
            }
            
            nodesProcessed++;
          }
        }

        // Update execution status (only if not already paused)
        const existingResult = results.find(r => r.messageId === message.id);
        if (!existingResult || existingResult.status !== "paused") {
          await supabase
            .from("scheduled_message_executions")
            .update({ status: nodesFailed === 0 ? "executed" : "partial" })
            .eq("message_id", message.id)
            .eq("scheduled_date", todayDate)
            .eq("scheduled_time", currentTime);

          console.log(`[Scheduler] ✅ Message ${message.id} completed: ${nodesProcessed} nodes processed, ${nodesFailed} failed`);
          results.push({ messageId: message.id, status: "sent", nodesProcessed });
        }

      } catch (error) {
        console.error(`[Scheduler] Error processing message ${message.id}:`, error);
        results.push({ 
          messageId: message.id, 
          status: "failed", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    // ============= PROCESS SCHEDULED SEQUENCES (from message_sequences table) =============
    
    console.log(`[Scheduler] Checking for scheduled sequences...`);
    
    // Fetch all active scheduled sequences
    const { data: scheduledSequences, error: sequencesError } = await supabase
      .from("message_sequences")
      .select(`
        id,
        name,
        user_id,
        group_campaign_id,
        trigger_config,
        active
      `)
      .eq("trigger_type", "scheduled")
      .eq("active", true);

    if (sequencesError) {
      console.error("[Scheduler] Error fetching scheduled sequences:", sequencesError);
    } else {
      console.log(`[Scheduler] Found ${scheduledSequences?.length || 0} active scheduled sequences`);
      
      const sequenceResults: Array<{ sequenceId: string; name: string; status: string; error?: string }> = [];
      
      for (const sequence of scheduledSequences || []) {
        try {
          const triggerConfig = sequence.trigger_config as { days?: number[]; times?: string[] } | null;
          
          if (!triggerConfig?.days || !triggerConfig?.times) {
            console.log(`[Scheduler] Sequence ${sequence.id} (${sequence.name}) has invalid trigger_config, skipping`);
            sequenceResults.push({ sequenceId: sequence.id, name: sequence.name, status: "skipped", error: "Invalid config" });
            continue;
          }
          
          const matchesDay = triggerConfig.days.includes(currentDay);
          const matchesTime = triggerConfig.times.includes(currentTime);
          
          console.log(`[Scheduler] Sequence ${sequence.name}: day ${currentDay} in [${triggerConfig.days.join(",")}]=${matchesDay}, time ${currentTime} in [${triggerConfig.times.join(",")}]=${matchesTime}`);
          
          if (!matchesDay || !matchesTime) {
            continue; // Doesn't match schedule, silently skip
          }
          
          console.log(`[Scheduler] ✅ Sequence ${sequence.name} matches schedule!`);
          
          // Check idempotency - already executed today at this time?
          const { data: existingExecution } = await supabase
            .from("scheduled_sequence_executions")
            .select("id")
            .eq("sequence_id", sequence.id)
            .eq("scheduled_date", todayDate)
            .eq("scheduled_time", currentTime)
            .maybeSingle();

          if (existingExecution) {
            console.log(`[Scheduler] Sequence ${sequence.name} already executed at ${currentTime} today, skipping`);
            sequenceResults.push({ sequenceId: sequence.id, name: sequence.name, status: "skipped", error: "Already executed" });
            continue;
          }
          
          // Check for active execution (paused or running)
          const { data: activeExecution } = await supabase
            .from("sequence_executions")
            .select("id, status, current_node_index")
            .eq("sequence_id", sequence.id)
            .in("status", ["paused", "running"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (activeExecution) {
            console.log(`[Scheduler] Sequence ${sequence.name} has active execution ${activeExecution.id} (${activeExecution.status}), skipping`);
            sequenceResults.push({ sequenceId: sequence.id, name: sequence.name, status: "skipped", error: "Active execution in progress" });
            continue;
          }
          
          // Get campaign to validate status and instance
          const { data: campaign, error: campaignError } = await supabase
            .from("group_campaigns")
            .select(`
              id,
              status,
              instance_id,
              instances!inner(id, status)
            `)
            .eq("id", sequence.group_campaign_id)
            .single();

          if (campaignError || !campaign) {
            console.log(`[Scheduler] Campaign not found for sequence ${sequence.name}`);
            sequenceResults.push({ sequenceId: sequence.id, name: sequence.name, status: "failed", error: "Campaign not found" });
            continue;
          }

          if (campaign.status !== "active") {
            console.log(`[Scheduler] Campaign for sequence ${sequence.name} is not active (${campaign.status})`);
            sequenceResults.push({ sequenceId: sequence.id, name: sequence.name, status: "skipped", error: "Campaign not active" });
            continue;
          }

          const instanceData = campaign.instances as unknown as { id: string; status: string };
          if (instanceData.status !== "connected") {
            console.log(`[Scheduler] Instance for sequence ${sequence.name} is not connected`);
            sequenceResults.push({ sequenceId: sequence.id, name: sequence.name, status: "skipped", error: "Instance not connected" });
            continue;
          }
          
          // Check if campaign has linked groups
          const { data: linkedGroups } = await supabase
            .from("campaign_groups")
            .select("id")
            .eq("campaign_id", sequence.group_campaign_id)
            .limit(1);

          if (!linkedGroups || linkedGroups.length === 0) {
            console.log(`[Scheduler] No linked groups for sequence ${sequence.name}`);
            sequenceResults.push({ sequenceId: sequence.id, name: sequence.name, status: "skipped", error: "No linked groups" });
            continue;
          }
          
          // Record execution start (idempotency)
          await supabase
            .from("scheduled_sequence_executions")
            .insert({
              sequence_id: sequence.id,
              campaign_id: sequence.group_campaign_id,
              user_id: sequence.user_id,
              scheduled_date: todayDate,
              scheduled_time: currentTime,
              status: "executing",
            });
          
          console.log(`[Scheduler] 🚀 Triggering sequence ${sequence.name} via execute-message...`);
          
          // Call execute-message with sequenceId only (no messageId)
          const response = await fetch(`${supabaseUrl}/functions/v1/execute-message`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              campaignId: sequence.group_campaign_id,
              sequenceId: sequence.id,
              // No messageId, no triggerContext - direct sequence execution
            }),
          });

          const responseData = await response.json();
          
          // Update execution status
          await supabase
            .from("scheduled_sequence_executions")
            .update({ 
              status: response.ok ? "executed" : "failed",
              error_message: response.ok ? null : JSON.stringify(responseData),
            })
            .eq("sequence_id", sequence.id)
            .eq("scheduled_date", todayDate)
            .eq("scheduled_time", currentTime);
          
          if (response.ok) {
            console.log(`[Scheduler] ✅ Sequence ${sequence.name} triggered successfully:`, responseData);
            sequenceResults.push({ sequenceId: sequence.id, name: sequence.name, status: "triggered" });
          } else {
            console.error(`[Scheduler] ❌ Sequence ${sequence.name} trigger failed:`, responseData);
            sequenceResults.push({ sequenceId: sequence.id, name: sequence.name, status: "failed", error: responseData.error || "Unknown error" });
          }

        } catch (err) {
          console.error(`[Scheduler] Error processing sequence ${sequence.id}:`, err);
          sequenceResults.push({ 
            sequenceId: sequence.id, 
            name: sequence.name || "unknown",
            status: "failed", 
            error: err instanceof Error ? err.message : "Unknown error" 
          });
        }
      }
      
      console.log(`[Scheduler] Scheduled sequences summary:`, sequenceResults);
    }

    // ============= PROCESS PER-NODE SCHEDULED MESSAGES =============
    // Scan ALL active sequences (any trigger_type) for nodes with individual schedules
    
    console.log(`[Scheduler] Checking for per-node scheduled messages...`);
    
    const { data: allActiveSequences, error: allSeqError } = await supabase
      .from("message_sequences")
      .select("id, name, user_id, group_campaign_id, trigger_type")
      .eq("active", true);

    if (allSeqError) {
      console.error("[Scheduler] Error fetching active sequences for per-node schedules:", allSeqError);
    } else {
      const perNodeResults: Array<{ sequenceId: string; nodeOrder: number; status: string; error?: string }> = [];
      
      for (const seq of allActiveSequences || []) {
        try {
          // Fetch nodes for this sequence
          const { data: scheduledNodes, error: nodesError } = await supabase
            .from("sequence_nodes")
            .select("id, node_type, node_order, config")
            .eq("sequence_id", seq.id);

          if (nodesError || !scheduledNodes) continue;

          // Filter nodes with config.schedule.enabled = true
          const nodesWithSchedule = scheduledNodes.filter((n: any) => {
            const schedule = n.config?.schedule;
            return schedule?.enabled === true && Array.isArray(schedule?.days) && Array.isArray(schedule?.times);
          });

          if (nodesWithSchedule.length === 0) continue;

          for (const node of nodesWithSchedule) {
            const schedule = (node as any).config.schedule as { days: number[]; times: string[]; enabled: boolean };
            
            const matchesDay = schedule.days.includes(currentDay);
            const matchesTime = schedule.times.includes(currentTime);
            
            if (!matchesDay || !matchesTime) continue;

            console.log(`[Scheduler] ✅ Per-node match: sequence "${seq.name}" node ${(node as any).node_order} (${(node as any).node_type})`);

            // Idempotency check using scheduled_time with node_order suffix
            const idempotencyTime = `${currentTime}_node_${(node as any).node_order}`;
            const { data: existingNodeExec } = await supabase
              .from("scheduled_sequence_executions")
              .select("id")
              .eq("sequence_id", seq.id)
              .eq("scheduled_date", todayDate)
              .eq("scheduled_time", idempotencyTime)
              .maybeSingle();

            if (existingNodeExec) {
              console.log(`[Scheduler] Node ${(node as any).node_order} of "${seq.name}" already executed at ${currentTime} today, skipping`);
              perNodeResults.push({ sequenceId: seq.id, nodeOrder: (node as any).node_order, status: "skipped", error: "Already executed" });
              continue;
            }

            // Validate campaign + instance
            const { data: perNodeCampaign } = await supabase
              .from("group_campaigns")
              .select("id, name, status, instance_id, instances!inner(id, status)")
              .eq("id", seq.group_campaign_id)
              .single();

            if (!perNodeCampaign || perNodeCampaign.status !== "active") {
              console.log(`[Scheduler] Campaign for per-node "${seq.name}" not active`);
              perNodeResults.push({ sequenceId: seq.id, nodeOrder: (node as any).node_order, status: "skipped", error: "Campaign not active" });
              continue;
            }

            const perNodeInst = perNodeCampaign.instances as unknown as { id: string; status: string };
            if (perNodeInst.status !== "connected") {
              console.log(`[Scheduler] Instance for per-node "${seq.name}" not connected`);
              perNodeResults.push({ sequenceId: seq.id, nodeOrder: (node as any).node_order, status: "skipped", error: "Instance not connected" });
              continue;
            }

            // Record execution for idempotency
            await supabase.from("scheduled_sequence_executions").insert({
              sequence_id: seq.id,
              campaign_id: seq.group_campaign_id,
              user_id: seq.user_id,
              scheduled_date: todayDate,
              scheduled_time: idempotencyTime,
              status: "executing",
            });

            // Call execute-message with manualNodeIndex
            console.log(`[Scheduler] 🚀 Triggering per-node: "${seq.name}" node ${(node as any).node_order} via execute-message...`);

            const perNodeResponse = await fetch(`${supabaseUrl}/functions/v1/execute-message`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                campaignId: seq.group_campaign_id,
                sequenceId: seq.id,
                manualNodeIndex: (node as any).node_order,
              }),
            });

            const perNodeResponseData = await perNodeResponse.json();

            // Update execution status
            await supabase
              .from("scheduled_sequence_executions")
              .update({
                status: perNodeResponse.ok ? "executed" : "failed",
                error_message: perNodeResponse.ok ? null : JSON.stringify(perNodeResponseData),
              })
              .eq("sequence_id", seq.id)
              .eq("scheduled_date", todayDate)
              .eq("scheduled_time", idempotencyTime);

            if (perNodeResponse.ok) {
              console.log(`[Scheduler] ✅ Per-node "${seq.name}" node ${(node as any).node_order} triggered successfully`);
              perNodeResults.push({ sequenceId: seq.id, nodeOrder: (node as any).node_order, status: "triggered" });
            } else {
              console.error(`[Scheduler] ❌ Per-node "${seq.name}" node ${(node as any).node_order} failed:`, perNodeResponseData);
              perNodeResults.push({ sequenceId: seq.id, nodeOrder: (node as any).node_order, status: "failed", error: perNodeResponseData.error || "Unknown" });
            }
          }
        } catch (err) {
          console.error(`[Scheduler] Error processing per-node schedule for sequence ${seq.id}:`, err);
        }
      }

      if (perNodeResults.length > 0) {
        console.log(`[Scheduler] Per-node scheduled results:`, perNodeResults);
      } else {
        console.log(`[Scheduler] No per-node scheduled messages matched current time`);
      }
    }

    // ============= PROCESS DISPATCH SCHEDULED SEQUENCES =============
    
    console.log(`[Scheduler] Checking for scheduled dispatch sequences...`);
    
    const { data: dispatchSequences, error: dispatchSeqError } = await supabase
      .from("dispatch_sequences")
      .select(`
        id, name, user_id, campaign_id, trigger_config, is_active
      `)
      .eq("trigger_type", "scheduled")
      .eq("is_active", true);

    if (dispatchSeqError) {
      console.error("[Scheduler] Error fetching dispatch scheduled sequences:", dispatchSeqError);
    } else {
      console.log(`[Scheduler] Found ${dispatchSequences?.length || 0} active dispatch scheduled sequences`);

      for (const seq of dispatchSequences || []) {
        try {
          const triggerConfig = seq.trigger_config as { days?: number[]; times?: string[] } | null;
          if (!triggerConfig?.days || !triggerConfig?.times) continue;

          const matchesDay = triggerConfig.days.includes(currentDay);
          const matchesTime = triggerConfig.times.includes(currentTime);
          if (!matchesDay || !matchesTime) continue;

          console.log(`[Scheduler] ✅ Dispatch sequence ${seq.name} matches schedule`);

          // Idempotency check
          const { data: existingExec } = await supabase
            .from("scheduled_sequence_executions")
            .select("id")
            .eq("sequence_id", seq.id)
            .eq("scheduled_date", todayDate)
            .eq("scheduled_time", currentTime)
            .maybeSingle();

          if (existingExec) {
            console.log(`[Scheduler] Dispatch sequence ${seq.name} already executed at ${currentTime} today`);
            continue;
          }

          // Validate campaign and instance
          const { data: dispCampaign } = await supabase
            .from("dispatch_campaigns")
            .select(`id, status, instance_id, instances!inner(id, status)`)
            .eq("id", seq.campaign_id)
            .single();

          if (!dispCampaign || dispCampaign.status !== "active") {
            console.log(`[Scheduler] Dispatch campaign for sequence ${seq.name} not active`);
            continue;
          }

          const dispInstance = (dispCampaign as any).instances;
          if (dispInstance?.status !== "connected") {
            console.log(`[Scheduler] Instance for dispatch sequence ${seq.name} not connected`);
            continue;
          }

          // Get contacts for this campaign
          const { data: contacts } = await supabase
            .from("dispatch_campaign_contacts")
            .select("id, lead_id, leads!inner(phone, name)")
            .eq("campaign_id", seq.campaign_id)
            .eq("status", "active");

          if (!contacts || contacts.length === 0) {
            console.log(`[Scheduler] No active contacts for dispatch sequence ${seq.name}`);
            continue;
          }

          // Record execution
          await supabase.from("scheduled_sequence_executions").insert({
            sequence_id: seq.id,
            campaign_id: seq.campaign_id,
            user_id: seq.user_id,
            scheduled_date: todayDate,
            scheduled_time: currentTime,
            status: "executing",
          });

          console.log(`[Scheduler] 🚀 Triggering dispatch sequence ${seq.name} for ${contacts.length} contacts...`);

          // Execute for each contact
          for (const contact of contacts) {
            const lead = (contact as any).leads;
            if (!lead?.phone) continue;

            try {
              await fetch(`${supabaseUrl}/functions/v1/execute-dispatch-sequence`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  campaignId: seq.campaign_id,
                  sequenceId: seq.id,
                  contactPhone: lead.phone,
                  contactName: lead.name || "",
                  contactId: contact.id,
                }),
              });
            } catch (err) {
              console.error(`[Scheduler] Error executing dispatch for contact ${contact.id}:`, err);
            }
          }

          // Update execution status
          await supabase
            .from("scheduled_sequence_executions")
            .update({ status: "executed" })
            .eq("sequence_id", seq.id)
            .eq("scheduled_date", todayDate)
            .eq("scheduled_time", currentTime);

          console.log(`[Scheduler] ✅ Dispatch sequence ${seq.name} triggered for ${contacts.length} contacts`);

        } catch (err) {
          console.error(`[Scheduler] Error processing dispatch sequence ${seq.id}:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        brasilTime: currentTime,
        brasilDay: currentDay,
        totalMessages: messages?.length || 0,
        matchingMessages: messagesToSend.length,
        pausedExecutionsResumed: pausedExecutions?.length || 0,
        scheduledSequencesProcessed: scheduledSequences?.length || 0,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Scheduler] Fatal error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
