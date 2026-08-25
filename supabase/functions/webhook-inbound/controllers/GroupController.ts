import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type EventContext, type ClassificationResult } from "../../_shared/event-classifier.ts";

export async function processGroupEvent(
  supabase: SupabaseClient,
  instance: any,
  classification: ClassificationResult,
  context: EventContext,
  rawEvent: any,
  eventId: string
) {
  const evtType = (classification.eventType || "").toLowerCase();
  const isJoin =
    evtType === "group_join" ||
    evtType === "group.participant.add" ||
    evtType === "group_participant_add" ||
    evtType.includes("join") ||
    evtType.includes("add");
    
  const isLeave =
    evtType === "group_leave" ||
    evtType === "group.participant.remove" ||
    evtType === "group_participant_remove" ||
    evtType.includes("leave") ||
    evtType.includes("remove");

  const isGroupJoinOrLeave = isJoin || isLeave;
  const validGroupEvents = ["group_join", "group_leave", "group_participants", "group_update", "group_settings", "group.participant.add", "group.participant.remove"];
  
  if (!isGroupJoinOrLeave && !validGroupEvents.includes(classification.eventType)) return;

  // 0. ==========================================
  // INSERT SYSTEM MESSAGE INTO CHAT CONVERSATION
  // ==========================================
  if (context.chatJid && instance?.id && instance?.user_id) {
    try {
      if (isGroupJoinOrLeave) {
        // Resolve Company ID
        let companyId = null;
        const { data: company } = await supabase.from("companies").select("id").eq("owner_id", instance.user_id).limit(1).maybeSingle();
        if (company?.id) {
          companyId = company.id;
        } else {
          const { data: member } = await supabase.from("company_members").select("company_id").eq("user_id", instance.user_id).eq("is_active", true).limit(1).maybeSingle();
          if (member?.company_id) companyId = member.company_id;
        }

        if (companyId) {
          // The database automatically strips non-numeric characters from 'phone' using a trigger.
          // Therefore, we must clean the JID before querying or it will never be found, leading to a unique constraint error on insertion.
          const cleanGroupPhone = context.chatJid.replace(/\D/g, "");

          // Find or create the GROUP as a Lead
          let { data: groupLead, error: leadFindErr } = await supabase.from("leads")
            .select("id")
            .eq("company_id", companyId)
            .eq("phone", cleanGroupPhone)
            .limit(1)
            .maybeSingle();
            
          if (leadFindErr) {
            await supabase.from("alerts").insert({ user_id: instance.user_id, severity: "error", title: "GroupLead Find Error", message: JSON.stringify(leadFindErr) });
          }

          if (!groupLead) {
            const { data: newGroupLead, error: leadInsertErr } = await supabase.from("leads").insert({
              user_id: instance.user_id,
              company_id: companyId,
              phone: cleanGroupPhone,
              name: context.chatName || "Grupo WhatsApp",
              status: 'active'
            }).select("id").maybeSingle();
            
            if (leadInsertErr) {
              await supabase.from("alerts").insert({ user_id: instance.user_id, severity: "error", title: "GroupLead Insert Error", message: JSON.stringify(leadInsertErr) });
            }
            groupLead = newGroupLead;
          }

          if (groupLead?.id) {
            // Find or create Conversation for the Group
            let { data: conv, error: convFindErr } = await supabase.from("chat_conversations")
              .select("id")
              .eq("company_id", companyId)
              .eq("lead_id", groupLead.id)
              .eq("instance_id", instance.id)
              .maybeSingle();
              
            if (convFindErr) {
              await supabase.from("alerts").insert({ user_id: instance.user_id, severity: "error", title: "Conv Find Error", message: JSON.stringify(convFindErr) });
            }

            if (!conv) {
              const { data: newConv, error: convInsertErr } = await supabase.from("chat_conversations").insert({
                company_id: companyId,
                lead_id: groupLead.id,
                instance_id: instance.id,
                contact_name: groupLead.name || "Grupo WhatsApp",
                status: 'open'
              }).select("id").maybeSingle();
              
              if (convInsertErr) {
                await supabase.from("alerts").insert({ user_id: instance.user_id, severity: "error", title: "Conv Insert Error", message: JSON.stringify(convInsertErr) });
              }
              conv = newConv;
            }

            if (conv?.id) {
              let cleanSenderPhone = context.senderName || context.senderPhone || context.senderLid || rawEvent?.["@lid"] || rawEvent?.from_phone || rawEvent?.phone || "Um participante";

              // Tenta localizar se o participante já é um lead cadastrado pelo telefone ou @lid para exibir o nome dele
              if (companyId) {
                const phoneDigits = (context.senderPhone || rawEvent?.from_phone || rawEvent?.phone || "").replace(/\D/g, "");
                const lidVal = context.senderLid || rawEvent?.["@lid"] || rawEvent?.from_lid || rawEvent?.participant_lid;
                
                const orClauses = [];
                if (phoneDigits) orClauses.push(`phone.eq.${phoneDigits}`);
                if (lidVal) orClauses.push(`lid.eq.${lidVal}`);
                
                if (orClauses.length > 0) {
                  const { data: senderLead } = await supabase
                    .from("leads")
                    .select("name")
                    .eq("company_id", companyId)
                    .or(orClauses.join(","))
                    .limit(1)
                    .maybeSingle();
                    
                  if (senderLead?.name) {
                    cleanSenderPhone = senderLead.name;
                  }
                }
              }

              const systemBody = classification.eventType === "group_join"
                ? `${cleanSenderPhone} entrou no grupo.`
                : `${cleanSenderPhone} saiu do grupo.`;

              const { error: sysMsgErr } = await supabase.from("chat_messages").insert({
                company_id: companyId,
                conversation_id: conv.id,
                sender_type: "system",
                message_type: "system",
                body: systemBody,
                status: "read",
                is_internal: false,
                message_id: crypto.randomUUID()
              });
              
              if (sysMsgErr) {
                await supabase.from("alerts").insert({ user_id: instance.user_id, severity: "error", title: "Msg Insert Error", message: JSON.stringify(sysMsgErr) });
              } else {
                 await supabase.from("alerts").insert({ user_id: instance.user_id, severity: "info", title: "Group Msg Success", message: `Message inserted for ${context.chatJid}` });
              }
              
              // Touch the conversation to bring it to the top of the inbox
              await supabase.from("chat_conversations").update({
                last_message_at: new Date().toISOString()
              }).eq("id", conv.id);
              
              console.log(`[GroupController] System message inserted into GROUP conversation for ${classification.eventType}`);
            }
          }
        }
      }
    } catch (sysMsgErr) {
      await supabase.from("alerts").insert({ user_id: instance.user_id, severity: "error", title: "GroupController Exception", message: JSON.stringify(sysMsgErr, Object.getOwnPropertyNames(sysMsgErr)) });
      console.error("[GroupController] Error inserting system message:", sysMsgErr);
    }
  }

  // 1. ==========================================
  // AUTO-PROCESS GROUP JOIN for Pirate Campaigns
  // ==========================================
  if (isJoin && context.chatJid && (context.senderPhone || context.senderLid || rawEvent?.["@lid"])) {
    try {
      const phoneToSend = context.senderPhone || null;
      const lidToSend = context.senderLid || null;

      console.log(`[GroupController] Detected group_join: group=${context.chatJid}, phone=${phoneToSend}, lid=${lidToSend}`);

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
      console.log(`[GroupController] Pirate process result: ${JSON.stringify(pirateResult)}`);
    } catch (pirateError) {
      console.error("[GroupController] Error processing pirate join:", pirateError);
    }
  }

  // 2. ==========================================
  // AUTO-SYNC GROUP MEMBERS on join/leave via full list comparison
  // ==========================================
  if (isGroupJoinOrLeave && context.chatJid && instance?.user_id) {
    try {
      const { data: linkedCampaigns } = await supabase
        .from("campaign_groups")
        .select("campaign_id, instance_id")
        .eq("group_jid", context.chatJid);

      const campaignIds = (linkedCampaigns || []).map((c: { campaign_id: string }) => c.campaign_id);
      
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
        if (!syncInstanceId) continue;

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
          
          if (syncResult.resolvedPhone && !context.senderPhone) {
            context.senderPhone = syncResult.resolvedPhone;
          }
        } catch (syncErr) {
          console.error(`[GroupController] sync-group-members error:`, syncErr);
        }
      }
      // NEW: Trigger GENERIC sequences (dispatch_sequence & message_sequences) that listen to this group
      const targetTriggerType = classification.eventType === "group_join" ? "member_join" : "member_leave";
      const normalizeJid = (j: string | null | undefined) => (j || "").replace("-group", "").replace("@g.us", "").trim();
      const rawChatJid = context.chatJid || "";
      const normChatJid = normalizeJid(rawChatJid);
      const phoneToUse = context.senderPhone || context.senderLid;

      if (phoneToUse) {
        // 1. Dispatch sequences (legacy/standalone automations)
        const { data: genericSequences } = await supabase
          .from("dispatch_sequences")
          .select("id, campaign_id, trigger_config")
          .eq("trigger_type", targetTriggerType)
          .eq("is_active", true);

        if (genericSequences && genericSequences.length > 0) {
          for (const seq of genericSequences) {
            const config = seq.trigger_config as any;
            const groups = ((config && config.selectedGroupJids) || []).map(normalizeJid);
            if (groups.length === 0 || groups.includes(normChatJid)) {
              try {
                await fetch(`${supabaseUrl}/functions/v1/execute-dispatch-sequence`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({ 
                    campaignId: seq.campaign_id,
                    sequenceId: seq.id, 
                    contactPhone: phoneToUse, 
                    contactName: context.senderName || phoneToUse 
                  }),
                });
                console.log(`[GroupController] Triggered generic dispatch sequence ${seq.id} for ${phoneToUse}`);
              } catch (e) {
                console.error(`[GroupController] Error triggering generic dispatch sequence ${seq.id}:`, e);
              }
            }
          }
        }

        // 2. Message sequences (new Workflows engine)
        const { data: activeMessageSequences } = await supabase
          .from("message_sequences")
          .select("id, trigger_type, trigger_config")
          .eq("active", true);

        const { data: triggerNodes } = await supabase
          .from("sequence_nodes")
          .select("id, sequence_id, config")
          .eq("node_type", "trigger");

        if (activeMessageSequences && activeMessageSequences.length > 0) {
          for (const seq of activeMessageSequences) {
            const nodes = (triggerNodes || []).filter(n => n.sequence_id === seq.id);
            let isMatch = false;
            let matchedTriggerId: string | null = null;

            // Direct check on message_sequences table
            if (seq.trigger_type === targetTriggerType) {
              const config = (seq.trigger_config as any) || {};
              const groups = ((config && config.selectedGroupJids) || []).map(normalizeJid);
              if (groups.length === 0 || groups.includes(normChatJid)) {
                isMatch = true;
              }
            }

            // Check triggers defined in sequence_nodes (Workflow Builder multi-trigger support)
            for (const node of nodes) {
              const triggers = ((node.config as any) && (node.config as any).triggers) || [];
              for (const t of triggers) {
                if (t.type === targetTriggerType) {
                  const groups = ((t.config && t.config.selectedGroupJids) || []).map(normalizeJid);
                  if (groups.length === 0 || groups.includes(normChatJid)) {
                    isMatch = true;
                    matchedTriggerId = t.id;
                    break;
                  }
                }
              }
              if (isMatch) break;
            }

            if (isMatch) {
              try {
                console.log(`[GroupController] Triggering workflow sequence ${seq.id} (triggerId=${matchedTriggerId}) for ${phoneToUse}`);
                const triggerResp = await fetch(`${supabaseUrl}/functions/v1/trigger-sequence`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({ 
                    sequenceId: seq.id, 
                    phone: phoneToUse, 
                    group_jid: context.chatJid,
                    triggerId: matchedTriggerId || undefined
                  }),
                });
                const triggerJson = await triggerResp.json();
                console.log(`[GroupController] Triggered workflow sequence result:`, triggerJson);
              } catch (e) {
                console.error(`[GroupController] Error triggering workflow sequence ${seq.id}:`, e);
              }
            }
          }
        }
      }
    } catch (memberSyncError) {
      console.error("[GroupController] Error syncing group members:", memberSyncError);
    }
  }

  // 3. ==========================================
  // AUTO-ACCUMULATE LEADS for Group Execution Lists
  // ==========================================
  if (isGroupJoinOrLeave && context.chatJid && (context.senderPhone || context.senderLid)) {
    try {
      const { data: campaignGroup } = await supabase
        .from("campaign_groups")
        .select("campaign_id")
        .eq("group_jid", context.chatJid)
        .maybeSingle();

      const campaignId = campaignGroup?.campaign_id || null;

      if (campaignId) {
        const { data: execLists } = await supabase
          .from("group_execution_lists")
          .select("id, current_cycle_id, monitored_events, user_id, execution_schedule_type, current_window_end, window_type, window_start_time, window_end_time")
          .eq("campaign_id", campaignId)
          .eq("is_active", true);

        let resolvedPhone = context.senderPhone || null;
        let resolvedLid = context.senderLid || null;

        const looksLikeLid = (val: string | null | undefined): boolean => {
          if (!val) return false;
          const digits = val.replace(/\D/g, "");
          return digits.length >= 14 && !digits.startsWith("55") && !digits.startsWith("1");
        };

        if (!resolvedLid && looksLikeLid(resolvedPhone)) {
          resolvedLid = resolvedPhone;
          resolvedPhone = null;
        }

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
          }
        }

        for (const execList of (execLists || [])) {
          if (!(execList.monitored_events as string[]).includes(classification.eventType)) continue;

          const isFulltime = execList.window_type === "fixed" &&
            String(execList.window_start_time || "").startsWith("00:00") &&
            String(execList.window_end_time || "").startsWith("23:59");

          if (execList.execution_schedule_type !== "immediate" && !isFulltime) {
            if (!execList.current_window_end || new Date(execList.current_window_end) <= new Date()) continue;
          }

          const execPhone = resolvedPhone || (resolvedLid ? resolvedLid.split("@")[0] : null);
          if (!execPhone) continue;

          const originDetailPayload = {
            chatName: context.chatName || null,
            chatJid: context.chatJid || null,
            senderPhone: resolvedPhone,
            senderLid: resolvedLid,
            senderName: context.senderName || null,
            eventType: classification.eventType,
            receivedAt: new Date().toISOString(),
            raw: rawEvent,
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

          if (upsertError) continue;

          if (execList.execution_schedule_type === "immediate") {
            try {
              const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
              const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
              fetch(
                `${supabaseUrl}/functions/v1/group-execution-processor`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({ list_id: execList.id }),
                }
              ).catch(e => console.error(e));
            } catch (procErr) {
              console.error(procErr);
            }
          }
        }
      }
    } catch (execListError) {
      console.error("[GroupController] Error processing execution list:", execListError);
    }
  }
}
