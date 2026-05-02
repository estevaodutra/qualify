import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useCallOperators } from "@/hooks/useCallOperators";

// ── Types ──

export interface QueueItem {
  id: string;
  campaignId: string;
  campaignName: string | null;
  leadId: string | null;
  phone: string;
  leadName: string | null;
  position: number;
  isPriority: boolean;
  attemptNumber: number;
  maxAttempts: number;
  observations: string | null;
  status: string;
  source: string;
  createdAt: string;
}

export interface QueueExecutionState {
  id: string;
  campaignId: string;
  status: "stopped" | "running" | "paused" | "waiting_operator" | "waiting_cooldown";
  currentPosition: number;
  lastDialAt: string | null;
  sessionStartedAt: string | null;
  callsMade: number;
  callsAnswered: number;
  callsNoAnswer: number;
}

interface DbQueueState {
  id: string;
  campaign_id: string;
  user_id: string;
  status: string | null;
  current_position: number | null;
  last_dial_at: string | null;
  session_started_at: string | null;
  calls_made: number | null;
  calls_answered: number | null;
  calls_no_answer: number | null;
}

const transformState = (db: DbQueueState): QueueExecutionState => ({
  id: db.id,
  campaignId: db.campaign_id,
  status: (db.status as QueueExecutionState["status"]) || "stopped",
  currentPosition: db.current_position ?? 0,
  lastDialAt: db.last_dial_at,
  sessionStartedAt: db.session_started_at,
  callsMade: db.calls_made ?? 0,
  callsAnswered: db.calls_answered ?? 0,
  callsNoAnswer: db.calls_no_answer ?? 0,
});

// ── Unified Hook ──

interface UseCallQueueOptions {
  campaignId?: string;
  /** When true, runs the global tick loop (use in AppLayout) */
  globalLoop?: boolean;
  /** Search filter for queue items */
  searchQuery?: string;
  /** Campaign filter for queue panel */
  campaignFilter?: string;
}

