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
  const CONTEXT_TRIGGER_TYPES = [
    "message.received", "message.sent", "text_message", "image_message",
    "audio_message", "video_message", "document_message", "sticker_message",
    "location_message", "contact_message", "button_response", "list_response", "poll_response"
  ];
  const isMessage = CONTEXT_TRIGGER_TYPES.includes(classification.eventType) || classification.direction === "inbound";
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

  // 1.5. ==========================================
  // RESUME WORKFLOWS WAITING FOR USER INPUT (ENTRADA DO USUÁRIO)
  // ==========================================
  if (isInbound && !context.isFromMe) {
    try {
      const cleanPhone = (context.senderPhone || (context.chatType !== "group" ? context.chatJid : "") || "").replace(/\D/g, "");
      const chatJid = context.chatJid || "";
      const isGroup = context.chatType === "group" || chatJid.includes("@g.us") || chatJid.endsWith("-group");

      let pendingInput: any = null;

      // 1. If it's a group, check if there's a waiting user_input session for this group JID
      if (isGroup && chatJid) {
        const { data: groupInputs } = await supabase
          .from("workflow_user_inputs")
          .select("*")
          .eq("status", "waiting")
          .eq("group_jid", chatJid)
          .order("created_at", { ascending: false })
          .limit(1);

        if (groupInputs && groupInputs.length > 0) {
          pendingInput = groupInputs[0];
        }
      }

      // 2. If not found by group_jid or not a group, search by phone
      if (!pendingInput && cleanPhone) {
        const suffix = cleanPhone.slice(-8);
        let phoneQuery = supabase
          .from("workflow_user_inputs")
          .select("*")
          .eq("status", "waiting")
          .order("created_at", { ascending: false })
          .limit(1);

        if (suffix.length >= 8) {
          phoneQuery = phoneQuery.or(`phone.eq.${cleanPhone},phone.ilike.%${suffix}`);
        } else {
          phoneQuery = phoneQuery.eq("phone", cleanPhone);
        }

        const { data: phoneInputs } = await phoneQuery;
        if (phoneInputs && phoneInputs.length > 0) {
          pendingInput = phoneInputs[0];
        }
      }

      if (pendingInput) {
        console.log(`[MessageController] 🎯 Found waiting user_input session ${pendingInput.id} for phone/chat ${cleanPhone || chatJid}`);
        const rawMsgObj = rawEvent.body || rawEvent.payload || rawEvent;

        // Extract text / caption
        const textContent = (
          typeof rawMsgObj === "string"
            ? rawMsgObj
            : rawMsgObj?.text?.message ||
              rawMsgObj?.text ||
              rawMsgObj?.message?.conversation ||
              rawMsgObj?.message?.extendedTextMessage?.text ||
              rawMsgObj?.caption ||
              rawMsgObj?.message?.imageMessage?.caption ||
              rawMsgObj?.message?.videoMessage?.caption ||
              rawMsgObj?.message?.documentMessage?.caption ||
              rawMsgObj?.body ||
              rawEvent?.body ||
              ""
        ) as string;

        // Extract media URL across all providers
        const mediaUrl = (
          rawMsgObj?.audioUrl ||
          rawMsgObj?.audio?.audioUrl ||
          rawMsgObj?.imageUrl ||
          rawMsgObj?.image?.imageUrl ||
          rawMsgObj?.videoUrl ||
          rawMsgObj?.video?.videoUrl ||
          rawMsgObj?.documentUrl ||
          rawMsgObj?.document?.documentUrl ||
          rawMsgObj?.file_url ||
          rawMsgObj?.stickerUrl ||
          rawMsgObj?.sticker?.stickerUrl ||
          rawMsgObj?.mediaUrl ||
          rawMsgObj?.url ||
          rawMsgObj?.message?.audioMessage?.url ||
          rawMsgObj?.message?.imageMessage?.url ||
          rawMsgObj?.message?.videoMessage?.url ||
          rawMsgObj?.message?.documentMessage?.url ||
          rawMsgObj?.message?.stickerMessage?.url ||
          rawEvent?.audioUrl ||
          rawEvent?.imageUrl ||
          rawEvent?.videoUrl ||
          rawEvent?.documentUrl ||
          rawEvent?.stickerUrl ||
          ""
        ) as string;

        // Identify message type
        const evtType = classification.eventType || "";
        const evtSubtype = classification.eventSubtype || "";

        const isAudio = evtType === "audio_message" || evtSubtype === "audio" || Boolean(rawMsgObj?.audio || rawMsgObj?.audioUrl || rawEvent?.audioUrl || rawMsgObj?.message?.audioMessage);
        const isImage = evtType === "image_message" || evtSubtype === "image" || Boolean(rawMsgObj?.image || rawMsgObj?.imageUrl || rawEvent?.imageUrl || rawMsgObj?.message?.imageMessage);
        const isVideo = evtType === "video_message" || evtSubtype === "video" || Boolean(rawMsgObj?.video || rawMsgObj?.videoUrl || rawEvent?.videoUrl || rawMsgObj?.message?.videoMessage);
        const isDocument = evtType === "document_message" || evtSubtype === "document" || Boolean(rawMsgObj?.document || rawMsgObj?.documentUrl || rawEvent?.documentUrl || rawMsgObj?.message?.documentMessage);
        const isSticker = evtType === "sticker_message" || evtSubtype === "sticker" || Boolean(rawMsgObj?.sticker || rawMsgObj?.stickerUrl || rawEvent?.stickerUrl || rawMsgObj?.message?.stickerMessage);
        const isLocation = evtType === "location_message" || evtSubtype === "location" || Boolean(rawMsgObj?.location || rawMsgObj?.message?.locationMessage);
        const isContact = evtType === "contact_message" || evtSubtype === "contact" || Boolean(rawMsgObj?.contact || rawMsgObj?.vcard || rawMsgObj?.message?.contactMessage);

        let fallbackLabel = "";
        let detectedMediaType = "text";

        if (isAudio) { fallbackLabel = "[Áudio]"; detectedMediaType = "audio"; }
        else if (isImage) { fallbackLabel = "[Imagem]"; detectedMediaType = "image"; }
        else if (isVideo) { fallbackLabel = "[Vídeo]"; detectedMediaType = "video"; }
        else if (isDocument) { fallbackLabel = "[Documento]"; detectedMediaType = "document"; }
        else if (isSticker) { fallbackLabel = "[Figurinha]"; detectedMediaType = "sticker"; }
        else if (isLocation) { fallbackLabel = "[Localização]"; detectedMediaType = "location"; }
        else if (isContact) { fallbackLabel = "[Contato]"; detectedMediaType = "contact"; }

        const trimmedText = textContent ? textContent.trim() : "";
        const effectiveResponseText = trimmedText || mediaUrl || fallbackLabel || "Mensagem recebida";
        const isMediaOnly = !trimmedText && Boolean(mediaUrl || fallbackLabel);

        console.log(`[MessageController] Inbound response parsed: type=${detectedMediaType}, text="${trimmedText}", mediaUrl="${mediaUrl}", effectiveResponse="${effectiveResponseText}"`);

        // Mark session as answered
        await supabase
          .from("workflow_user_inputs")
          .update({
            status: "answered",
            response_text: effectiveResponseText,
            answered_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", pendingInput.id);

        // Update lead core or custom field if target_field is configured
        let isNameField = false;
        let leadIdToUpdate = pendingInput.lead_id;

        if (pendingInput.target_field) {
          if (!leadIdToUpdate && cleanPhone) {
            const suffix = cleanPhone.slice(-8);
            const { data: leadFound } = await supabase
              .from("leads")
              .select("id")
              .or(`phone.eq.${cleanPhone},phone.ilike.%${suffix}`)
              .limit(1)
              .maybeSingle();
            if (leadFound) leadIdToUpdate = leadFound.id;
          }

          const rawField = String(pendingInput.target_field || "").trim();
          const lowerField = rawField.toLowerCase();
          isNameField = ["name", "nome", "nome completo", "nome_completo", "fullname", "full_name"].includes(lowerField);
          const isEmailField = ["email", "e-mail"].includes(lowerField);
          const isDocumentField = ["document", "cpf", "cnpj", "documento"].includes(lowerField);
          const isCompanyField = ["company_name", "empresa", "company"].includes(lowerField);
          const isWebsiteField = ["website", "site"].includes(lowerField);

          let coreFieldToUpdate: string | null = null;
          if (isNameField) {
            // Only update core name if user sent actual text (avoid renaming contact to "[Áudio]" or a storage URL)
            if (!isMediaOnly && trimmedText) {
              coreFieldToUpdate = "name";
            }
          } else if (isEmailField) coreFieldToUpdate = "email";
          else if (isDocumentField) coreFieldToUpdate = "document";
          else if (isCompanyField) coreFieldToUpdate = "company_name";
          else if (isWebsiteField) coreFieldToUpdate = "website";

          if (leadIdToUpdate) {
            if (coreFieldToUpdate) {
              await supabase.from("leads").update({
                [coreFieldToUpdate]: effectiveResponseText,
                updated_at: new Date().toISOString()
              }).eq("id", leadIdToUpdate);
              console.log(`[MessageController] Updated core field ${coreFieldToUpdate} = "${effectiveResponseText}" on lead ${leadIdToUpdate}`);
            } else {
              const { data: l } = await supabase.from("leads").select("custom_fields").eq("id", leadIdToUpdate).maybeSingle();
              const existingCustom = (l?.custom_fields as Record<string, any>) || {};
              await supabase.from("leads").update({
                custom_fields: { ...existingCustom, [rawField]: effectiveResponseText },
                updated_at: new Date().toISOString()
              }).eq("id", leadIdToUpdate);
              console.log(`[MessageController] Updated custom_fields.${rawField} = "${effectiveResponseText}" on lead ${leadIdToUpdate}`);
            }
          }

          // If name was updated, synchronize chat_conversations so the chat UI updates immediately
          if (isNameField && !isMediaOnly && trimmedText && cleanPhone) {
            try {
              const suffix = cleanPhone.slice(-8);
              await supabase
                .from("chat_conversations")
                .update({ contact_name: trimmedText, updated_at: new Date().toISOString() })
                .or(`contact_phone.eq.${cleanPhone},contact_phone.ilike.%${suffix}`);
              console.log(`[MessageController] Synchronized contact_name = "${trimmedText}" in chat_conversations`);
            } catch (convSyncErr) {
              console.warn("[MessageController] Could not sync contact_name to chat_conversations:", convSyncErr);
            }
          }
        }

        // Find the connection from the waiting node to the next step (success / default branch, NOT timeout and NOT error)
        const { data: connections } = await supabase
          .from("sequence_connections")
          .select("target_node_id, condition_path")
          .eq("sequence_id", pendingInput.sequence_id)
          .eq("source_node_id", pendingInput.node_id);

        const successConn = (connections || []).find((c: any) => 
          c.condition_path !== "timeout" && c.condition_path !== "error"
        ) || (connections || [])[0];

        const nextNodeId = successConn?.target_node_id || null;

        if (nextNodeId) {
          console.log(`[MessageController] Resuming sequence ${pendingInput.sequence_id} from node ${nextNodeId} (condition_path: ${successConn?.condition_path || "default"}) for phone/chat ${cleanPhone || chatJid}`);
          const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
          const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

          // Clean up any duplicate active executions for this same sequence + lead
          if (pendingInput.sequence_id && (pendingInput.lead_id || leadIdToUpdate || effectivePhone)) {
            try {
              let dupQuery = supabase
                .from("sequence_executions")
                .select("id")
                .eq("sequence_id", pendingInput.sequence_id)
                .in("status", ["running", "paused", "waiting"]);

              if (pendingInput.execution_id) {
                dupQuery = dupQuery.neq("id", pendingInput.execution_id);
              }
              const resolvedId = pendingInput.lead_id || leadIdToUpdate;
              if (resolvedId) {
                dupQuery = dupQuery.or(`trigger_context->>leadId.eq.${resolvedId},trigger_context->>contactId.eq.${resolvedId}`);
              } else if (effectivePhone) {
                dupQuery = dupQuery.or(`trigger_context->>respondentPhone.ilike.%${effectivePhone.slice(-8)}%,trigger_context->>contactPhone.ilike.%${effectivePhone.slice(-8)}%`);
              }
              const { data: dups } = await dupQuery;
              if (dups && dups.length > 0) {
                const dupIds = dups.map(d => d.id);
                console.log(`[MessageController] Closing ${dupIds.length} duplicate execution(s) for sequence ${pendingInput.sequence_id}`);
                await supabase.from("sequence_executions").update({ status: "superseded", error_message: "Substituído por retomada" }).in("id", dupIds);
              }
            } catch (dupErr) {
              console.warn("[MessageController] Error cleaning duplicates:", dupErr);
            }
          }

          fetch(`${supabaseUrl}/functions/v1/execute-message`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              campaignId: pendingInput.company_id || pendingInput.sequence_id,
              sequenceId: pendingInput.sequence_id,
              executionId: pendingInput.execution_id,
              startFromNodeId: nextNodeId,
              resumedExecution: true,
              triggerContext: {
                resumedFromUserInput: true,
                resumeNodeId: nextNodeId,
                userResponse: effectiveResponseText,
                mediaUrl: mediaUrl || null,
                mediaType: detectedMediaType,
                userInputField: pendingInput.target_field,
                respondentPhone: effectivePhone,
                respondentName: respondentName,
                leadId: pendingInput.lead_id || leadIdToUpdate,
                companyId: pendingInput.company_id,
                instanceId: pendingInput.instance_id || instance?.id,
                groupJid: pendingInput.group_jid || (isGroup ? chatJid : null),
                customFields: {
                  ...(pendingInput.target_field ? { [pendingInput.target_field]: effectiveResponseText } : {}),
                  ...(isNameField && !isMediaOnly && trimmedText ? { name: trimmedText, nome: trimmedText } : {}),
                },
              }
            })
          }).catch(resumeErr => console.error("[MessageController] Error triggering resume sequence:", resumeErr));
        }
      }
    } catch (userInputErr) {
      console.error("[MessageController] Error checking waiting user_input:", userInputErr);
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
