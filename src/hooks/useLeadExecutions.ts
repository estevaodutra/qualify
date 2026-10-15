import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ExecutionDisplayStatus =
  | "running"
  | "waiting_delay"
  | "waiting_user_input"
  | "waiting"
  | "paused"
  | "completed"
  | "cancelled"
  | "error";

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
  waitingType?: "delay" | "user_input" | "poll" | "ura" | "call" | null;
  delayFormatted?: string | null;
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

      // 3. Collect sequence and campaign IDs to resolve workflow names
      const sequenceIds = Array.from(
        new Set([
          ...rawWf.map((r) => r.sequence_id).filter(Boolean),
          ...rawSeq.map((r) => r.sequence_id).filter(Boolean),
          ...rawWf.map((r) => r.campaign_id).filter(Boolean),
          ...rawSeq.map((r) => r.campaign_id).filter(Boolean),
        ])
      );

      const sequenceNamesMap: Record<string, string> = {};
      const sequenceNodesMap: Record<string, Record<string, string>> = {};

      if (sequenceIds.length > 0) {
        const [{ data: defRows }, { data: seqRows }, { data: dispatchRows }, { data: campRows }] = await Promise.all([
          supabase.from("workflow_definitions" as any).select("id, name, source_id"),
          supabase.from("message_sequences").select("id, name, sequence_nodes(id, name, title, node_type, config)").in("id", sequenceIds),
          supabase.from("dispatch_sequences").select("id, name").in("id", sequenceIds),
          supabase.from("group_campaigns").select("id, name").in("id", sequenceIds),
        ]);

        if (defRows) {
          for (const d of defRows as any[]) {
            if (d.name) {
              if (d.id) sequenceNamesMap[d.id] = d.name;
              if (d.source_id) sequenceNamesMap[d.source_id] = d.name;
            }
          }
        }

        if (seqRows) {
          for (const s of seqRows as any[]) {
            if (s.name && !sequenceNamesMap[s.id]) {
              sequenceNamesMap[s.id] = s.name;
            }
            if (s.sequence_nodes && Array.isArray(s.sequence_nodes)) {
              sequenceNodesMap[s.id] = {};
              for (const n of s.sequence_nodes) {
                sequenceNodesMap[s.id][n.id] = n.title || n.name || n.node_type || "Etapa";
              }
            }
          }
        }

        if (campRows) {
          for (const c of campRows as any[]) {
            if (c.name && !sequenceNamesMap[c.id]) {
              sequenceNamesMap[c.id] = c.name;
            }
          }
        }

        if (dispatchRows) {
          for (const d of dispatchRows as any[]) {
            if (d.name && !sequenceNamesMap[d.id]) {
              sequenceNamesMap[d.id] = d.name;
            }
          }
        }
      }

      // 4. Merge records by execution id
      const itemsMap = new Map<string, LeadExecutionItem>();

      // Index sequence_executions first (authoritative for in-progress & pause state)
      for (const seq of rawSeq) {
        const triggerCtx = (seq.trigger_context || {}) as Record<string, any>;
        const nodesData = Array.isArray(seq.nodes_data) ? seq.nodes_data : [];
        const isManuallyPaused = !!triggerCtx.manually_paused;

        const isDelay = !!seq.resume_at || triggerCtx.waitingType === "delay";
        const isUserInput = triggerCtx.waitingType === "user_input";

        let waitingType: "delay" | "user_input" | "poll" | "ura" | "call" | null = null;
        let delayFormatted: string | null = triggerCtx.delayFormatted || null;
        let stepName = "Aguardando próxima etapa";

        if (isUserInput) {
          waitingType = "user_input";
          stepName = "Aguardando resposta do usuário";
        } else if (isDelay) {
          waitingType = "delay";
          if (!delayFormatted) {
            const delayNode = nodesData.find((n: any) => n.node_type === "delay" || n.type === "delay");
            if (delayNode?.config) {
              const cfg = delayNode.config;
              const dur = cfg.duration ?? cfg.delay_seconds ?? cfg.value ?? 30;
              const unit = cfg.unit === "minutes" || cfg.unit === "m"
                ? "minutos"
                : cfg.unit === "hours" || cfg.unit === "h"
                ? "horas"
                : cfg.unit === "days" || cfg.unit === "d"
                ? "dias"
                : "segundos";
              delayFormatted = `${dur} ${unit}`;
            } else if (seq.resume_at) {
              const diffSecs = Math.max(1, Math.round((new Date(seq.resume_at).getTime() - new Date(seq.updated_at || seq.created_at).getTime()) / 1000));
              if (diffSecs < 90) delayFormatted = `${diffSecs} segundos`;
              else if (diffSecs < 3600) delayFormatted = `${Math.round(diffSecs / 60)} minutos`;
              else delayFormatted = `${Math.round(diffSecs / 3600)} horas`;
            } else {
              delayFormatted = "30 segundos";
            }
          }
          stepName = `Delay ${delayFormatted}`;
        } else if (triggerCtx.waitingType === "poll") {
          waitingType = "poll";
          stepName = "Aguardando voto na enquete";
        } else if (seq.current_node_id && sequenceNodesMap[seq.sequence_id]?.[seq.current_node_id]) {
          stepName = sequenceNodesMap[seq.sequence_id][seq.current_node_id];
        }

        let mappedStatus: ExecutionDisplayStatus = "running";
        if (seq.status === "paused") {
          if (isManuallyPaused) {
            mappedStatus = "paused";
          } else if (isDelay) {
            mappedStatus = "waiting_delay";
          } else if (isUserInput) {
            mappedStatus = "waiting_user_input";
          } else {
            mappedStatus = "waiting";
          }
        } else if (seq.status === "running") {
          if (isDelay) {
            mappedStatus = "waiting_delay";
          } else if (isUserInput) {
            mappedStatus = "waiting_user_input";
          } else {
            mappedStatus = "running";
          }
        } else if (seq.status === "completed") {
          mappedStatus = "completed";
        } else if (seq.status === "failed") {
          mappedStatus = "error";
        } else if (seq.status === "cancelled") {
          mappedStatus = "cancelled";
        }

        const resolvedWorkflowName =
          sequenceNamesMap[seq.sequence_id] ||
          sequenceNamesMap[seq.campaign_id] ||
          triggerCtx.workflowName ||
          triggerCtx.sequenceName ||
          "Workflow de Mensagens";

        itemsMap.set(seq.id, {
          id: seq.id,
          sequenceId: seq.sequence_id,
          sequenceName: resolvedWorkflowName,
          sequenceType: triggerCtx.campaignType === "dispatch" ? "dispatch" : "message",
          campaignId: seq.campaign_id,
          status: mappedStatus,
          isManuallyPaused,
          startedAt: seq.created_at,
          finishedAt: null,
          durationMs: null,
          currentNodeId: seq.current_node_id || null,
          currentNodeName: stepName,
          waitingType,
          delayFormatted,
          resumeAt: seq.resume_at || null,
          errorMessage: seq.error_message || null,
          triggerType: (triggerCtx.triggerType as string) || "manual",
          triggerPayload: triggerCtx,
        });
      }

      // Merge / append workflow_executions
      for (const wf of rawWf) {
        const triggerPayload = (wf.trigger_payload || {}) as Record<string, any>;
        const isManuallyPaused = !!triggerPayload.manually_paused;
        const isWfDelay = !!triggerPayload.resumeAt || triggerPayload.waitingType === "delay";
        const isWfUserInput = triggerPayload.waitingType === "user_input";

        let mappedStatus: ExecutionDisplayStatus = "running";
        if (wf.status === "success") mappedStatus = "completed";
        else if (wf.status === "error") mappedStatus = "error";
        else if (wf.status === "cancelled") mappedStatus = "cancelled";
        else if (wf.status === "waiting") {
          if (isManuallyPaused) mappedStatus = "paused";
          else if (isWfDelay) mappedStatus = "waiting_delay";
          else if (isWfUserInput) mappedStatus = "waiting_user_input";
          else mappedStatus = "waiting";
        } else if (wf.status === "running") {
          if (isWfDelay) mappedStatus = "waiting_delay";
          else if (isWfUserInput) mappedStatus = "waiting_user_input";
          else mappedStatus = "running";
        }

        const existing = itemsMap.get(wf.id);
        if (existing) {
          if (wf.finished_at) existing.finishedAt = wf.finished_at;
          if (wf.duration_ms) existing.durationMs = wf.duration_ms;
          if (wf.error_message) existing.errorMessage = wf.error_message;
          if (wf.status === "cancelled" || wf.status === "error" || wf.status === "success") {
            existing.status = mappedStatus;
          }
          if (existing.sequenceName === "Workflow de Mensagens" || existing.sequenceName === "Workflow sem nome") {
            const betterName = sequenceNamesMap[wf.sequence_id] || sequenceNamesMap[wf.campaign_id] || triggerPayload.workflowName;
            if (betterName) existing.sequenceName = betterName;
          }
        } else {
          const resolvedWorkflowName =
            sequenceNamesMap[wf.sequence_id] ||
            sequenceNamesMap[wf.campaign_id] ||
            triggerPayload.workflowName ||
            triggerPayload.sequenceName ||
            "Workflow de Mensagens";

          let stepName = "Aguardando próxima etapa";
          let waitingType: "delay" | "user_input" | "poll" | "ura" | "call" | null = null;
          let delayFormatted: string | null = triggerPayload.delayFormatted || null;

          if (isWfUserInput) {
            waitingType = "user_input";
            stepName = "Aguardando resposta do usuário";
          } else if (isWfDelay) {
            waitingType = "delay";
            stepName = `Delay ${delayFormatted || "30 segundos"}`;
          }

          itemsMap.set(wf.id, {
            id: wf.id,
            sequenceId: wf.sequence_id,
            sequenceName: resolvedWorkflowName,
            sequenceType: wf.sequence_type || "message",
            campaignId: wf.campaign_id,
            status: mappedStatus,
            isManuallyPaused,
            startedAt: wf.started_at,
            finishedAt: wf.finished_at,
            durationMs: wf.duration_ms,
            currentNodeId: null,
            currentNodeName: stepName,
            waitingType,
            delayFormatted,
            resumeAt: triggerPayload.resumeAt || null,
            errorMessage: wf.error_message,
            triggerType: wf.trigger_type,
            triggerPayload: wf.trigger_payload,
          });
        }
      }

      // Sort: active/paused first, then newest started_at
      return Array.from(itemsMap.values()).sort((a, b) => {
        const isAActive = a.status === "running" || a.status === "waiting" || a.status === "waiting_delay" || a.status === "waiting_user_input" || a.status === "paused";
        const isBActive = b.status === "running" || b.status === "waiting" || b.status === "waiting_delay" || b.status === "waiting_user_input" || b.status === "paused";
        if (isAActive && !isBActive) return -1;
        if (!isAActive && isBActive) return 1;
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });
    },
    enabled: !!(leadId || cleanPhone),
    refetchInterval: 3000,
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

  // Skip / Advance execution mutation
  const skipMutation = useMutation({
    mutationFn: async (executionId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-workflow-execution", {
        body: { action: "skip", executionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Avançado para a próxima etapa!");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      toast.error(`Erro ao avançar execução: ${err.message || err}`);
    },
  });

  // Filtered lists (strictly enforcing 1 active execution per workflow)
  const { activeExecutions, historyExecutions } = useMemo(() => {
    const rawActive: LeadExecutionItem[] = [];
    const rawHistory: LeadExecutionItem[] = [];

    for (const item of executions) {
      const isActive =
        item.status === "running" ||
        item.status === "waiting" ||
        item.status === "waiting_delay" ||
        item.status === "waiting_user_input" ||
        item.status === "paused";

      if (isActive) {
        rawActive.push(item);
      } else {
        rawHistory.push(item);
      }
    }

    // Deduplicate active executions by sequenceId / sequenceName so only ONE active execution per workflow exists
    const dedupedActive: LeadExecutionItem[] = [];
    const seenSequences = new Set<string>();

    // rawActive is already sorted by startedAt descending
    for (const item of rawActive) {
      const key = item.sequenceId || item.sequenceName || item.id;
      if (!seenSequences.has(key)) {
        seenSequences.add(key);
        dedupedActive.push(item);
      } else {
        // Older duplicate active execution of the same sequence moved to history
        rawHistory.push({
          ...item,
          status: "cancelled",
          errorMessage: item.errorMessage || "Substituída por execução mais recente",
        });
      }
    }

    return {
      activeExecutions: dedupedActive,
      historyExecutions: rawHistory,
    };
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
    skipExecution: skipMutation.mutate,
    isSkipping: skipMutation.isPending,
  };
}
