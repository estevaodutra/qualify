// Workflow execution history (observability, never fatal). Records one row
// per node visited during a sequence run so the "Execuções" tab can show a
// real per-run, per-node replay. Shared between execute-message and
// execute-dispatch-sequence — failures here are logged and swallowed, this
// must never affect message delivery.

export async function logNodeExecution(
  supabase: any,
  params: {
    executionId: string;
    userId: string;
    nodeId: string;
    nodeType: string;
    status: "success" | "error" | "running" | "not_executed";
    startedAt: Date;
    input?: unknown;
    output?: unknown;
    error?: unknown;
  }
): Promise<void> {
  try {
    const finishedAt = new Date();
    await supabase.from("workflow_node_executions").insert({
      execution_id: params.executionId,
      user_id: params.userId,
      node_id: params.nodeId,
      node_type: params.nodeType,
      status: params.status,
      input: params.input ?? null,
      output: params.output ?? null,
      error: params.error ?? null,
      started_at: params.startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - params.startedAt.getTime(),
    });
  } catch (err) {
    console.error("[WorkflowExecutionLog] logNodeExecution failed (non-fatal):", err);
  }
}
