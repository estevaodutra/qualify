import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { taskId, actionId, notes, operatorId, keepCallActive } = await req.json();

    if (!taskId || !actionId) {
      return new Response(
        JSON.stringify({ error: "Missing taskId or actionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch task
    const { data: task, error: fetchError } = await supabase
      .from("workflow_call_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (fetchError || !task) {
      return new Response(
        JSON.stringify({ error: `Task not found: ${fetchError?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find action configuration
    const actions = task.actions || [];
    const action = actions.find((a: any) => a.id === actionId || a.output === actionId) || {
      id: actionId,
      output: actionId,
      label: actionId,
    };

    const currentAttempt = (task.attempt_count || 0) + 1;
    const maxAttempts = task.max_attempts || 3;
    const shouldRetry = action.output === "no_answer" && currentAttempt < maxAttempts;

    let finalStatus = "completed";

    if (shouldRetry) {
      // 2. Schedule retry
      const retryDelayMs = 3600000; 
      const nextAttemptAt = new Date(Date.now() + retryDelayMs).toISOString();

      await supabase
        .from("workflow_call_tasks")
        .update({
          status: "retry_scheduled",
          attempt_count: currentAttempt,
          next_attempt_at: nextAttemptAt,
          observation: notes || task.observation,
          assigned_operator_id: operatorId || task.assigned_operator_id,
          updated_at: new Date().toISOString()
        })
        .eq("id", taskId);

      await supabase.from("call_logs").insert({
        company_id: task.company_id,
        user_id: task.user_id,
        lead_id: task.lead_id,
        operator_id: operatorId || null,
        call_status: "no_answer",
        attempt_number: currentAttempt,
        max_attempts: maxAttempts,
        notes: notes || null,
        scheduled_for: nextAttemptAt,
        action_id: null,
        started_at: task.created_at || new Date().toISOString(),
        ended_at: new Date().toISOString(),
        external_call_id: task.external_call_id || null,
      });

      return new Response(
        JSON.stringify({ success: true, status: "retry_scheduled", nextAttemptAt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // 3. Update call task status
      finalStatus = action.output === "no_answer" && currentAttempt >= maxAttempts
        ? "attempts_exhausted"
        : (keepCallActive ? "in_progress" : "completed");

      const updateData: Record<string, any> = {
        status: finalStatus,
        attempt_count: currentAttempt,
        observation: notes || task.observation,
        assigned_operator_id: operatorId || task.assigned_operator_id,
        updated_at: new Date().toISOString()
      };

      if (!keepCallActive) {
        updateData.completed_at = new Date().toISOString();
      }

      await supabase
        .from("workflow_call_tasks")
        .update(updateData)
        .eq("id", taskId);

      // Create a call log entry for history if finishing or recording
      if (!keepCallActive) {
        await supabase.from("call_logs").insert({
          company_id: task.company_id,
          user_id: task.user_id,
          lead_id: task.lead_id,
          operator_id: operatorId || null,
          call_status: action.output === "success" || action.id === "success" ? "completed" : "failed",
          attempt_number: currentAttempt,
          max_attempts: maxAttempts,
          notes: notes || null,
          action_id: null,
          started_at: task.created_at || new Date().toISOString(),
          ended_at: new Date().toISOString(),
          external_call_id: task.external_call_id || null,
        });
      }

      // 4. Retrieve execution context from workflow_executions (or fallback to sequence_executions)
      let executionPayload: any = {};
      let effectiveCampaignId = task.workflow_id;

      if (task.workflow_execution_id) {
        const { data: wfExec } = await supabase
          .from("workflow_executions")
          .select("campaign_id, trigger_payload")
          .eq("id", task.workflow_execution_id)
          .maybeSingle();

        if (wfExec) {
          executionPayload = wfExec.trigger_payload || {};
          if (wfExec.campaign_id) {
            effectiveCampaignId = wfExec.campaign_id;
          }
        }
      }

      if (!executionPayload.respondentPhone) {
        const { data: seqExec } = await supabase
          .from("sequence_executions")
          .select("trigger_context")
          .eq("sequence_id", task.workflow_id)
          .maybeSingle();
        if (seqExec?.trigger_context) {
          executionPayload = { ...seqExec.trigger_context, ...executionPayload };
        }
      }

      // Ensure effective startFromNodeId matches an active node in sequence_nodes
      let effectiveNodeId = task.node_id;
      const { data: activeNodes } = await supabase
        .from("sequence_nodes")
        .select("id, node_type")
        .eq("sequence_id", task.workflow_id);

      if (activeNodes && activeNodes.length > 0) {
        const nodeExists = activeNodes.some((n: any) => n.id === effectiveNodeId);
        if (!nodeExists) {
          const phoneNode = activeNodes.find((n: any) => n.node_type === "phone_call");
          if (phoneNode) effectiveNodeId = phoneNode.id;
        }
      }

      const respondentPhone = task.phone || executionPayload.respondentPhone || executionPayload.contactPhone || "";
      const respondentJid = respondentPhone ? `${respondentPhone}@s.whatsapp.net` : executionPayload.respondentJid || "";

      const mergedContext = {
        ...executionPayload,
        callResult: action.id || action.output,
        actionId: action.id,
        actionOutput: action.output,
        leadId: task.lead_id || executionPayload.leadId,
        companyId: task.company_id || executionPayload.companyId,
        respondentPhone,
        respondentJid,
        sendPrivate: true,
      };

      const executePayload = {
        campaignId: effectiveCampaignId,
        sequenceId: task.workflow_id,
        executionId: task.workflow_execution_id,
        startFromNodeId: effectiveNodeId,
        triggerContext: mergedContext,
      };

      console.log(`[ResolveCallTask] Resuming workflow with payload:`, JSON.stringify(executePayload));

      const executeUrl = `${supabaseUrl}/functions/v1/execute-message`;
      const executeResponse = await fetch(executeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify(executePayload)
      });

      const responseText = await executeResponse.text();
      console.log(`[ResolveCallTask] Workflow resumption result (${executeResponse.status}):`, responseText);

      return new Response(
        JSON.stringify({
          success: true,
          status: finalStatus,
          workflowResumed: executeResponse.ok,
          details: responseText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("[ResolveCallTask] Uncaught error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
