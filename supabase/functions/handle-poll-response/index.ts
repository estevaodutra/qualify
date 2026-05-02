import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default webhook URLs
const DEFAULT_MESSAGES_WEBHOOK = "https://n8n-n8n.nuwfic.easypanel.host/webhook/messages";
const DEFAULT_GROUPS_WEBHOOK = "https://n8n-n8n.nuwfic.easypanel.host/webhook/groups";

// ============= Types =============

interface PollResponseRequest {
  message_id: string;
  instance_id: string;
  group_jid: string;
  respondent: {
    phone: string;
    name?: string;
    jid?: string;
  };
  response: {
    option_index: number;
    option_text: string;
  };
  timestamp: string;
  _raw_event?: Record<string, unknown>; // Original Z-API payload for forwardRawBody
}

interface PollMessage {
  id: string;
  user_id: string;
  node_id: string;
  sequence_id: string;
  campaign_id: string;
  group_jid: string;
  instance_id: string;
  question_text: string;
  options: string[];
  option_actions: Record<string, PollActionConfig>;
}

interface PollActionConfig {
  actionType: string;
  config: Record<string, unknown>;
}

interface InstanceData {
  id: string;
  name: string;
  phone: string;
  provider: string;
  external_instance_id: string;
  external_instance_token: string;
}

// ============= Helper Functions =============

