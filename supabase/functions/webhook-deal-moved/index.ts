import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    
    if (payload.type !== 'UPDATE' || payload.table !== 'deals') {
      return new Response(JSON.stringify({ message: "Ignored" }), { headers: corsHeaders });
    }

    const newDeal = payload.record;
    const oldDeal = payload.old_record;

    // Only process if pipeline or stage actually changed
    if (newDeal.stage_id === oldDeal.stage_id && newDeal.pipeline_id === oldDeal.pipeline_id) {
      return new Response(JSON.stringify({ message: "Stage and pipeline unchanged. Ignored." }), { headers: corsHeaders });
    }

    const dealId = newDeal.id;
    const pipelineId = newDeal.pipeline_id;
    const stageId = newDeal.stage_id;
    const leadId = newDeal.lead_id;

    if (!leadId) {
      return new Response(JSON.stringify({ error: "Deal has no lead_id" }), { status: 400, headers: corsHeaders });
    }

    const { data: leadData } = await supabase.from('leads').select('name, phone').eq('id', leadId).single();
    if (!leadData) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: corsHeaders });
    }

    const { data: sequences } = await supabase
      .from('message_sequences')
      .select('id, trigger_config, company_id, trigger_type, sequence_nodes(node_type, config)')
      .eq('active', true);

    const dispatched: string[] = [];

    if (sequences && sequences.length > 0) {
      for (const seq of sequences) {
        const rootCfg = (seq.trigger_config as Record<string, any>) || {};
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
          (rootCfg.triggerType === 'pipeline_changed' || rootCfg.triggerType === 'deal_moved' || seq.trigger_type === 'pipeline_changed' || seq.trigger_type === 'deal_moved') &&
          rootCfg.pipelineId === pipelineId &&
          (!rootCfg.stageId || rootCfg.stageId === 'any' || rootCfg.stageId === stageId);

        if (hasMatchingTrigger || legacyMatch) {
          console.log(`[WebhookDealMoved] Dispatching workflow ${seq.id} for deal move`);
          
          await fetch(`${supabaseUrl}/functions/v1/trigger-sequence`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
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
            })
          });
          dispatched.push(seq.id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, dispatched }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("Error in webhook-deal-moved:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
