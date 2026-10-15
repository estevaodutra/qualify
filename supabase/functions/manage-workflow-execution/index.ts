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
      const trigCtx = (activeExec.trigger_context || activeExec.trigger_payload || {}) as Record<string, any>;
      const isDispatch = trigCtx?.campaignType === "dispatch";
      const respondentPhone = trigCtx.respondentPhone || trigCtx.contactPhone || trigCtx.phone || "";

      // 1. Mark as running
      if (seqExec) {
        await supabase
          .from("sequence_executions")
          .update({
            status: "running",
            trigger_context: {
              ...trigCtx,
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
              ...trigCtx,
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
            contactPhone: respondentPhone,
            contactName: trigCtx.contactName || trigCtx.respondentName || "",
            contactId: trigCtx.contactId || trigCtx.leadId || undefined,
            customFields: trigCtx.customFields || {},
            executionId: activeExec.id,
            startFromStepIndex: activeExec.current_node_index ?? 0,
          }
        : {
            campaignId: activeExec.campaign_id || activeExec.sequence_id,
            sequenceId: activeExec.sequence_id,
            messageId: activeExec.message_id ?? null,
            executionId: activeExec.id,
            resumedExecution: true,
            startFromNodeIndex: activeExec.current_node_index ?? 0,
            startFromNodeId: activeExec.current_node_id || trigCtx.resumeNodeId,
            targetPhones: respondentPhone ? [respondentPhone] : [],
            triggerContext: {
              ...trigCtx,
              isResumedExecution: true,
              resumedExecution: true,
              manually_paused: false,
              sendPrivate: !trigCtx.groupJid || trigCtx.destinationMode !== "groups",
            },
          };

      try {
        const resumeRes = await fetch(fetchUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(fetchBody),
        });
        const resumeResText = await resumeRes.text();
        console.log(`[ManageWorkflowExecution] Resume worker response (${resumeRes.status}):`, resumeResText);
      } catch (fetchErr) {
        console.error("[ManageWorkflowExecution] Error triggering resume worker:", fetchErr);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Execução retomada com sucesso.", status: "running" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "skip" || action === "advance") {
      const activeExec = seqExec || wfExec;
      const trigCtx = (activeExec.trigger_context || activeExec.trigger_payload || {}) as Record<string, any>;
      const isDispatch = trigCtx?.campaignType === "dispatch";
      const respondentPhone = trigCtx.respondentPhone || trigCtx.contactPhone || trigCtx.phone || "";
      const currentWaitingNodeId = trigCtx.waitingNodeId || activeExec.current_node_id;

      // 1. Determine next node (targetNodeId)
      let targetNodeId: string | null = trigCtx.resumeNodeId || null;

      // If we don't have resumeNodeId, or if it's a delay node, query sequence_connections
      if (!targetNodeId || trigCtx.waitingType === "delay") {
        const fromNodeId = (trigCtx.waitingType === "delay" && trigCtx.delayNodeId)
          ? trigCtx.delayNodeId
          : (currentWaitingNodeId || targetNodeId);

        if (fromNodeId) {
          const { data: conns } = await supabase
            .from("sequence_connections")
            .select("target_node_id, condition_path")
            .eq("sequence_id", activeExec.sequence_id)
            .eq("source_node_id", fromNodeId);

          const successConn = (conns || []).find((c: any) =>
            c.condition_path !== "timeout" && c.condition_path !== "error"
          ) || (conns || [])[0];

          if (successConn?.target_node_id) {
            targetNodeId = successConn.target_node_id;
          }
        }
      }

      // Fallback: check next node by order in sequence_nodes
      if (!targetNodeId && currentWaitingNodeId) {
        const { data: nodes } = await supabase
          .from("sequence_nodes")
          .select("id, node_order")
          .eq("sequence_id", activeExec.sequence_id)
          .order("node_order", { ascending: true });

        if (nodes && nodes.length > 0) {
          const currIdx = nodes.findIndex((n: any) => n.id === currentWaitingNodeId);
          if (currIdx >= 0 && currIdx + 1 < nodes.length) {
            targetNodeId = nodes[currIdx + 1].id;
          }
        }
      }

      console.log(`[ManageWorkflowExecution] Skipping execution ${executionId} from node ${currentWaitingNodeId} to node ${targetNodeId}`);

      // 2. Mark any pending user inputs waiting for this execution as skipped
      await supabase
        .from("workflow_user_inputs")
        .update({
          status: "skipped",
          response_text: "Avançado manualmente pelo operador",
          answered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("execution_id", executionId)
        .in("status", ["waiting", "pending"]);

      // 3. Mark sequence_executions & workflow_executions as running
      const now = new Date().toISOString();
      if (seqExec) {
        await supabase
          .from("sequence_executions")
          .update({
            status: "running",
            current_node_id: targetNodeId,
            resume_at: null,
            trigger_context: {
              ...trigCtx,
              manually_paused: false,
              skippedNodeId: currentWaitingNodeId,
              resumeNodeId: targetNodeId,
            },
            updated_at: now,
          })
          .eq("id", executionId);
      }

      if (wfExec) {
        await supabase
          .from("workflow_executions")
          .update({
            status: "running",
            trigger_payload: {
              ...trigCtx,
              manually_paused: false,
              skippedNodeId: currentWaitingNodeId,
              resumeNodeId: targetNodeId,
            },
            updated_at: now,
          })
          .eq("id", executionId);
      }

      // 4. Call execute function to resume workflow processing from targetNodeId immediately
      const fetchUrl = isDispatch
        ? `${supabaseUrl}/functions/v1/execute-dispatch-sequence`
        : `${supabaseUrl}/functions/v1/execute-message`;

      const fetchBody = isDispatch
        ? {
            campaignId: activeExec.campaign_id,
            sequenceId: activeExec.sequence_id,
            contactPhone: respondentPhone,
            contactName: trigCtx.contactName || trigCtx.respondentName || "",
            contactId: trigCtx.contactId || trigCtx.leadId || undefined,
            customFields: trigCtx.customFields || {},
            executionId: activeExec.id,
            startFromNodeId: targetNodeId,
          }
        : {
            campaignId: activeExec.campaign_id || activeExec.sequence_id,
            sequenceId: activeExec.sequence_id,
            executionId: activeExec.id,
            startFromNodeId: targetNodeId,
            resumedExecution: true,
            targetPhones: respondentPhone ? [respondentPhone] : [],
            triggerContext: {
              ...trigCtx,
              isResumedExecution: true,
              resumedExecution: true,
              manually_paused: false,
              sendPrivate: !trigCtx.groupJid || trigCtx.destinationMode !== "groups",
              respondentPhone,
              manualSkip: true,
              startFromNodeId: targetNodeId,
            },
          };

      try {
        const skipRes = await fetch(fetchUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(fetchBody),
        });
        const skipResText = await skipRes.text();
        console.log(`[ManageWorkflowExecution] Skip worker response (${skipRes.status}):`, skipResText);
      } catch (fetchErr) {
        console.error("[ManageWorkflowExecution] Error triggering skip worker:", fetchErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Execução avançada para a próxima etapa com sucesso.",
          status: "running",
          targetNodeId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Ação '${action}' não reconhecida. Suportadas: 'pause', 'stop', 'resume', 'skip', 'advance'.` }),
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
