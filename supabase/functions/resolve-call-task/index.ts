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

    const { taskId, actionId, notes, operatorId } = await req.json();

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
    const action = actions.find((a: any) => a.id === actionId);
    if (!action) {
      return new Response(
        JSON.stringify({ error: `Action ${actionId} not found in task actions` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentAttempt = (task.attempt_count || 0) + 1;
    const maxAttempts = task.max_attempts || 3;
    const shouldRetry = action.output === "no_answer" && currentAttempt < maxAttempts;

    if (shouldRetry) {
      // 2. Schedule retry
      // Let's assume a default retry delay of 1 hour if not specified, or parse from config
      // Wait, attempts configuration is stored in node configuration or we can use a default delay.
      // Let's check sequence node config if we want, or just default to 1 hour (3600000ms).
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

      // Create a historical log entry if needed
      await supabase.from("call_logs").insert({
        company_id: task.company_id,
        lead_id: task.lead_id,
        operator_id: operatorId || null,
        call_status: "no_answer",
        attempt_number: currentAttempt,
        max_attempts: maxAttempts,
        notes: notes || null,
        scheduled_for: nextAttemptAt,
        action_id: null,
      });

      return new Response(
        JSON.stringify({ success: true, status: "retry_scheduled", nextAttemptAt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // 3. Finalize call task (completed or attempts_exhausted)
      const finalStatus = action.output === "no_answer" && currentAttempt >= maxAttempts
        ? "attempts_exhausted"
        : "completed";

      await supabase
        .from("workflow_call_tasks")
        .update({
          status: finalStatus,
          attempt_count: currentAttempt,
          observation: notes || task.observation,
          assigned_operator_id: operatorId || task.assigned_operator_id,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", taskId);

      // Create a call log entry for history
      await supabase.from("call_logs").insert({
        company_id: task.company_id,
        lead_id: task.lead_id,
        operator_id: operatorId || null,
        call_status: action.output === "success" ? "completed" : "failed",
        attempt_number: currentAttempt,
        max_attempts: maxAttempts,
        notes: notes || null,
        action_id: null,
      });

      // 4. Resume parent workflow
      const { data: seqExec } = await supabase
        .from("sequence_executions")
        .select("trigger_context")
        .eq("sequence_id", task.workflow_id)
        .maybeSingle();

      const mergedContext = {
        ...(seqExec?.trigger_context || {}),
        callResult: finalStatus === "attempts_exhausted" ? "attempts_exhausted" : action.output,
        leadId: task.lead_id,
        companyId: task.company_id,
      };

      const executePayload = {
        campaignId: task.workflow_id,
        sequenceId: task.workflow_id,
        executionId: task.workflow_execution_id,
        startFromNodeId: task.node_id,
        triggerContext: mergedContext,
      };

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
      console.log(`[ResolveCallTask] Workflow resumption result:`, responseText);

      return new Response(
        JSON.stringify({ success: true, status: finalStatus, workflowResumed: executeResponse.ok }),
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
