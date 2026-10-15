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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, executionId } = body;

    if (!action || !executionId) {
      return new Response(
        JSON.stringify({ error: "Parâmetros 'action' e 'executionId' são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ManageWorkflowExecution] Action: ${action} on Execution: ${executionId}`);

    // Fetch existing records from sequence_executions and workflow_executions
    const [{ data: seqExec }, { data: wfExec }] = await Promise.all([
      supabase.from("sequence_executions").select("*").eq("id", executionId).maybeSingle(),
      supabase.from("workflow_executions").select("*").eq("id", executionId).maybeSingle(),
    ]);

    if (!seqExec && !wfExec) {
      return new Response(
        JSON.stringify({ error: `Execução ${executionId} não encontrada.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "pause") {
      // 1. Update sequence_executions if present
      if (seqExec) {
        await supabase
          .from("sequence_executions")
          .update({
            status: "paused",
            trigger_context: {
              ...(seqExec.trigger_context || {}),
              manually_paused: true,
              original_resume_at: seqExec.resume_at || null,
            },
            resume_at: null, // Clear resume_at so scheduler cron doesn't auto-resume while paused
            updated_at: new Date().toISOString(),
          })
          .eq("id", executionId);
      }

      // 2. Update workflow_executions
      if (wfExec) {
        await supabase
          .from("workflow_executions")
          .update({
            status: "waiting",
            trigger_payload: {
              ...(wfExec.trigger_payload || {}),
              manually_paused: true,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", executionId);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Execução pausada com sucesso.", status: "paused" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "stop" || action === "cancel") {
      const cancelReason = body.reason || "Execução interrompida pelo usuário";
      const now = new Date().toISOString();

      // 1. Cancel sequence_executions
      if (seqExec) {
        await supabase
          .from("sequence_executions")
          .update({
            status: "cancelled",
            error_message: cancelReason,
            updated_at: now,
          })
          .eq("id", executionId);
      }

      // 2. Cancel workflow_executions
      if (wfExec) {
        const startedAtMs = wfExec.started_at ? new Date(wfExec.started_at).getTime() : null;
        const durationMs = startedAtMs ? Date.now() - startedAtMs : null;

        await supabase
          .from("workflow_executions")
          .update({
            status: "cancelled",
            finished_at: now,
            duration_ms: durationMs,
            error_message: cancelReason,
            updated_at: now,
          })
          .eq("id", executionId);
      }

      // 3. Cancel any pending user inputs waiting for this execution
      await supabase
        .from("workflow_user_inputs")
        .update({ status: "cancelled" })
        .eq("execution_id", executionId);

      return new Response(
        JSON.stringify({ success: true, message: "Execução cancelada com sucesso.", status: "cancelled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "resume") {
      const activeExec = seqExec || wfExec;
      const isDispatch = (activeExec.trigger_context || activeExec.trigger_payload)?.campaignType === "dispatch";

      // 1. Mark as running
      if (seqExec) {
        await supabase
          .from("sequence_executions")
          .update({
            status: "running",
            trigger_context: {
              ...(seqExec.trigger_context || {}),
              manually_paused: false,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", executionId);
      }

      if (wfExec) {
        await supabase
          .from("workflow_executions")
          .update({
            status: "running",
            trigger_payload: {
              ...(wfExec.trigger_payload || {}),
              manually_paused: false,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", executionId);
      }

      // 2. Call execute function to resume workflow processing immediately
      const fetchUrl = isDispatch
        ? `${supabaseUrl}/functions/v1/execute-dispatch-sequence`
        : `${supabaseUrl}/functions/v1/execute-message`;

      const fetchBody = isDispatch
        ? {
            campaignId: activeExec.campaign_id,
            sequenceId: activeExec.sequence_id,
            contactPhone: (activeExec.trigger_context || activeExec.trigger_payload)?.contactPhone || "",
            contactName: (activeExec.trigger_context || activeExec.trigger_payload)?.contactName || "",
            contactId: (activeExec.trigger_context || activeExec.trigger_payload)?.contactId || undefined,
            customFields: (activeExec.trigger_context || activeExec.trigger_payload)?.customFields || {},
            executionId: activeExec.id,
            startFromStepIndex: activeExec.current_node_index ?? 0,
          }
        : {
            campaignId: activeExec.campaign_id,
            sequenceId: activeExec.sequence_id,
            messageId: activeExec.message_id ?? null,
            triggerContext: {
              ...(activeExec.trigger_context || activeExec.trigger_payload || {}),
              isResumedExecution: true,
              manually_paused: false,
            },
            executionId: activeExec.id,
            startFromNodeIndex: activeExec.current_node_index ?? 0,
            startFromNodeId: activeExec.current_node_id || (activeExec.trigger_context || activeExec.trigger_payload)?.resumeNodeId,
          };

      fetch(fetchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(fetchBody),
      }).catch((fetchErr) => {
        console.error("[ManageWorkflowExecution] Error triggering resume worker:", fetchErr);
      });

      return new Response(
        JSON.stringify({ success: true, message: "Execução retomada com sucesso.", status: "running" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Ação '${action}' não reconhecida. Suportadas: 'pause', 'stop', 'resume'.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[ManageWorkflowExecution] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno ao gerenciar execução" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