export function useCallQueue(options: UseCallQueueOptions = {}) {
  const { campaignId, globalLoop = false, searchQuery, campaignFilter } = options;
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const { operators } = useCallOperators();
  const tickInFlightRef = useRef(false);
  const maintenanceInFlightRef = useRef(false);

  // ── Queue Items ──
  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ["call-queue-items", campaignFilter, activeCompanyId, searchQuery],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_queue")
        .select("*, call_campaigns(name, is_priority)")
        .in("status", ["waiting", "in_call"])
        .order("is_priority", { ascending: false })
        .order("position", { ascending: true });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }

      if (campaignFilter && campaignFilter !== "all") {
        query = query.eq("campaign_id", campaignFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = (data || []).map((item: any) => ({
        id: item.id,
        campaignId: item.campaign_id,
        campaignName: item.call_campaigns?.name || null,
        leadId: item.lead_id,
        phone: item.phone,
        leadName: item.lead_name,
        position: item.position,
        isPriority: item.call_campaigns?.is_priority || false,
        attemptNumber: item.attempt_number || 1,
        maxAttempts: item.max_attempts || 3,
        observations: item.observations,
        status: item.status,
        source: item.source || "manual",
        createdAt: item.created_at,
      })) as QueueItem[];

      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        const sDigits = s.replace(/\D/g, "");
        result = result.filter(e => {
          const nameMatch = e.leadName?.toLowerCase().includes(s);
          const phoneDigits = (e.phone || "").replace(/\D/g, "");
          const phoneMatch = sDigits ? phoneDigits.includes(sDigits) : false;
          return nameMatch || phoneMatch;
        });
      }

      return result;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // ── Execution States (all campaigns) ──
  const { data: states = [], isLoading: isLoadingStates } = useQuery({
    queryKey: ["queue_execution_state_all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("queue_execution_state")
        .select("*");
      if (error) throw error;
      return (data || []).map((d: DbQueueState) => transformState(d));
    },
    refetchInterval: 5000,
  });

  // ── Per-campaign state (if campaignId provided) ──
  const campaignState = campaignId
    ? states.find((s: QueueExecutionState) => s.campaignId === campaignId) || null
    : null;

  // ── Summary ──
  const summary = {
    running: states.filter((s: QueueExecutionState) => s.status === "running").length,
    paused: states.filter((s: QueueExecutionState) => s.status === "paused").length,
    stopped: states.filter((s: QueueExecutionState) => s.status === "stopped").length,
    waiting_operator: states.filter((s: QueueExecutionState) => s.status === "waiting_operator").length,
    waiting_cooldown: states.filter((s: QueueExecutionState) => s.status === "waiting_cooldown").length,
  };

  const activeCount = summary.running + summary.waiting_operator + summary.waiting_cooldown;
  const globalStatus: "running" | "paused" | "stopped" | "mixed" =
    activeCount > 0 && summary.paused > 0 ? "mixed"
    : activeCount > 0 ? "running"
    : summary.paused > 0 ? "paused"
    : "stopped";

  // ── Operators ──
  const availableOperators = operators.filter(o => o.status === "available");
  const onCallOperators = operators.filter(o => o.status === "on_call");
  const cooldownOperators = operators.filter(o => o.status === "cooldown");

  // ── Tick ──
  const activeIds = states
    .filter((s: QueueExecutionState) => ["running", "waiting_operator", "waiting_cooldown"].includes(s.status))
    .map((s: QueueExecutionState) => s.campaignId);

  const activeIdsRef = useRef<string[]>([]);
  activeIdsRef.current = activeIds;

  const tickAll = useCallback(async () => {
    if (tickInFlightRef.current) return;
    const ids = activeIdsRef.current;
    if (ids.length === 0) return;

    tickInFlightRef.current = true;
    try {
      if (activeCompanyId) {
        // Global tick: single call, SQL decides which campaign/item
        try {
          await Promise.race([
            supabase.functions.invoke(`queue-processor?company_id=${activeCompanyId}&action=global_tick`, { method: "POST" }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 30000)),
          ]);
        } catch (e) {
          console.error(`[queue-tick/global] error:`, e);
        }
      } else {
        // Fallback: per-campaign tick (no company context)
        for (const id of ids) {
          try {
            await Promise.race([
              supabase.functions.invoke(`queue-processor?campaign_id=${id}&action=tick`, { method: "POST" }),
              new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 30000)),
            ]);
          } catch (e) {
            console.error(`[queue-tick] error for ${id}:`, e);
          }
          if (id !== ids[ids.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
      queryClient.invalidateQueries({ queryKey: ["call-queue-items"] });
    } finally {
      tickInFlightRef.current = false;
    }
  }, [queryClient, activeCompanyId]);

  const tickAllRef = useRef(tickAll);
  tickAllRef.current = tickAll;

  const runMaintenance = useCallback(async () => {
    if (maintenanceInFlightRef.current) return;
    maintenanceInFlightRef.current = true;
    try {
      const { data: resolved } = await (supabase as any).rpc('resolve_cooldowns');
      queryClient.invalidateQueries({ queryKey: ["call_operators"] });
      if (resolved?.length && activeIdsRef.current.length > 0) {
        setTimeout(() => tickAllRef.current(), 500);
      }
    } catch (e) {
      console.error("[maintenance] error:", e);
    } finally {
      maintenanceInFlightRef.current = false;
    }
  }, [queryClient]);

  // Global tick loop (only when globalLoop = true)
  useEffect(() => {
    if (!globalLoop) return;
    runMaintenance();
    const mInterval = setInterval(runMaintenance, 10000);
    return () => clearInterval(mInterval);
  }, [globalLoop, runMaintenance]);

  useEffect(() => {
    if (!globalLoop || activeIds.length === 0) return;
    tickInFlightRef.current = false;
    tickAll();
    const interval = setInterval(tickAll, 8000);
    return () => {
      clearInterval(interval);
      tickInFlightRef.current = false;
    };
  }, [globalLoop, activeIds.length, tickAll]);

  // ── Mutations ──

  const addToQueue = useMutation({
    mutationFn: async ({ campaignId: cId, leadIds, position }: { campaignId: string; leadIds: string[]; position: "end" | "start" }) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      // Fetch lead data
      const { data: leadsData } = await (supabase as any)
        .from("call_leads")
        .select("id, phone, name")
        .in("id", leadIds);

      if (!leadsData?.length) throw new Error("No leads found");

      // Get current max/min position
      const { data: posData } = await (supabase as any)
        .from("call_queue")
        .select("position")
        .eq("campaign_id", cId)
        .order("position", { ascending: position === "start" })
        .limit(1);

      let startPos: number;
      if (position === "end") {
        startPos = (posData?.[0]?.position || 0) + 1;
      } else {
        startPos = (posData?.[0]?.position || 1) - leadIds.length;
      }

      let added = 0;
      let skipped = 0;
      for (let i = 0; i < leadsData.length; i++) {
        const lead = leadsData[i];
        const { error } = await (supabase as any).from("call_queue").insert({
          user_id: authUser.id,
          company_id: activeCompanyId || null,
          campaign_id: cId,
          lead_id: lead.id,
          phone: lead.phone,
          lead_name: lead.name || null,
          position: startPos + i,
          source: "manual",
        });
        if (error) skipped++;
        else added++;
      }
      return { added, skipped };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["call-queue-items"] });
      toast({ title: "Leads adicionados à fila", description: `${result.added} adicionados, ${result.skipped} ignorados` });
    },
    onError: () => toast({ title: "Erro ao adicionar à fila", variant: "destructive" }),
  });

  const removeFromQueue = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase.from("call_queue").delete().eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue-items"] });
      toast({ title: "Lead removido da fila" });
    },
    onError: () => toast({ title: "Erro ao remover da fila", variant: "destructive" }),
  });

  const moveToStart = useMutation({
    mutationFn: async (entryId: string) => {
      const { data: minPosData } = await (supabase as any)
        .from("call_queue")
        .select("position")
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();

      const prevPosition = (minPosData?.position ?? 1) - 1;
      const { error } = await (supabase as any)
        .from("call_queue")
        .update({ position: prevPosition })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue-items"] });
      toast({ title: "Lead movido para o início da fila" });
    },
    onError: () => toast({ title: "Erro ao mover lead", variant: "destructive" }),
  });

  const moveToEnd = useMutation({
    mutationFn: async (entryId: string) => {
      const { data: maxPosData } = await (supabase as any)
        .from("call_queue")
        .select("position")
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition = (maxPosData?.position || 0) + 1;
      const { error } = await (supabase as any)
        .from("call_queue")
        .update({ position: nextPosition })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue-items"] });
      toast({ title: "Lead movido para o final da fila" });
    },
    onError: () => toast({ title: "Erro ao mover lead", variant: "destructive" }),
  });

  const clearQueue = useMutation({
    mutationFn: async (filter?: string) => {
      let deleteQuery = (supabase as any)
        .from("call_queue")
        .delete()
        .eq("status", "waiting");
      if (filter && filter !== "all") {
        deleteQuery = deleteQuery.eq("campaign_id", filter);
      }
      const { error } = await deleteQuery;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-queue-items"] });
      toast({ title: "Fila esvaziada com sucesso" });
    },
    onError: () => toast({ title: "Erro ao esvaziar fila", variant: "destructive" }),
  });

  // ── Queue Control (start/pause/resume/stop) ──

  const startQueue = useMutation({
    mutationFn: async (cId: string) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Não autenticado");

      const { error } = await (supabase as any)
        .from("queue_execution_state")
        .upsert({
          campaign_id: cId,
          user_id: authUser.id,
          status: "running",
          session_started_at: new Date().toISOString(),
          calls_made: 0,
          calls_answered: 0,
          calls_no_answer: 0,
          current_position: 0,
          current_operator_index: 0,
        }, { onConflict: "campaign_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
      toast({ title: "Fila iniciada" });
      setTimeout(() => tickAllRef.current(), 500);
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const pauseQueue = useMutation({
    mutationFn: async (cId: string) => {
      await (supabase as any).from("queue_execution_state")
        .update({ status: "paused" })
        .eq("campaign_id", cId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
      toast({ title: "Fila pausada" });
    },
  });

  const resumeQueue = useMutation({
    mutationFn: async (cId: string) => {
      await (supabase as any).from("queue_execution_state")
        .update({ status: "running" })
        .eq("campaign_id", cId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
      toast({ title: "Fila retomada" });
      setTimeout(() => tickAllRef.current(), 500);
    },
  });

  const stopQueue = useMutation({
    mutationFn: async (cId: string) => {
      await (supabase as any).from("queue_execution_state")
        .update({ status: "stopped", current_position: 0 })
        .eq("campaign_id", cId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
      toast({ title: "Fila parada" });
    },
  });

  const pauseAll = useMutation({
    mutationFn: async () => {
      const active = states.filter((s: QueueExecutionState) =>
        ["running", "waiting_operator", "waiting_cooldown"].includes(s.status)
      );
      for (const s of active) {
        await (supabase as any).from("queue_execution_state")
          .update({ status: "paused" })
          .eq("campaign_id", s.campaignId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] }),
  });

  const resumeAll = useMutation({
    mutationFn: async () => {
      const paused = states.filter((s: QueueExecutionState) => s.status === "paused");
      for (const s of paused) {
        await (supabase as any).from("queue_execution_state")
          .update({ status: "running" })
          .eq("campaign_id", s.campaignId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] }),
  });

  return {
    // Queue items
    items,
    isLoading: isLoadingItems || isLoadingStates,
    totalWaiting: items.length,

    // Execution state
    states,
    state: campaignState,
    summary,
    globalStatus,
    isRunning: campaignState ? ["running", "waiting_operator", "waiting_cooldown"].includes(campaignState.status) : false,
    isPaused: campaignState?.status === "paused",
    isStopped: !campaignState || campaignState.status === "stopped",

    // Operators
    availableOperators,
    onCallOperators,
    cooldownOperators,

    // Queue mutations
    addToQueue,
    removeFromQueue: removeFromQueue.mutateAsync,
    moveToStart: moveToStart.mutateAsync,
    moveToEnd: moveToEnd.mutateAsync,
    clearQueue: clearQueue.mutateAsync,
    isClearingQueue: clearQueue.isPending,

    // Queue control
    startQueue: startQueue.mutateAsync,
    pauseQueue: pauseQueue.mutateAsync,
    resumeQueue: resumeQueue.mutateAsync,
    stopQueue: stopQueue.mutateAsync,
    isStarting: startQueue.isPending,
    isPausing: pauseQueue.isPending,
    isStopping: stopQueue.isPending,

    // Global control
    pauseAll: pauseAll.mutateAsync,
    resumeAll: resumeAll.mutateAsync,
    isPausingAll: pauseAll.isPending,
    isResumingAll: resumeAll.isPending,
  };
}
