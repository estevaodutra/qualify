async function test() {
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
              const phoneClean = dest.group_jid.split("@")[0].replace(/\D/g, "");
              
              // Load the lead
              const { data: leadData } = await supabase
                .from("leads")
                .select("id, name, phone, email, company_name, document, source, tags, custom_fields")
                .eq("company_id", typedCampaign.company_id || typedCampaign.company_id)
                .eq("phone", phoneClean)
                .maybeSingle();

              let targetLead = leadData;
              
              if (!targetLead && phoneClean) {
                // Auto-create lead if it doesn't exist so the pipeline can continue
                const { data: newLead, error: newLeadErr } = await supabase
                  .from("leads")
                  .insert({
                    company_id: typedCampaign.company_id || typedCampaign.company_id,
                    user_id: typedCampaign.user_id,
                    phone: phoneClean,
                    name: triggerContext?.respondentName || phoneClean,
                    custom_fields: {}
                  })
                  .select("id, name, phone, email, company_name, document, source, tags, custom_fields")
                  .single();
                  
                if (newLead) {
                  targetLead = newLead;
                  if (triggerContext) triggerContext.leadId = newLead.id;
                  console.log(`[ExecuteMessage] ­ƒåò Auto-created lead ${newLead.id} for phone ${phoneClean} in field_op`);
                } else {
                  console.error(`[ExecuteMessage] ÔØî Failed to auto-create lead in field_op:`, newLeadErr);
                }
              }

              if (targetLead) {
                affectedLeadIds.push(targetLead.id);
                let leadUpdated = false;
                const leadUpdates: Record<string, any> = {};
                const currentCf = { ...((targetLead.custom_fields as Record<string, any>) || {}) };

                for (const mapping of mappings) {
                  // Resolve source value
                  let rawVal = "";
                  if (webhookPayload && mapping.source && (mapping.source.startsWith("body.") || mapping.source.startsWith("headers.") || mapping.source.startsWith("query_params.") || mapping.source === "method")) {
                    rawVal = getValueFromPath(webhookPayload, mapping.source);
                  } else {
                    rawVal = replaceVariables(mapping.source || "");
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
                  if (mapping.targetField === "phone" || mapping.targetField.endsWith(".phone")) {
                    rawVal = rawVal.replace(/\D/g, "");
                  }

                  // Process target updates
                  if (mapping.targetType === "lead") {
                    const fieldKey = mapping.targetField;
                    if (fieldKey.startsWith("custom_fields.")) {
                      const cfKey = fieldKey.substring("custom_fields.".length);
                      currentCf[cfKey] = rawVal;
                      leadUpdated = true;
                      
                      if (!triggerContext.customFields) triggerContext.customFields = {};
                      (triggerContext.customFields as Record<string, string>)[cfKey] = rawVal;
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
                        // Also update the active destination so subsequent nodes send to the correct number
                        dest.group_jid = `${rawVal}@s.whatsapp.net`;
                        dest.respondentJid = `${rawVal}@s.whatsapp.net`;
                      }
                    } else if (fieldKey === "tags") {
                      const existingTags = Array.isArray(targetLead.tags) ? targetLead.tags : [];
                      const newTags = rawVal.split(",").map(t => t.trim()).filter(Boolean);
                      leadUpdates.tags = Array.from(new Set([...existingTags, ...newTags]));
                      leadUpdated = true;
                    } else {
                      currentCf[fieldKey] = rawVal;
                      leadUpdated = true;
                      if (!triggerContext.customFields) triggerContext.customFields = {};
                      (triggerContext.customFields as Record<string, string>)[fieldKey] = rawVal;
                    }
                  } else if (mapping.targetType === "deal") {
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

                    const dealField = mapping.targetField;
                    const dealUpdates: Record<string, any> = {};
                    
                    if (dealField === "title") dealUpdates.title = rawVal;
                    else if (dealField === "value") dealUpdates.value = Number(rawVal) || 0;
                    else if (dealField === "pipeline_id") dealUpdates.pipeline_id = rawVal || null;
                    else if (dealField === "stage_id") dealUpdates.stage_id = rawVal || null;

                    if (existingDeal) {
                      await supabase
                        .from("deals")
                        .update(dealUpdates)
                        .eq("id", existingDeal.id);
                      affectedDealIds.push(existingDeal.id);
                    } else {
                      const { data: newDeal } = await supabase
                        .from("deals")
                        .insert({
                          company_id: typedCampaign.company_id || typedCampaign.company_id,
                          lead_id: targetLead.id,
                          title: dealUpdates.title || `Neg├│cio ${targetLead.name || targetLead.phone}`,
                          value: dealUpdates.value || 0,
                          pipeline_id: dealUpdates.pipeline_id || null,
                          stage_id: dealUpdates.stage_id || null,
                          status: "open"
                        })
                        .select("id")
                        .single();
                      if (newDeal) {
                        affectedDealIds.push(newDeal.id);
                      }
                    }
                  } else if (mapping.targetType === "conversation") {
                    if (mapping.targetField === "phone") {
                      triggerContext.respondentPhone = rawVal;
                    }
                  } else if (mapping.targetType === "variable") {
                    if (!triggerContext.customFields) triggerContext.customFields = {};
                    (triggerContext.customFields as Record<string, string>)[mapping.targetField] = rawVal;
                  }
                }

                if (leadUpdated) {
                  const finalLeadUpdates = { ...leadUpdates };
                  if (Object.keys(currentCf).length > 0) {
                    finalLeadUpdates.custom_fields = currentCf;
                  }
                  await supabase
                    .from("leads")
                    .update(finalLeadUpdates)
                    .eq("id", targetLead.id);
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

}