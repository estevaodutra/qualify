import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  classifyEvent,
  extractContext,
  type ClassificationResult,
  type EventContext,
} from "../_shared/event-classifier.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InboundPayload {
  source: "z-api" | "evolution" | "meta";
  instance_id: string;
  received_at?: string;
  raw_event: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // Detect payload format and normalize
    let payload: InboundPayload;

    if (body.raw_event && body.instance_id) {
      payload = body as InboundPayload;
    } else {
      const nestedBody = body.body as Record<string, unknown> | undefined;
      const instanceId = body.instanceId ||
        nestedBody?.instanceId ||
        body.instance ||
        nestedBody?.connectedPhone ||
        body.phone ||
        body.sender?.phone ||
        "unknown";

      payload = {
        source: "z-api",
        instance_id: String(instanceId),
        raw_event: body,
      };

      console.log("[webhook-inbound] Auto-wrapped raw payload, detected instance_id:", instanceId);
    }

    if (!payload.instance_id || !payload.raw_event) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: instance_id and raw_event" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const source = payload.source || "z-api";
    const externalInstanceId = payload.instance_id;
    const receivedAt = payload.received_at || new Date().toISOString();
    const rawEvent = payload.raw_event;

    console.log(`[webhook-inbound] Received event from ${source}, instance: ${externalInstanceId}`);

    // Find internal instance
    const { data: instance } = await supabase
      .from("instances")
      .select("id, user_id")
      .eq("external_instance_id", externalInstanceId)
      .maybeSingle();

    // Classify using shared classifier
    const classification: ClassificationResult = classifyEvent(source, rawEvent);
    console.log(`[webhook-inbound] Classified as: ${classification.eventType} (${classification.classification}, rule: ${classification.matchedRule}, confidence: ${classification.confidence})`);

    // Extract context using shared extractor
    const context: EventContext = extractContext(source, rawEvent);

    // Insert event with new classification fields
    const { data: insertedEvent, error: insertError } = await supabase
      .from("webhook_events")
      .insert({
        user_id: instance?.user_id || null,
        source,
        external_instance_id: externalInstanceId,
        instance_id: instance?.id || null,
        event_type: classification.eventType,
        event_subtype: classification.eventSubtype,
        classification: classification.classification,
        direction: classification.direction,
        confidence: classification.confidence,
        matched_rule: classification.matchedRule,
        chat_jid: context.chatJid,
        chat_type: context.chatType,
        chat_name: context.chatName,
        sender_phone: context.senderPhone,
        sender_name: context.senderName,
        message_id: context.messageId,
        raw_event: rawEvent,
        event_timestamp: context.eventTimestamp,
        received_at: receivedAt,
        processing_status: classification.classification === "identified" ? "processed" : "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[webhook-inbound] Insert error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[webhook-inbound] Event saved with ID: ${insertedEvent.id}`);

    // ==========================================
    // AUTO-PROCESS POLL RESPONSES
    // ==========================================
    let pollProcessingResult: Record<string, unknown> | null = null;

    if (classification.eventType === "poll_response") {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const eventBody = rawEvent.body as Record<string, unknown> | undefined;
        const pollVote = eventBody?.pollVote as Record<string, unknown> | undefined;

        if (pollVote) {
          const options = pollVote.options as Array<{ name: string }> | undefined;
          const pollMessageId = pollVote.pollMessageId as string;

          if (pollMessageId && options?.length) {
            const participantPhone = (eventBody?.participantPhone as string) ||
              String(eventBody?.phone || "").split("-")[0];
            const senderName = (eventBody?.senderName as string) || (eventBody?.pushName as string) || "";
            const groupJid = (eventBody?.phone as string) || context.chatJid || "";

            console.log(`[webhook-inbound] Auto-processing poll vote from ${participantPhone} for message ${pollMessageId}`);

            const { data: pollMessage } = await supabase
              .from("poll_messages")
              .select("id, options, instance_id")
              .or(`message_id.eq.${pollMessageId},zaap_id.eq.${pollMessageId}`)
              .maybeSingle();

            // FALLBACK: If poll not registered (legacy bug or send race), try auto-register from group_message_logs
            let resolvedPoll = pollMessage;
            if (!resolvedPoll) {
              console.log(`[webhook-inbound] Poll ${pollMessageId} not in poll_messages, trying auto-register from logs...`);
              
              const { data: logEntry } = await supabase
                .from("group_message_logs")
                .select("id, user_id, group_campaign_id, sequence_id, group_jid, instance_id, payload, zaap_id, external_message_id")
                .or(`external_message_id.eq.${pollMessageId},zaap_id.eq.${pollMessageId}`)
                .eq("node_type", "poll")
                .eq("status", "sent")
                .order("sent_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (logEntry) {
                const logPayload = logEntry.payload as Record<string, unknown> | null;
                const logNode = logPayload?.node as Record<string, unknown> | undefined;
                const nodeId = logNode?.id as string | undefined;

                if (nodeId) {
                  const { data: nodeRecord } = await supabase
                    .from("sequence_nodes")
                    .select("config")
                    .eq("id", nodeId)
                    .maybeSingle();

                  if (nodeRecord) {
                    const nodeConfig = nodeRecord.config as Record<string, unknown>;
                    const messageIdForInsert = logEntry.external_message_id || logEntry.zaap_id;

                    // Prefer the resolved values stored in the log payload (variables already substituted)
                    // over the raw template in sequence_nodes.config (which contains {{var}} placeholders).
                    const logConfig = (logNode?.config as Record<string, unknown>) || {};

                    if (messageIdForInsert) {
                      const { data: insertedPoll, error: registerError } = await supabase
                        .from("poll_messages")
                        .insert({
                          user_id: logEntry.user_id,
                          message_id: messageIdForInsert,
                          zaap_id: logEntry.zaap_id,
                          node_id: nodeId,
                          sequence_id: logEntry.sequence_id,
                          campaign_id: logEntry.group_campaign_id,
                          group_jid: logEntry.group_jid || groupJid,
                          instance_id: logEntry.instance_id,
                          question_text: (logConfig.question as string) || (logConfig.label as string)
                                       || (nodeConfig.question as string) || (nodeConfig.label as string) || "",
                          options: (logConfig.options as unknown[]) || nodeConfig.options || [],
                          option_actions: nodeConfig.optionActions || {},
                          sent_at: new Date().toISOString(),
                        })
                        .select("id, options, instance_id")
                        .single();

                      if (registerError) {
                        console.error(`[webhook-inbound] Auto-register failed:`, registerError.message);
                        await supabase
                          .from("webhook_events")
                          .update({
                            processing_status: "error",
                            processing_error: `poll_auto_register_failed: ${registerError.message}`,
                          })
                          .eq("id", insertedEvent.id);
                      } else {
                        resolvedPoll = insertedPoll;
                        console.log(`[webhook-inbound] ✅ Auto-registered poll ${pollMessageId} from log ${logEntry.id}`);
                      }
                    }
                  }
                }
              } else {
                console.log(`[webhook-inbound] No matching log found for poll ${pollMessageId}`);
                await supabase
                  .from("webhook_events")
                  .update({
                    processing_status: "error",
                    processing_error: `poll_message_not_registered: ${pollMessageId}`,
                  })
                  .eq("id", insertedEvent.id);
              }
            }

            if (resolvedPoll) {
              const votedOptionText = options[0]?.name || "";
              const pollOptions = resolvedPoll.options as string[];
              let optionIndex = pollOptions.findIndex(
                (opt) => opt.toLowerCase() === votedOptionText.toLowerCase()
              );

              if (optionIndex === -1) {
                optionIndex = pollOptions.findIndex(
                  (opt) =>
                    opt.toLowerCase().includes(votedOptionText.toLowerCase()) ||
                    votedOptionText.toLowerCase().includes(opt.toLowerCase())
                );
              }

              if (optionIndex >= 0) {
                const pollPayload = {
                  message_id: pollMessageId,
                  instance_id: resolvedPoll.instance_id || instance?.id || "",
                  group_jid: groupJid,
                  respondent: {
                    phone: participantPhone,
                    name: senderName,
                    jid: `${participantPhone}@s.whatsapp.net`,
                  },
                  response: {
                    option_index: optionIndex,
                    option_text: votedOptionText,
                  },
                  timestamp: new Date().toISOString(),
                  _raw_event: rawEvent,
                };

                const pollResponse = await fetch(
                  `${supabaseUrl}/functions/v1/handle-poll-response`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify(pollPayload),
                  }
                );

                pollProcessingResult = await pollResponse.json();
                console.log(`[webhook-inbound] Auto-processed poll response: ${JSON.stringify(pollProcessingResult)}`);

                await supabase
                  .from("webhook_events")
                  .update({
                    processing_result: pollProcessingResult,
                    processing_status: "processed",
                    processed_at: new Date().toISOString(),
                  })
                  .eq("id", insertedEvent.id);
              } else {
                console.log(`[webhook-inbound] Could not match voted option "${votedOptionText}" to poll options`);
                await supabase
                  .from("webhook_events")
                  .update({
                    processing_status: "error",
                    processing_error: `poll_option_no_match: "${votedOptionText}"`,
                  })
                  .eq("id", insertedEvent.id);
              }
            }
          }
        }
      } catch (pollError) {
        console.error("[webhook-inbound] Error auto-processing poll:", pollError);
        await supabase
          .from("webhook_events")
          .update({
            processing_error: pollError instanceof Error ? pollError.message : "Unknown error",
            processing_status: "error",
          })
          .eq("id", insertedEvent.id);
      }
    }

    // ==========================================
    // AUTO-PROCESS GROUP JOIN for Pirate Campaigns
    // ==========================================
    if (classification.eventType === "group_join" && context.chatJid && (context.senderPhone || context.senderLid)) {
      try {
        const phoneToSend = context.senderPhone || null;
        const lidToSend = context.senderLid || null;

        console.log(`[webhook-inbound] Detected group_join: group=${context.chatJid}, phone=${phoneToSend}, lid=${lidToSend}`);

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const pirateResponse = await fetch(
          `${supabaseUrl}/functions/v1/pirate-process-join`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              group_jid: context.chatJid,
              phone: phoneToSend,
              lid: lidToSend,
              instance_id: instance?.id || null,
              raw_event: rawEvent,
            }),
          }
        );

        const pirateResult = await pirateResponse.json();
        console.log(`[webhook-inbound] Pirate process result: ${JSON.stringify(pirateResult)}`);
      } catch (pirateError) {
        console.error("[webhook-inbound] Error processing pirate join:", pirateError);
      }
    }

    // ==========================================
    // AUTO-SYNC GROUP MEMBERS on join/leave via full list comparison
    // ==========================================
    console.log(`[webhook-inbound] group event check: type=${classification.eventType}, jid=${context.chatJid}, phone=${context.senderPhone}, lid=${context.senderLid}, userId=${instance?.user_id}`);
    if (
      (classification.eventType === "group_join" || classification.eventType === "group_leave") &&
      context.chatJid &&
      instance?.user_id
    ) {
      try {
        // Find group_campaigns linked to this group_jid via campaign_groups junction table
        const { data: linkedCampaigns } = await supabase
          .from("campaign_groups")
          .select("campaign_id, instance_id")
          .eq("group_jid", context.chatJid);

        const campaignIds = (linkedCampaigns || []).map((c: { campaign_id: string }) => c.campaign_id);
        console.log(`[webhook-inbound] Found ${campaignIds.length} linked campaigns for group ${context.chatJid}`);

        const { data: groupCampaigns } = campaignIds.length > 0
          ? await supabase
              .from("group_campaigns")
              .select("id, user_id, instance_id")
              .in("id", campaignIds)
              .eq("user_id", instance.user_id)
          : { data: [] as { id: string; user_id: string; instance_id: string | null }[] };

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        for (const gc of (groupCampaigns || [])) {
          const syncInstanceId = gc.instance_id || instance?.id;
          if (!syncInstanceId) {
            console.log(`[webhook-inbound] No instance for campaign ${gc.id}, skipping sync`);
            continue;
          }

          try {
            const syncResp = await fetch(
              `${supabaseUrl}/functions/v1/sync-group-members`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  groupJid: context.chatJid,
                  campaignId: gc.id,
                  instanceId: syncInstanceId,
                  userId: gc.user_id,
                  trigger: classification.eventType === "group_join" ? "join" : "leave",
                  senderLid: context.senderLid || null,
                }),
              }
            );

            const syncResult = await syncResp.json();
            console.log(`[webhook-inbound] sync-group-members result for campaign ${gc.id}:`, JSON.stringify(syncResult));

            // Update context.senderPhone if sync resolved the LID
            if (syncResult.resolvedPhone && !context.senderPhone) {
              context.senderPhone = syncResult.resolvedPhone;
              console.log(`[webhook-inbound] Updated senderPhone from sync: ${context.senderPhone}`);
            }
          } catch (syncErr) {
            console.error(`[webhook-inbound] sync-group-members error for campaign ${gc.id}:`, syncErr);
          }
        }
      } catch (memberSyncError) {
        console.error("[webhook-inbound] Error syncing group members:", memberSyncError);
      }
    }

    // ==========================================
    // AUTO-ACCUMULATE LEADS for Group Execution Lists
    // ==========================================
    if (context.chatJid && (context.senderPhone || context.senderLid)) {
      try {
        // Find group campaign by group_jid via campaign_groups
        const { data: campaignGroup } = await supabase
          .from("campaign_groups")
          .select("campaign_id")
          .eq("group_jid", context.chatJid)
          .maybeSingle();

        const campaignId = campaignGroup?.campaign_id || null;

        if (campaignId) {
          // Fetch ALL active execution lists for this campaign that monitor this event
          const { data: execLists } = await supabase
            .from("group_execution_lists")
            .select("id, current_cycle_id, monitored_events, user_id, execution_schedule_type, current_window_end, window_type, window_start_time, window_end_time")
            .eq("campaign_id", campaignId)
            .eq("is_active", true);

          // Resolve real phone from LID via group_members (if needed)
          let resolvedPhone = context.senderPhone || null;
          let resolvedLid = context.senderLid || null;

          // Heuristic: if "phone" looks like a LID (>14 digits and missing country code prefix), treat it as LID
          const looksLikeLid = (val: string | null | undefined): boolean => {
            if (!val) return false;
            const digits = val.replace(/\D/g, "");
            // Real BR phones: 10-13 digits with 55 prefix usually 12-13. LIDs are typically 15+.
            return digits.length >= 14 && !digits.startsWith("55") && !digits.startsWith("1");
          };

          if (!resolvedLid && looksLikeLid(resolvedPhone)) {
            // The "phone" we got is actually a LID
            resolvedLid = resolvedPhone;
            resolvedPhone = null;
          }

          // If we have a LID but no phone, try to look up the real phone from group_members
          if (resolvedLid && !resolvedPhone) {
            const lidNumeric = resolvedLid.split("@")[0].replace(/\D/g, "");
            const { data: memberMatch } = await supabase
              .from("group_members")
              .select("phone, lid")
              .or(`lid.eq.${resolvedLid},lid.eq.${lidNumeric},lid.eq.${lidNumeric}@lid`)
              .not("phone", "is", null)
              .limit(1)
              .maybeSingle();
            if (memberMatch?.phone) {
              resolvedPhone = memberMatch.phone;
              console.log(`[webhook-inbound] Resolved LID ${resolvedLid} → phone ${resolvedPhone}`);
            }
          }

          for (const execList of (execLists || [])) {
            // Check if event is monitored
            if (!(execList.monitored_events as string[]).includes(classification.eventType)) continue;

            // Detect fulltime (24h) lists — always open, skip window check
            const isFulltime = execList.window_type === "fixed" &&
              String(execList.window_start_time || "").startsWith("00:00") &&
              String(execList.window_end_time || "").startsWith("23:59");

            // For non-immediate, non-fulltime lists, check window
            if (execList.execution_schedule_type !== "immediate" && !isFulltime) {
              if (!execList.current_window_end || new Date(execList.current_window_end) <= new Date()) continue;
            }

            // Use real phone if available, otherwise use LID numeric as fallback identifier
            const execPhone = resolvedPhone || (resolvedLid ? resolvedLid.split("@")[0] : null);
            if (!execPhone) continue;

            // Build full event detail (JSON) for later inspection in UI
            const originDetailPayload = {
              chatName: context.chatName || null,
              chatJid: context.chatJid || null,
              senderPhone: resolvedPhone,
              senderLid: resolvedLid,
              senderName: context.senderName || null,
              eventType: classification.eventType,
              receivedAt: new Date().toISOString(),
              raw: payload.raw_event,
            };

            const { error: upsertError } = await supabase
              .from("group_execution_leads")
              .upsert(
                {
                  list_id: execList.id,
                  user_id: execList.user_id,
                  cycle_id: execList.current_cycle_id,
                  phone: execPhone,
                  lid: resolvedLid,
                  name: context.senderName || null,
                  origin_event: classification.eventType,
                  origin_detail: JSON.stringify(originDetailPayload),
                  status: "pending",
                },
                { onConflict: "list_id,phone,cycle_id", ignoreDuplicates: true }
              );

            if (upsertError) {
              console.error("[webhook-inbound] Execution list upsert error:", upsertError);
              continue;
            }

            console.log(`[webhook-inbound] Lead ${context.senderPhone} added to execution list ${execList.id}`);

            // For immediate lists, trigger processor right away
            if (execList.execution_schedule_type === "immediate") {
              try {
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
                const procResp = await fetch(
                  `${supabaseUrl}/functions/v1/group-execution-processor`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({ list_id: execList.id }),
                  }
                );
                const procResult = await procResp.json();
                console.log(`[webhook-inbound] Immediate execution result for list ${execList.id}:`, JSON.stringify(procResult));
              } catch (procErr) {
                console.error(`[webhook-inbound] Immediate execution error for list ${execList.id}:`, procErr);
              }
            }
          }
        }
      } catch (execListError) {
        console.error("[webhook-inbound] Error processing execution list:", execListError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id: insertedEvent.id,
        event_type: classification.eventType,
        classification: classification.classification,
        direction: classification.direction,
        confidence: classification.confidence,
        matched_rule: classification.matchedRule,
        poll_processing: pollProcessingResult,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[webhook-inbound] Error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
