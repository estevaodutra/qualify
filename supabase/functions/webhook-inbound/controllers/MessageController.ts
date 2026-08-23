import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppMessage } from "../../_shared/whatsapp-client.ts";
import { logProspectingEvent } from "../../_shared/prospecting-events.ts";
import { type EventContext, type ClassificationResult } from "../../_shared/event-classifier.ts";
import { dispatchWebPushNotification } from "../../_shared/push-dispatcher.ts";

export async function processMessageEvent(
  supabase: SupabaseClient,
  instance: any,
  classification: ClassificationResult,
  context: EventContext,
  rawEvent: any
) {
  const CONTEXT_TRIGGER_TYPES = ["message.received", "message.sent", "text_message", "image_message", "audio_message", "video_message", "document_message", "sticker_message"];
  const isMessage = CONTEXT_TRIGGER_TYPES.includes(classification.eventType);
  const isInbound = classification.direction === "inbound" || classification.eventType === "message.received";

  if (!isMessage) return;

  // 1. ==========================================
  // PROCESS CUSTOM EVENT ACTION RULES
  // ==========================================
  if (instance?.user_id) {
    try {
      const { data: rules } = await supabase
        .from("event_action_rules")
        .select("*")
        .eq("user_id", instance.user_id)
        .eq("event_type", classification.eventType)
        .eq("is_active", true);

      if (rules && rules.length > 0) {
        console.log(`[MessageController] Found ${rules.length} custom rules for event ${classification.eventType}`);
        for (const rule of rules) {
          console.log(`[MessageController] Triggering action ${rule.action_type} for rule ${rule.name}`);
          
          if (rule.action_type === "webhook") {
            const config = rule.action_config as any;
            if (config.url) {
              fetch(config.url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  rule_name: rule.name,
                  event_type: classification.eventType,
                  context: context,
                  payload: rawEvent
                })
              }).catch(err => console.error(`[MessageController] Rule webhook error:`, err));
            }
          }
        }
      }
    } catch (ruleError) {
      console.error("[MessageController] Error processing custom rules:", ruleError);
    }
  }

  // 2. ==========================================
  // AUTO-TRIGGER CONTEXT CAMPAIGNS (KEYWORDS & FIRST MESSAGE)
  // ==========================================
  if (context.chatJid && context.chatType === "group" && isInbound) {
    try {
      const eventBody = rawEvent.body || rawEvent.payload || rawEvent;
      const bodyText = (eventBody?.text?.message || eventBody?.text || eventBody?.message?.conversation || eventBody?.message?.extendedTextMessage?.text || eventBody?.body || "") as string;
      const mediaCaption = (eventBody?.image?.caption || eventBody?.video?.caption || eventBody?.document?.fileName || "") as string;
      const triggerLabel = bodyText || mediaCaption || `[${classification.eventType}]`;

      const groupBase = context.chatJid.replace(/@g\.us$/, "").replace(/-group$/, "");

      const { data: activeCampaigns } = await supabase
        .from("context_campaigns")
        .select("*")
        .or(`group_jid.eq.${context.chatJid},group_jid.eq.${groupBase}-group,group_jid.eq.${groupBase}@g.us,group_jid.eq.${groupBase}`)
        .eq("is_active", true);

      if (activeCampaigns && activeCampaigns.length > 0) {
        const campaignIds = activeCampaigns.map((c: { id: string }) => c.id);
        const { data: activeExecs } = await supabase
          .from("context_executions")
          .select("id")
          .eq("status", "collecting")
          .in("campaign_id", campaignIds)
          .limit(1);

        const hasActiveWindow = activeExecs && activeExecs.length > 0;

        for (const campaign of activeCampaigns) {
          const config = campaign.trigger_config as any;
          let shouldTrigger = false;

          const keyword = config?.keyword;
          if (campaign.trigger_type === "keyword" && keyword && bodyText.toLowerCase().startsWith(keyword.toLowerCase())) {
            shouldTrigger = true;
          }

          if (campaign.trigger_type === "first_message" && !hasActiveWindow) {
            shouldTrigger = true;
          }

          if (shouldTrigger) {
            console.log(`[MessageController] 🎯 Context Trigger! Campaign: ${campaign.name}, Type: ${campaign.trigger_type}`);

            const durationMinutes = config?.duration_minutes || 30;
            const startAt = new Date(Date.now() - 30000).toISOString();
            const endAt = new Date(Date.now() + durationMinutes * 60000).toISOString();

            const { data: execution, error: execError } = await supabase
              .from("context_executions")
              .insert({
                campaign_id: campaign.id,
                user_id: campaign.user_id,
                company_id: campaign.company_id,
                start_at: startAt,
                end_at: endAt,
                status: "collecting",
                trigger_message: triggerLabel
              })
              .select()
              .single();

            if (!execError && execution) {
              console.log(`[MessageController] Context window started: ${execution.id}`);

              const instanceId = campaign.instance_id || instance?.id;
              if (campaign.opening_message && instanceId) {
                console.log(`[MessageController] Sending opening message for campaign ${campaign.id}`);

                const { data: fullInstance } = await supabase
                  .from("instances")
                  .select("*")
                  .eq("id", instanceId)
                  .single();

                if (fullInstance) {
                  const payload = {
                    action: "message.send_text",
                    campaign: { id: campaign.id, name: campaign.name },
                    instance: {
                      id: fullInstance.id,
                      name: fullInstance.name,
                      phone: fullInstance.phone || "",
                      provider: fullInstance.provider,
                      externalId: fullInstance.external_instance_id,
                      externalToken: fullInstance.external_instance_token
                    },
                    destination: {
                      phone: context.chatJid.split("@")[0],
                      jid: context.chatJid,
                      name: context.chatName || ""
                    },
                    node: {
                      id: "context_opening",
                      type: "text",
                      order: 0,
                      config: { text: campaign.opening_message }
                    }
                  };

                  sendWhatsAppMessage(payload as any).catch(e => console.error("[MessageController] Error sending opening message:", e));
                }
              }
            }
          }
        }
      }
    } catch (contextErr) {
      console.error("[MessageController] Error processing context trigger:", contextErr);
    }
  }

  // 3. ==========================================
  // PROSPECTING PAUSE-ON-REPLY
  // ==========================================
  if (isInbound && context.chatType !== "group" && context.senderPhone && instance?.id) {
    try {
      const normalizedPhone = context.senderPhone.replace(/\D/g, "");

      const { data: candidateQueueItems } = await supabase
        .from("prospecting_queue")
        .select("id, prospecting_campaign_id, lead_id, company_id, status")
        .eq("instance_id", instance.id)
        .in("status", ["pending", "scheduled", "processing", "completed"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (candidateQueueItems && candidateQueueItems.length > 0) {
        const candidateLeadIds = Array.from(new Set(candidateQueueItems.map((q) => q.lead_id)));
        const { data: matchingLead } = await supabase
          .from("leads")
          .select("id, phone")
          .in("id", candidateLeadIds)
          .eq("phone", normalizedPhone)
          .maybeSingle();

        if (matchingLead) {
          const queueRow = candidateQueueItems.find((q) => q.lead_id === matchingLead.id);
          if (queueRow && queueRow.status !== "replied") {
            await supabase
              .from("prospecting_queue")
              .update({ status: "replied", replied_at: new Date().toISOString() })
              .eq("id", queueRow.id);

            const { data: parentCampaign } = await supabase
              .from("prospecting_campaigns")
              .select("queue_policy")
              .eq("id", queueRow.prospecting_campaign_id)
              .maybeSingle();

            const pauseOnReply = (parentCampaign?.queue_policy as any)?.pause_on_reply !== false;

            if (pauseOnReply) {
              await supabase
                .from("prospecting_queue")
                .update({ status: "cancelled" })
                .eq("lead_id", matchingLead.id)
                .eq("prospecting_campaign_id", queueRow.prospecting_campaign_id)
                .in("status", ["pending", "scheduled"]);
            }

            await logProspectingEvent(supabase, {
              companyId: queueRow.company_id,
              campaignId: queueRow.prospecting_campaign_id,
              leadId: matchingLead.id,
              eventType: "prospecting.lead_replied",
              payload: { senderPhone: normalizedPhone, pausedRemaining: pauseOnReply },
            });
          }
        }
      }
    } catch (pauseErr) {
      console.error("[MessageController] Error processing prospecting pause-on-reply:", pauseErr);
    }
  }

  // 4. ==========================================
  // WEB PUSH NOTIFICATION DISPATCHER (INBOUND REAL MESSAGES)
  // ==========================================
  if (isInbound && context.chatType !== "group" && instance?.user_id) {
    try {
      const senderTitle = context.senderName || context.senderPhone || "Nova mensagem";
      const rawMsgObj = rawEvent.body || rawEvent.payload || rawEvent;
      const bodyText = (typeof rawMsgObj === "string" ? rawMsgObj : rawMsgObj?.text?.message || rawMsgObj?.text || rawMsgObj?.message?.conversation || rawMsgObj?.message?.extendedTextMessage?.text || rawMsgObj?.caption || "") as string;

      let detectedMediaType: string | undefined = undefined;
      if (rawEvent.type === "image" || rawMsgObj?.image) detectedMediaType = "image";
      else if (rawEvent.type === "audio" || rawMsgObj?.audio) detectedMediaType = "audio";
      else if (rawEvent.type === "video" || rawMsgObj?.video) detectedMediaType = "video";
      else if (rawEvent.type === "document" || rawMsgObj?.document) detectedMediaType = "document";
      else if (rawEvent.type === "location" || rawMsgObj?.location) detectedMediaType = "location";

      await dispatchWebPushNotification(supabase, {
        companyId: instance.company_id || "",
        userIds: [instance.user_id],
        title: senderTitle,
        body: bodyText,
        conversationId: context.messageId,
        mediaType: detectedMediaType,
      });
    } catch (pushErr) {
      console.error("[MessageController] Error dispatching push notification:", pushErr);
    }
  }
}
