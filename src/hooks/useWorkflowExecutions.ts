import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type WorkflowExecutionStatus = "running" | "success" | "error" | "waiting" | "cancelled";
export type WorkflowNodeExecutionStatus = "success" | "error" | "running" | "not_executed";

export interface WorkflowExecution {
  id: string;
  sequenceId: string;
  sequenceType: "message" | "dispatch";
  campaignId: string;
  status: WorkflowExecutionStatus;
  triggerType: string | null;
  triggerPayload: Record<string, unknown> | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
}

export interface WorkflowNodeExecution {
  id: string;
  executionId: string;
  nodeId: string;
  nodeType: string;
  status: WorkflowNodeExecutionStatus;
  input: unknown;
  output: unknown;
  logs: unknown;
  error: unknown;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
}

interface RawExecutionRecord {
  id: string;
  sequence_id: string;
  sequence_type: "message" | "dispatch";
  campaign_id: string;
  status: WorkflowExecutionStatus;
  trigger_type: string | null;
  trigger_payload: Record<string, unknown> | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

interface RawNodeExecutionRecord {
  id: string;
  execution_id: string;
  node_id: string;
  node_type: string;
  status: WorkflowNodeExecutionStatus;
  input: unknown;
  output: unknown;
  logs: unknown;
  error: unknown;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
}

const mapExecution = (row: RawExecutionRecord): WorkflowExecution => ({
  id: row.id,
  sequenceId: row.sequence_id,
  sequenceType: row.sequence_type,
  campaignId: row.campaign_id,
  status: row.status,
  triggerType: row.trigger_type,
  triggerPayload: row.trigger_payload,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  durationMs: row.duration_ms,
  errorMessage: row.error_message,
});

const mapNodeExecution = (row: RawNodeExecutionRecord): WorkflowNodeExecution => ({
  id: row.id,
  executionId: row.execution_id,
  nodeId: row.node_id,
  nodeType: row.node_type,
  status: row.status,
  input: row.input,
  output: row.output,
  logs: row.logs,
  error: row.error,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  durationMs: row.duration_ms,
});

// List of past runs for a sequence — feeds the "Execuções" sidebar list.
export function useWorkflowExecutions(sequenceId: string | undefined, statusFilter?: WorkflowExecutionStatus) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["workflow-executions", sequenceId, statusFilter],
    queryFn: async () => {
      if (!sequenceId) return [];

      let queryBuilder = supabase
        .from("workflow_executions" as any)
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("started_at", { ascending: false })
        .limit(200);

      if (statusFilter) {
        queryBuilder = queryBuilder.eq("status", statusFilter);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;
      return ((data || []) as unknown as RawExecutionRecord[]).map(mapExecution);
    },
    enabled: !!user && !!sequenceId,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!user || !sequenceId) return;
    const channel = supabase
      .channel(`workflow-executions-${sequenceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_executions", filter: `sequence_id=eq.${sequenceId}` },
        () => queryClient.invalidateQueries({ queryKey: ["workflow-executions", sequenceId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, sequenceId, queryClient]);

  return {
    executions: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// A single run plus every node visited during it — feeds the read-only
// canvas coloring and the node inspector.
export function useWorkflowExecutionDetail(executionId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["workflow-execution-detail", executionId],
    queryFn: async () => {
      if (!executionId) return null;

      const [{ data: execRow, error: execError }, { data: nodeRows, error: nodeError }] = await Promise.all([
        supabase.from("workflow_executions" as any).select("*").eq("id", executionId).maybeSingle(),
        supabase.from("workflow_node_executions" as any).select("*").eq("execution_id", executionId).order("started_at", { ascending: true }),
      ]);

      if (execError) throw execError;
      if (nodeError) throw nodeError;
      if (!execRow) return null;

      return {
        execution: mapExecution(execRow as unknown as RawExecutionRecord),
        nodeExecutions: ((nodeRows || []) as unknown as RawNodeExecutionRecord[]).map(mapNodeExecution),
      };
    },
    enabled: !!user && !!executionId,
    refetchInterval: (q) => {
      const status = q.state.data?.execution.status;
      return status === "running" || status === "waiting" ? 4000 : false;
    },
  });

  useEffect(() => {
    if (!user || !executionId) return;
    const channel = supabase
      .channel(`workflow-execution-detail-${executionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_node_executions", filter: `execution_id=eq.${executionId}` },
        () => queryClient.invalidateQueries({ queryKey: ["workflow-execution-detail", executionId] })
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "workflow_executions", filter: `id=eq.${executionId}` },
        () => queryClient.invalidateQueries({ queryKey: ["workflow-execution-detail", executionId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, executionId, queryClient]);

  return {
    execution: query.data?.execution ?? null,
    nodeExecutions: query.data?.nodeExecutions ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
