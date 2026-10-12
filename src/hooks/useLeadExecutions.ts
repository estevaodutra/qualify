import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ExecutionDisplayStatus = "running" | "waiting" | "paused" | "completed" | "cancelled" | "error";

export interface LeadExecutionItem {
  id: string;
  sequenceId: string;
  sequenceName: string;
  sequenceType: "message" | "dispatch";
  campaignId: string;
  status: ExecutionDisplayStatus;
  isManuallyPaused: boolean;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  currentNodeId: string | null;
  currentNodeName: string | null;
  resumeAt: string | null;
  errorMessage: string | null;
  triggerType: string | null;
  triggerPayload: Record<string, any> | null;
}

interface UseLeadExecutionsOptions {
  leadId?: string;
  leadPhone?: string;
}

export function useLeadExecutions({ leadId, leadPhone }: UseLeadExecutionsOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const cleanPhone = useMemo(() => {
    if (!leadPhone) return "";
    return leadPhone.replace(/\D/g, "");
  }, [leadPhone]);

  const queryKey = useMemo(() => ["lead-executions", leadId, cleanPhone], [leadId, cleanPhone]);

  const { data: executions = [], isLoading, error, refetch } = useQuery<LeadExecutionItem[]>({
    queryKey,
    queryFn: async () => {
      if (!leadId && !cleanPhone) return [];

      // 1. Fetch from workflow_executions (historical and running)
      let wfQuery = supabase
        .from("workflow_executions" as any)
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);

      // Note: jsonb filtering in PostgREST
      if (leadId) {
        wfQuery = wfQuery.or(`trigger_payload->>leadId.eq.${leadId},trigger_payload->>contactId.eq.${leadId}`);
      } else if (cleanPhone) {
        wfQuery = wfQuery.or(`trigger_payload->>respondentPhone.ilike.%${cleanPhone}%,trigger_payload->>contactPhone.ilike.%${cleanPhone}%`);
      }

      // 2. Fetch from sequence_executions (active, paused, pending delays)
      let seqQuery = supabase
        .from("sequence_executions" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (leadId) {
        seqQuery = seqQuery.or(`trigger_context->>leadId.eq.${leadId},trigger_context->>contactId.eq.${leadId}`);
      } else if (cleanPhone) {
        seqQuery = seqQuery.or(`trigger_context->>respondentPhone.ilike.%${cleanPhone}%,trigger_context->>contactPhone.ilike.%${cleanPhone}%`);
      }

      const [{ data: wfData, error: wfErr }, { data: seqData, error: seqErr }] = await Promise.all([
        wfQuery,
        seqQuery,
      ]);

      if (wfErr && !wfData) console.warn("[useLeadExecutions] workflow_executions error:", wfErr);
      if (seqErr && !seqData) console.warn("[useLeadExecutions] sequence_executions error:", seqErr);

      const rawWf: any[] = wfData || [];
      const rawSeq: any[] = seqData || [];

      // 3. Collect sequence IDs to resolve workflow names
      const sequenceIds = Array.from(
        new Set([
          ...rawWf.map((r) => r.sequence_id).filter(Boolean),
          ...rawSeq.map((r) => r.sequence_id).filter(Boolean),
        ])
      );

      const sequenceNamesMap: Record<string, string> = {};
      const sequenceNodesMap: Record<string, Record<string, string>> = {};

      if (sequenceIds.length > 0) {
        const [{ data: seqRows }, { data: dispatchRows }] = await Promise.all([
          supabase.from("message_sequences").select("id, name, sequence_nodes(id, name, title, node_type)").in("id", sequenceIds),
          supabase.from("dispatch_sequences").select("id, name").in("id", sequenceIds),
        ]);

        if (seqRows) {
          for (const s of seqRows as any[]) {
            sequenceNamesMap[s.id] = s.name;
            if (s.sequence_nodes && Array.isArray(s.sequence_nodes)) {
              sequenceNodesMap[s.id] = {};
              for (const n of s.sequence_nodes) {
                sequenceNodesMap[s.id][n.id] = n.title || n.name || n.node_type || "Etapa";
              }
            }
          }
        }

        if (dispatchRows) {
          for (const d of dispatchRows as any[]) {
            sequenceNamesMap[d.id] = d.name;
          }
        }
      }

      // 4. Merge records by execution id
      const itemsMap = new Map<string, LeadExecutionItem>();

      // Index sequence_executions first (authoritative for in-progress & pause state)
      for (const seq of rawSeq) {
        const isManuallyPaused = !!seq.trigger_context?.manually_paused;
        let mappedStatus: ExecutionDisplayStatus = "running";
        if (seq.status === "paused") {
          mappedStatus = isManuallyPaused ? "paused" : "waiting";
        } else if (seq.status === "running") {
          mappedStatus = "running";
        } else if (seq.status === "completed") {
          mappedStatus = "completed";
        } else if (seq.status === "failed") {
          mappedStatus = "error";
        } else if (seq.status === "cancelled") {
          mappedStatus = "cancelled";
        }

        const nodeName = seq.current_node_id && sequenceNodesMap[seq.sequence_id]?.[seq.current_node_id]
          ? sequenceNodesMap[seq.sequence_id][seq.current_node_id]
          : null;

        itemsMap.set(seq.id, {
          id: seq.id,
          sequenceId: seq.sequence_id,
          sequenceName: sequenceNamesMap[seq.sequence_id] || "Workflow sem nome",
          sequenceType: seq.trigger_context?.campaignType === "dispatch" ? "dispatch" : "message",
          campaignId: seq.campaign_id,
          status: mappedStatus,
          isManuallyPaused,
          startedAt: seq.created_at,
          finishedAt: null,
          durationMs: null,
          currentNodeId: seq.current_node_id || null,
          currentNodeName: nodeName,
          resumeAt: seq.resume_at || null,
          errorMessage: seq.error_message || null,
          triggerType: (seq.trigger_context?.triggerType as string) || "manual",
          triggerPayload: seq.trigger_context || null,
        });
      }

      // Merge / append workflow_executions
      for (const wf of rawWf) {
        const isManuallyPaused = !!wf.trigger_payload?.manually_paused;
        let mappedStatus: ExecutionDisplayStatus = "running";
        if (wf.status === "success") mappedStatus = "completed";
        else if (wf.status === "error") mappedStatus = "error";
        else if (wf.status === "cancelled") mappedStatus = "cancelled";
        else if (wf.status === "waiting") mappedStatus = isManuallyPaused ? "paused" : "waiting";
        else if (wf.status === "running") mappedStatus = "running";

        const existing = itemsMap.get(wf.id);
        if (existing) {
          // Enrich existing active execution with duration/history if finished
          if (wf.finished_at) existing.finishedAt = wf.finished_at;
          if (wf.duration_ms) existing.durationMs = wf.duration_ms;
          if (wf.error_message) existing.errorMessage = wf.error_message;
          if (wf.status === "cancelled" || wf.status === "error" || wf.status === "success") {
            existing.status = mappedStatus;
          }
        } else {
          itemsMap.set(wf.id, {
            id: wf.id,
            sequenceId: wf.sequence_id,
            sequenceName: sequenceNamesMap[wf.sequence_id] || "Workflow sem nome",
            sequenceType: wf.sequence_type || "message",
            campaignId: wf.campaign_id,
            status: mappedStatus,
            isManuallyPaused,
            startedAt: wf.started_at,
            finishedAt: wf.finished_at,
            durationMs: wf.duration_ms,
            currentNodeId: null,
            currentNodeName: null,
            resumeAt: null,
            errorMessage: wf.error_message,
            triggerType: wf.trigger_type,
            triggerPayload: wf.trigger_payload,
          });
        }
      }

      // Sort: active/paused first, then newest started_at
      return Array.from(itemsMap.values()).sort((a, b) => {
        const isAActive = a.status === "running" || a.status === "waiting" || a.status === "paused";
        const isBActive = b.status === "running" || b.status === "waiting" || b.status === "paused";
        if (isAActive && !isBActive) return -1;
        if (!isAActive && isBActive) return 1;
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });
    },
    enabled: !!(leadId || cleanPhone),
    refetchInterval: 5000,
  });

  // Realtime subscription for execution updates
  useEffect(() => {
    if (!user || (!leadId && !cleanPhone)) return;

    const uniqueChannelId = `lead-exec:${leadId || cleanPhone}:${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(uniqueChannelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sequence_executions" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_executions" },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, leadId, cleanPhone, queryClient, queryKey]);

  // Pause execution mutation
  const pauseMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-workflow-execution", {
        body: { action: "pause", executionId },
      });
      if (error) {
        // Fallback: direct table updates
        await Promise.all([
          supabase.from("sequence_executions").update({ status: "paused" }).eq("id", executionId),
          supabase.from("workflow_executions").update({ status: "waiting" }).eq("id", executionId),
        ]);
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Execução pausada.");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      toast.error(`Erro ao pausar execução: ${err.message || err}`);
    },
  });

  // Stop / Cancel execution mutation
  const stopMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-workflow-execution", {
        body: { action: "stop", executionId },
      });
      if (error) {
        // Fallback: direct table updates
        await Promise.all([
          supabase.from("sequence_executions").update({ status: "cancelled", error_message: "Cancelado pelo operador" }).eq("id", executionId),
          supabase.from("workflow_executions").update({ status: "cancelled", finished_at: new Date().toISOString() }).eq("id", executionId),
        ]);
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Execução cancelada.");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      toast.error(`Erro ao cancelar execução: ${err.message || err}`);
    },
  });

  // Resume execution mutation
  const resumeMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-workflow-execution", {
        body: { action: "resume", executionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Execução retomada!");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      toast.error(`Erro ao retomar execução: ${err.message || err}`);
    },
  });

  // Filtered lists
  const activeExecutions = useMemo(() => {
    return executions.filter(
      (e) => e.status === "running" || e.status === "waiting" || e.status === "paused"
    );
  }, [executions]);

  const historyExecutions = useMemo(() => {
    return executions.filter(
      (e) => e.status === "completed" || e.status === "cancelled" || e.status === "error"
    );
  }, [executions]);

  const activeCount = activeExecutions.length;

  return {
    executions,
    activeExecutions,
    historyExecutions,
    activeCount,
    isLoading,
    error,
    refetch,
    pauseExecution: pauseMutation.mutate,
    isPausing: pauseMutation.isPending,
    stopExecution: stopMutation.mutate,
    isStopping: stopMutation.isPending,
    resumeExecution: resumeMutation.mutate,
    isResuming: resumeMutation.isPending,
  };
}