const replaceVariables = (text: string, variables: Record<string, string>): string => {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
  }
  return result;
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// ============= Main Handler =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const body: PollResponseRequest = await req.json();
    const { message_id, instance_id, group_jid, respondent, response, timestamp } = body;

    console.log(`[HandlePollResponse] Received vote for message ${message_id}, option ${response.option_index}`);

    // Validate required fields
    if (!message_id || !respondent?.phone || response?.option_index === undefined) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required fields: message_id, respondent.phone, response.option_index" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the poll message
    const { data: pollMessage, error: pollError } = await supabase
      .from("poll_messages")
      .select("*")
      .or(`message_id.eq.${message_id},zaap_id.eq.${message_id}`)
      .single();

    if (pollError || !pollMessage) {
      console.log(`[HandlePollResponse] Poll message not found for message_id: ${message_id}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "POLL_NOT_FOUND",
          message: "Poll message not found" 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedPoll = pollMessage as PollMessage;
    const optionActions = typedPoll.option_actions || {};
    const actionConfig = optionActions[String(response.option_index)] as PollActionConfig | undefined;

    console.log(`[HandlePollResponse] Found poll, action config: ${JSON.stringify(actionConfig)}`);

    // Check deduplication - has this user already voted for this option?
    const { data: existingResponse } = await supabase
      .from("poll_responses")
      .select("id, action_executed")
      .eq("poll_message_id", typedPoll.id)
      .eq("respondent_phone", respondent.phone)
      .eq("option_index", response.option_index)
      .maybeSingle();

    if (existingResponse) {
      // Check if action should execute only once
      const executeOnce = actionConfig?.config?.executeOnce !== false;
      
      if (executeOnce && existingResponse.action_executed) {
        console.log(`[HandlePollResponse] Duplicate vote, action already executed`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Action already executed for this respondent",
            data: {
              action_type: actionConfig?.actionType || "none",
              already_executed: true,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Create or get response record
    const { data: responseRecord, error: responseError } = await supabase
      .from("poll_responses")
      .upsert({
        user_id: typedPoll.user_id,
        poll_message_id: typedPoll.id,
        respondent_phone: respondent.phone,
        respondent_name: respondent.name || null,
        respondent_jid: respondent.jid || null,
        option_index: response.option_index,
        option_text: response.option_text || typedPoll.options[response.option_index] || "",
        action_type: actionConfig?.actionType || "none",
        responded_at: timestamp || new Date().toISOString(),
      }, {
        onConflict: "poll_message_id,respondent_phone,option_index",
      })
      .select()
      .single();

    if (responseError) {
      console.error(`[HandlePollResponse] Error saving response:`, responseError);
      return new Response(
        JSON.stringify({ success: false, error: responseError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no action configured or action is "none", just record and return
    if (!actionConfig || actionConfig.actionType === "none") {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Response recorded, no action configured",
          data: {
            action_type: "none",
            recorded: true,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get instance data for webhook calls
    const { data: instance } = await supabase
      .from("instances")
      .select("id, name, phone, provider, external_instance_id, external_instance_token")
      .eq("id", typedPoll.instance_id)
      .single();

    // Get webhook configs
    const { data: webhookConfigs } = await supabase
      .from("webhook_configs")
      .select("category, url, is_active")
      .eq("user_id", typedPoll.user_id);

    const getWebhookUrl = (category: string, defaultUrl: string): string => {
      const config = webhookConfigs?.find((c) => c.category === category && c.is_active);
      return config?.url || defaultUrl;
    };

    // Variable replacement context
    const variables: Record<string, string> = {
      name: respondent.name || "",
      phone: respondent.phone,
      group: group_jid,
      option: response.option_text || typedPoll.options[response.option_index] || "",
    };

    // Execute action based on type
    let actionResult: Record<string, unknown> = {};
    let actionSuccess = false;

    try {
      const delaySeconds = (actionConfig.config.delaySeconds as number) || 0;
      if (delaySeconds > 0) {
        console.log(`[HandlePollResponse] Waiting ${delaySeconds}s before executing action`);
        await delay(Math.min(delaySeconds * 1000, 20000)); // Max 20s delay in edge function
      }

      switch (actionConfig.actionType) {
        case "start_sequence": {
          const sequenceId = actionConfig.config.sequenceId as string;
          const campaignId = actionConfig.config.campaignId as string || typedPoll.campaign_id;
          const sendPrivate = actionConfig.config.sendPrivate as boolean || false;
          
          if (sequenceId) {
            console.log(`[HandlePollResponse] Starting sequence ${sequenceId} for ${respondent.phone}`);
            
            // Build trigger context with respondent data
            const triggerContext = {
              respondentPhone: respondent.phone,
              respondentName: respondent.name || "",
              respondentJid: respondent.jid || `${respondent.phone}@s.whatsapp.net`,
              groupJid: group_jid,
              pollOptionText: response.option_text || typedPoll.options[response.option_index] || "",
              sendPrivate: sendPrivate,
            };
            
            // Invoke execute-message function with triggerContext
            const executeResponse = await fetch(`${supabaseUrl}/functions/v1/execute-message`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                campaignId: campaignId,
                sequenceId: sequenceId,
                triggerContext: triggerContext,
              }),
            });

            actionResult = await executeResponse.json();
            actionSuccess = executeResponse.ok && actionResult.success !== false;
            console.log(`[HandlePollResponse] Sequence execution result:`, actionResult);
          } else {
            actionResult = { error: "No sequence ID configured" };
          }
          break;
        }

        case "send_private_message": {
          const content = replaceVariables(actionConfig.config.content as string || "", variables);
          const messagesWebhook = getWebhookUrl("messages", DEFAULT_MESSAGES_WEBHOOK);
          
          const payload = {
            action: "message.send_text",
            node: {
              id: `poll_action_${responseRecord.id}`,
              type: "text",
              order: 0,
              config: {
                text: content,
                mediaUrl: actionConfig.config.mediaUrl || null,
                messageType: actionConfig.config.messageType || "text",
              },
            },
            campaign: {
              id: typedPoll.campaign_id,
              name: "",
            },
            instance: instance ? {
              id: instance.id,
              name: instance.name,
              phone: instance.phone || "",
              provider: instance.provider,
              externalId: instance.external_instance_id || "",
              externalToken: instance.external_instance_token || "",
            } : null,
            destination: {
              phone: respondent.phone,
              jid: respondent.jid || `${respondent.phone}@s.whatsapp.net`,
              name: respondent.name || "",
            },
          };

          const msgResponse = await fetch(messagesWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          actionResult = { status: msgResponse.status, sent: msgResponse.ok };
          actionSuccess = msgResponse.ok;
          console.log(`[HandlePollResponse] Private message sent: ${actionSuccess}`);
          break;
        }

        case "add_tag": {
          const tagsToAdd = actionConfig.config.tags as string[] || [];
          
          // Find or create member in group_members
          const { data: member, error: memberError } = await supabase
            .from("group_members")
            .select("id, tags")
            .eq("group_campaign_id", typedPoll.campaign_id)
            .eq("phone", respondent.phone)
            .maybeSingle();

          if (member) {
            const existingTags = (member.tags as string[]) || [];
            const newTags = [...new Set([...existingTags, ...tagsToAdd])];
            
            await supabase
              .from("group_members")
              .update({ tags: newTags })
              .eq("id", member.id);
            
            actionResult = { tagsAdded: tagsToAdd, totalTags: newTags };
            actionSuccess = true;
          } else if (!memberError) {
            // Create new member entry
            const { data: { user } } = await supabase.auth.getUser();
            await supabase
              .from("group_members")
              .insert({
                user_id: typedPoll.user_id,
                group_campaign_id: typedPoll.campaign_id,
                phone: respondent.phone,
                name: respondent.name || null,
                tags: tagsToAdd,
              });
            
            actionResult = { tagsAdded: tagsToAdd, memberCreated: true };
            actionSuccess = true;
          }
          console.log(`[HandlePollResponse] Tags added: ${actionSuccess}`);
          break;
        }

        case "remove_from_group": {
          const groupsWebhook = getWebhookUrl("groups", DEFAULT_GROUPS_WEBHOOK);
          
          // Send message before if configured
          if (actionConfig.config.sendMessageBefore) {
            const message = replaceVariables(actionConfig.config.message as string || "", variables);
            const messagesWebhook = getWebhookUrl("messages", DEFAULT_MESSAGES_WEBHOOK);
            
            await fetch(messagesWebhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "message.send_text",
                node: { id: `pre_remove_${responseRecord.id}`, type: "text", order: 0, config: { text: message } },
                instance: instance ? {
                  id: instance.id,
                  name: instance.name,
                  phone: instance.phone || "",
                  provider: instance.provider,
                  externalId: instance.external_instance_id || "",
                  externalToken: instance.external_instance_token || "",
                } : null,
                destination: { phone: respondent.phone, jid: respondent.jid || `${respondent.phone}@s.whatsapp.net`, name: respondent.name || "" },
              }),
            });
          }

          // Remove from group
          const removePayload = {
            action: "group.remove_participant",
            instance: instance ? {
              id: instance.id,
              name: instance.name,
              phone: instance.phone || "",
              provider: instance.provider,
              externalId: instance.external_instance_id || "",
              externalToken: instance.external_instance_token || "",
            } : null,
            group: {
              jid: group_jid,
            },
            participant: {
              phone: respondent.phone,
              jid: respondent.jid || `${respondent.phone}@s.whatsapp.net`,
            },
          };

          const removeResponse = await fetch(groupsWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(removePayload),
          });

          actionResult = { status: removeResponse.status, removed: removeResponse.ok };
          actionSuccess = removeResponse.ok;
          console.log(`[HandlePollResponse] Member removed: ${actionSuccess}`);
          break;
        }

        case "add_to_group": {
          const groupsWebhook = getWebhookUrl("groups", DEFAULT_GROUPS_WEBHOOK);
          const targetGroupJid = actionConfig.config.targetGroupJid as string;

          const addPayload = {
            action: "group.add_participant",
            instance: instance ? {
              id: instance.id,
              name: instance.name,
              phone: instance.phone || "",
              provider: instance.provider,
              externalId: instance.external_instance_id || "",
              externalToken: instance.external_instance_token || "",
            } : null,
            group: {
              jid: targetGroupJid,
            },
            participant: {
              phone: respondent.phone,
              jid: respondent.jid || `${respondent.phone}@s.whatsapp.net`,
            },
          };

          const addResponse = await fetch(groupsWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(addPayload),
          });

          actionResult = { status: addResponse.status, added: addResponse.ok };
          actionSuccess = addResponse.ok;

          // Send welcome message if configured
          if (actionSuccess && actionConfig.config.sendWelcome) {
            const welcomeMessage = replaceVariables(actionConfig.config.welcomeMessage as string || "", variables);
            const messagesWebhook = getWebhookUrl("messages", DEFAULT_MESSAGES_WEBHOOK);
            
            await fetch(messagesWebhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "message.send_text",
                node: { id: `welcome_${responseRecord.id}`, type: "text", order: 0, config: { text: welcomeMessage } },
                instance: instance ? {
                  id: instance.id,
                  name: instance.name,
                  phone: instance.phone || "",
                  provider: instance.provider,
                  externalId: instance.external_instance_id || "",
                  externalToken: instance.external_instance_token || "",
                } : null,
                destination: { phone: targetGroupJid, jid: targetGroupJid, name: actionConfig.config.targetGroupName as string || "" },
              }),
            });
          }
          console.log(`[HandlePollResponse] Member added to group: ${actionSuccess}`);
          break;
        }

        case "notify_admin": {
          const notifyType = actionConfig.config.notifyType as string || "whatsapp";
          const message = replaceVariables(actionConfig.config.message as string || "", variables);

          if (notifyType === "whatsapp") {
            const targetPhone = actionConfig.config.targetPhone as string;
            const messagesWebhook = getWebhookUrl("messages", DEFAULT_MESSAGES_WEBHOOK);

            const notifyResponse = await fetch(messagesWebhook, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "message.send_text",
                node: { id: `notify_${responseRecord.id}`, type: "text", order: 0, config: { text: message } },
                instance: instance ? {
                  id: instance.id,
                  name: instance.name,
                  phone: instance.phone || "",
                  provider: instance.provider,
                  externalId: instance.external_instance_id || "",
                  externalToken: instance.external_instance_token || "",
                } : null,
                destination: { phone: targetPhone, jid: `${targetPhone}@s.whatsapp.net`, name: "Admin" },
              }),
            });

            actionResult = { status: notifyResponse.status, notified: notifyResponse.ok };
            actionSuccess = notifyResponse.ok;
          } else if (notifyType === "webhook") {
            const webhookUrl = actionConfig.config.webhookUrl as string;
            
            const webhookResponse = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event: "poll_response",
                poll_id: typedPoll.id,
                respondent,
                response,
                message,
                timestamp: new Date().toISOString(),
              }),
            });

            actionResult = { status: webhookResponse.status, notified: webhookResponse.ok };
            actionSuccess = webhookResponse.ok;
          }
          console.log(`[HandlePollResponse] Admin notified: ${actionSuccess}`);
          break;
        }

        case "call_webhook": {
          const webhookUrl = actionConfig.config.webhookUrl as string;
          
          if (!webhookUrl) {
            actionResult = { error: "No webhook URL configured" };
            break;
          }

          console.log(`[HandlePollResponse] Calling webhook: ${webhookUrl}`);

          // Always build structured base payload with poll + vote + respondent
          const optionText = response.option_text || typedPoll.options[response.option_index] || "";
          const basePayload: Record<string, unknown> = {
            event: "poll_vote",
            // Top-level flattened fields for easier mapping in n8n/Make/Zapier
            phone: respondent.phone,
            name: respondent.name || null,
            option: optionText,
            option_index: response.option_index,
            group_jid: group_jid,
            // Nested structures preserved for backward compatibility
            poll: {
              id: typedPoll.id,
              question: typedPoll.question_text,
              options: typedPoll.options,
            },
            vote: {
              option_index: response.option_index,
              option_text: optionText,
            },
            respondent: {
              phone: respondent.phone,
              name: respondent.name || null,
              jid: respondent.jid || `${respondent.phone}@s.whatsapp.net`,
            },
            group: {
              jid: group_jid,
            },
            campaign_id: typedPoll.campaign_id,
            sequence_id: typedPoll.sequence_id,
            node_id: typedPoll.node_id,
            timestamp: timestamp || new Date().toISOString(),
          };

          // Optionally include instance data
          if (actionConfig.config.includeInstance !== false && instance) {
            basePayload.instance = {
              id: instance.id,
              name: instance.name,
              phone: instance.phone || "",
              provider: instance.provider,
            };
          }

          let webhookPayload: Record<string, unknown>;

          // If forwardRawBody is enabled, include raw_event alongside structured data
          if (actionConfig.config.forwardRawBody && body._raw_event) {
            webhookPayload = {
              ...basePayload,
              raw_event: body._raw_event,
            };
            console.log(`[HandlePollResponse] Including raw_event in enriched payload`);
          } else {
            webhookPayload = basePayload;
          }

          // Parse custom headers
          let headers: Record<string, string> = { "Content-Type": "application/json" };
          if (actionConfig.config.customHeaders) {
            try {
              const customHeaders = JSON.parse(actionConfig.config.customHeaders as string);
              headers = { ...headers, ...customHeaders };
            } catch (e) {
              console.warn("[HandlePollResponse] Invalid custom headers JSON");
            }
          }

          console.log(`[HandlePollResponse] Webhook payload:`, JSON.stringify(webhookPayload));

          const webhookResponse = await fetch(webhookUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(webhookPayload),
          });

          let responseBodyText = "";
          try {
            responseBodyText = await webhookResponse.text();
          } catch (_e) {
            responseBodyText = "<unable to read response body>";
          }

          if (!webhookResponse.ok) {
            console.error(
              `[HandlePollResponse] Webhook returned ${webhookResponse.status}: ${responseBodyText.slice(0, 500)}`,
            );
          }

          actionResult = {
            status: webhookResponse.status,
            sent: webhookResponse.ok,
            url: webhookUrl,
            includesRawEvent: !!(actionConfig.config.forwardRawBody && body._raw_event),
            response_body: responseBodyText.slice(0, 1000),
          };
          actionSuccess = webhookResponse.ok;
          console.log(`[HandlePollResponse] Webhook called: ${actionSuccess} (status ${webhookResponse.status})`);
          break;
        }

        case "add_to_list": {
          const targetCampaignId = actionConfig.config.campaignId as string || typedPoll.campaign_id;
          const targetListId = actionConfig.config.listId as string | undefined;
          
          console.log(`[HandlePollResponse] Adding ${respondent.phone} to execution list${targetListId ? ` (listId=${targetListId})` : ` for campaign ${targetCampaignId}`}`);

          // Find active execution list with open window
          let listQuery = supabase
            .from("group_execution_lists")
            .select("id, current_cycle_id")
            .eq("is_active", true)
            .gt("current_window_end", new Date().toISOString());

          if (targetListId) {
            listQuery = listQuery.eq("id", targetListId);
          } else {
            listQuery = listQuery.eq("campaign_id", targetCampaignId);
          }

          const { data: activeList, error: listError } = await listQuery
            .limit(1)
            .maybeSingle();

          if (listError) {
            console.error(`[HandlePollResponse] Error finding execution list:`, listError);
            actionResult = { error: listError.message };
            break;
          }

          if (!activeList || !activeList.current_cycle_id) {
            actionResult = { error: "No active execution list found with open window" };
            console.log(`[HandlePollResponse] No active list found for campaign ${targetCampaignId}`);
            break;
          }

          const { error: upsertError } = await supabase
            .from("group_execution_leads")
            .upsert({
              user_id: typedPoll.user_id,
              list_id: activeList.id,
              cycle_id: activeList.current_cycle_id,
              phone: respondent.phone,
              name: respondent.name || null,
              origin_event: "poll_response",
              origin_detail: response.option_text || typedPoll.options[response.option_index] || "",
              status: "pending",
            }, {
              onConflict: "list_id,phone,cycle_id",
              ignoreDuplicates: true,
            });

          if (upsertError) {
            console.error(`[HandlePollResponse] Error upserting lead:`, upsertError);
            actionResult = { error: upsertError.message };
          } else {
            actionResult = { addedToList: true, listId: activeList.id, cycleId: activeList.current_cycle_id };
            actionSuccess = true;
          }
          console.log(`[HandlePollResponse] Add to list result: ${actionSuccess}`);
          break;
        }

        default:
          actionResult = { error: `Unknown action type: ${actionConfig.actionType}` };
      }
    } catch (actionError) {
      console.error(`[HandlePollResponse] Action execution error:`, actionError);
      actionResult = { error: actionError instanceof Error ? actionError.message : "Unknown error" };
      actionSuccess = false;
    }

    // Update response record with action result
    await supabase
      .from("poll_responses")
      .update({
        action_executed: actionSuccess,
        action_result: actionResult,
        executed_at: new Date().toISOString(),
      })
      .eq("id", responseRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: actionSuccess ? "Action executed successfully" : "Action execution failed",
        data: {
          action_type: actionConfig.actionType,
          executed: actionSuccess,
          result: actionResult,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[HandlePollResponse] Fatal error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
