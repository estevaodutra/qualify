import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type EventContext, type ClassificationResult } from "../../_shared/event-classifier.ts";

export async function processStatusEvent(
  supabase: SupabaseClient,
  instance: any,
  classification: ClassificationResult,
  context: EventContext,
  rawEvent: any,
  eventId: string
) {
  // ==========================================
  // MESSAGE DELIVERY STATUS UPDATES
  // ==========================================
  const isStatusAck = classification.eventType === "message.delivered" || 
                      classification.eventType === "message.read" || 
                      classification.eventType === "message.failed" || 
                      classification.eventType === "message.sent";

  if (isStatusAck && rawEvent.id) {
    try {
      const statusValue = classification.eventType.replace("message.", "");
      console.log(`[StatusController] Updating message status ${rawEvent.id} to ${statusValue}`);

      const { data, error } = await supabase
        .from("chat_messages")
        .update({ status: statusValue })
        .or(`message_id.eq.${rawEvent.id},zaap_id.eq.${rawEvent.id}`)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      await supabase
        .from("webhook_events")
        .update({
          processing_status: "processed",
          processed_at: new Date().toISOString(),
          processing_result: { message_updated: !!data, status: statusValue }
        })
        .eq("id", eventId);
        
    } catch (err) {
      console.error("[StatusController] Error updating message status:", err);
      await supabase
        .from("webhook_events")
        .update({
          processing_status: "error",
          processing_error: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", eventId);
    }
    return;
  }

  // ==========================================
  // AUTO-PROCESS POLL RESPONSES
  // ==========================================
  if (classification.eventType === "message.poll_update" || classification.eventType === "poll_response") {
    let pollProcessingResult: Record<string, unknown> | null = null;

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

          console.log(`[StatusController] Auto-processing poll vote from ${participantPhone} for message ${pollMessageId}`);

          const { data: pollMessage } = await supabase
            .from("poll_messages")
            .select("id, options, instance_id")
            .or(`message_id.eq.${pollMessageId},zaap_id.eq.${pollMessageId}`)
            .maybeSingle();

          let resolvedPoll = pollMessage;
          if (!resolvedPoll) {
            console.log(`[StatusController] Poll ${pollMessageId} not in poll_messages, trying auto-register from logs...`);
            
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
                      console.error(`[StatusController] Auto-register failed:`, registerError.message);
                      await supabase
                        .from("webhook_events")
                        .update({
                          processing_status: "error",
                          processing_error: `poll_auto_register_failed: ${registerError.message}`,
                        })
                        .eq("id", eventId);
                    } else {
                      resolvedPoll = insertedPoll;
                      console.log(`[StatusController] ✅ Auto-registered poll ${pollMessageId} from log ${logEntry.id}`);
                    }
                  }
                }
              }
            } else {
              console.log(`[StatusController] No matching log found for poll ${pollMessageId}`);
              await supabase
                .from("webhook_events")
                .update({
                  processing_status: "error",
                  processing_error: `poll_message_not_registered: ${pollMessageId}`,
                })
                .eq("id", eventId);
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
              console.log(`[StatusController] Auto-processed poll response: ${JSON.stringify(pollProcessingResult)}`);

              await supabase
                .from("webhook_events")
                .update({
                  processing_result: pollProcessingResult,
                  processing_status: "processed",
                  processed_at: new Date().toISOString(),
                })
                .eq("id", eventId);
            } else {
              console.log(`[StatusController] Could not match voted option "${votedOptionText}" to poll options`);
              await supabase
                .from("webhook_events")
                .update({
                  processing_status: "error",
                  processing_error: `poll_option_no_match: "${votedOptionText}"`,
                })
                .eq("id", eventId);
            }
          }
        }
      }
    } catch (pollError) {
      console.error("[StatusController] Error auto-processing poll:", pollError);
      await supabase
        .from("webhook_events")
        .update({
          processing_error: pollError instanceof Error ? pollError.message : "Unknown error",
          processing_status: "error",
        })
        .eq("id", eventId);
    }
  }
}
