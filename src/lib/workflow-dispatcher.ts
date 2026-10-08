import { supabase } from "@/integrations/supabase/client";

const recentDispatches = new Map<string, number>();

export async function dispatchWorkflowForDealMove(dealId: string, pipelineId: string, stageId: string) {
  const debounceKey = `${dealId}_${pipelineId}_${stageId}`;
  const now = Date.now();
  const lastTime = recentDispatches.get(debounceKey);
  if (lastTime && now - lastTime < 10000) {
    console.log(`[WorkflowDispatcher] Debounced duplicate dispatch for key: ${debounceKey}`);
    return;
  }
  recentDispatches.set(debounceKey, now);

  // Clean old entries
  if (recentDispatches.size > 200) {
    for (const [k, t] of recentDispatches.entries()) {
      if (now - t > 30000) recentDispatches.delete(k);
    }
  }

  try {
    const { data: dealData } = await supabase.from('deals').select('lead_id, pipeline_id, stage_id').eq('id', dealId).single();
    if (!dealData) return;
    
    const { data: leadData } = await supabase.from('leads').select('name, phone').eq('id', dealData.lead_id).single();
    if (!leadData) return;

    const { data: sequences } = await supabase
      .from('message_sequences')
      .select('id, trigger_config, company_id, trigger_type, sequence_nodes(node_type, config)')
      .eq('active', true);

    if (sequences && sequences.length > 0) {
      for (const seq of sequences) {
        const rootCfg = (seq.trigger_config as any) || {};
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
          (rootCfg.triggerType === 'pipeline_changed' || rootCfg.triggerType === 'deal_moved' || (seq as any).trigger_type === 'pipeline_changed' || (seq as any).trigger_type === 'deal_moved') &&
          rootCfg.pipelineId === pipelineId &&
          (!rootCfg.stageId || rootCfg.stageId === 'any' || rootCfg.stageId === stageId);

        if (hasMatchingTrigger || legacyMatch) {
          console.log(`[WorkflowDispatcher] Dispatching workflow ${seq.id} for deal move`);
          supabase.functions.invoke('trigger-sequence', {
            body: {
              sequenceId: seq.id,
              triggerId: matchingTriggerId,
              source: "pipeline_changed",
              name: leadData.name,
              phone: leadData.phone,
              companyId: seq.company_id,
              triggerContext: {
                source: "pipeline_changed",
                dealId: dealId,
                pipelineId: pipelineId,
                stageId: stageId,
              }
            }
          }).catch(err => console.error("Error triggering sequence:", err));
        }
      }
    }
  } catch (e) {
    console.error("Failed to check workflows for deal move", e);
  }
}
