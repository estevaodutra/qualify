import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCallFloatingStore, CallDialogData } from "@/stores/callFloating.store";
import { useChatExpressStore } from "@/stores/chatExpress.store";
import { formatPhone, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall,
  Phone,
  MessageSquare,
  Search,
  RefreshCw,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  X,
  ListOrdered,
  History,
  Clock,
  ChevronRight,
  Headset,
  FileText,
  Star,
} from "lucide-react";

interface MiniCallPanelProps {
  isDocked: boolean;
  onToggleDock: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

interface CombinedItem {
  id: string;
  source: "workflow" | "queue";
  leadId: string;
  leadName: string;
  leadPhone: string;
  campaignId: string;
  campaignName: string;
  isPriority: boolean;
  position: number;
  attemptNumber: number;
  maxAttempts: number;
  notes?: string;
  createdAt: string;
}

interface ActiveItem {
  id: string;
  source: "workflow" | "call_log";
  leadId: string;
  leadName: string;
  leadPhone: string;
  campaignId: string;
  campaignName: string;
  callStatus: string;
  startedAt?: string | null;
  durationSeconds: number;
}

interface HistoryItem {
  id: string;
  source: "workflow" | "call_log";
  leadId: string;
  leadName: string;
  leadPhone: string;
  campaignId: string;
  campaignName: string;
  callStatus: string;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  durationSeconds: number;
}

export function MiniCallPanel({ isDocked, onToggleDock, onMinimize, onClose }: MiniCallPanelProps) {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"queue" | "in_progress" | "history">("queue");
  const [search, setSearch] = useState("");

  const { activeCall, callStatus, duration, openCall, setView } = useCallFloatingStore();

  const isCallActive =
    activeCall &&
    ["dialing", "ringing", "in_call", "on_call", "answered", "in_progress"].includes(
      (activeCall.callStatus as string) || callStatus || ""
    );

  // 1. Fetch Queue Items (Workflow Tasks + Call Queue)
  const {
    data: queueItems = [],
    isLoading: isLoadingQueue,
    isRefetching: isRefetchingQueue,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ["mini-call-queue", activeCompanyId],
    queryFn: async () => {
      const items: CombinedItem[] = [];

      // 1.1 Pending workflow call tasks
      try {
        let wfQuery = (supabase as any)
          .from("workflow_call_tasks")
          .select("*, leads(name, phone)")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(30);

        if (activeCompanyId) {
          wfQuery = wfQuery.eq("company_id", activeCompanyId);
        }

        const { data: wfTasks, error: wfErr } = await wfQuery;
        if (!wfErr && wfTasks) {
          // Resolve sequence / workflow names if available
          const workflowIds = [...new Set(wfTasks.map((t: any) => t.workflow_id).filter(Boolean))];
          const queueIds = [...new Set(wfTasks.map((t: any) => t.queue_id).filter(Boolean))];

          const nameMap: Record<string, string> = {};
          if (workflowIds.length > 0) {
            const { data: wfs } = await (supabase as any)
              .from("workflows")
              .select("id, name")
              .in("id", workflowIds);
            if (wfs) {
              wfs.forEach((w: any) => {
                nameMap[w.id] = w.name;
              });
            }
          }
          if (queueIds.length > 0) {
            const { data: camps } = await (supabase as any)
              .from("call_campaigns")
              .select("id, name")
              .in("id", queueIds);
            if (camps) {
              camps.forEach((c: any) => {
                nameMap[c.id] = c.name;
              });
            }
          }

          wfTasks.forEach((t: any, idx: number) => {
            const wfName =
              (t.workflow_id && nameMap[t.workflow_id]) ||
              (t.queue_id && nameMap[t.queue_id]) ||
              t.campaign_name ||
              "Workflow";

            items.push({
              id: `wt_${t.id}`,
              source: "workflow",
              leadId: t.lead_id || "",
              leadName: t.leads?.name || t.lead_name || "Lead",
              leadPhone: t.phone || t.leads?.phone || "",
              campaignId: t.workflow_id || t.queue_id || "",
              campaignName: wfName,
              isPriority: true,
              position: idx + 1,
              attemptNumber: (t.attempt_count || 0) + 1,
              maxAttempts: t.max_attempts || 3,
              notes: t.observation || "",
              createdAt: t.created_at || new Date().toISOString(),
            });
          });
        }
      } catch (e) {
        console.error("Erro ao buscar tarefas de workflow:", e);
      }

      // 1.2 Waiting items in call_queue
      try {
        let qQuery = (supabase as any)
          .from("call_queue")
          .select("*, call_campaigns(name, is_priority)")
          .eq("status", "waiting")
          .order("is_priority", { ascending: false })
          .order("position", { ascending: true })
          .limit(40);

        if (activeCompanyId) {
          qQuery = qQuery.or(`company_id.eq.${activeCompanyId},company_id.is.null`);
        }

        const { data: qData, error: qErr } = await qQuery;
        if (!qErr && qData) {
          qData.forEach((q: any) => {
            items.push({
              id: `cq_${q.id}`,
              source: "queue",
              leadId: q.lead_id || "",
              leadName: q.lead_name || "Lead",
              leadPhone: q.phone || "",
              campaignId: q.campaign_id || "",
              campaignName: q.call_campaigns?.name || "Campanha",
              isPriority: q.is_priority || q.call_campaigns?.is_priority || false,
              position: q.position || items.length + 1,
              attemptNumber: q.attempt_number || 1,
              maxAttempts: q.max_attempts || 3,
              notes: q.observations || "",
              createdAt: q.created_at || new Date().toISOString(),
            });
          });
        }
      } catch (e) {
        console.error("Erro ao buscar call_queue:", e);
      }

      // Sort: Priority items first, then by position or creation date
      return items.sort((a, b) => {
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;
        return a.position - b.position;
      });
    },
    refetchInterval: 5000,
  });

  // 2. Fetch Active / In Progress Calls (from both workflow_call_tasks and call_logs)
  const { data: activeCalls = [], isLoading: isLoadingActive } = useQuery<ActiveItem[]>({
    queryKey: ["mini-call-active", activeCompanyId],
    queryFn: async () => {
      const items: ActiveItem[] = [];

      // 2.1 Workflow tasks in progress
      try {
        let wfQuery = (supabase as any)
          .from("workflow_call_tasks")
          .select("*, leads(name, phone)")
          .in("status", ["in_progress", "dialing", "ringing", "answered", "on_call"])
          .order("created_at", { ascending: false })
          .limit(20);

        if (activeCompanyId) {
          wfQuery = wfQuery.or(`company_id.eq.${activeCompanyId},company_id.is.null`);
        }

        const { data: wfActive } = await wfQuery;
        if (wfActive && wfActive.length > 0) {
          const workflowIds = [...new Set(wfActive.map((t: any) => t.workflow_id).filter(Boolean))];
          const queueIds = [...new Set(wfActive.map((t: any) => t.queue_id).filter(Boolean))];
          const nameMap: Record<string, string> = {};

          if (workflowIds.length > 0) {
            const { data: wfs } = await (supabase as any).from("workflows").select("id, name").in("id", workflowIds);
            wfs?.forEach((w: any) => { nameMap[w.id] = w.name; });
          }
          if (queueIds.length > 0) {
            const { data: camps } = await (supabase as any).from("call_campaigns").select("id, name").in("id", queueIds);
            camps?.forEach((c: any) => { nameMap[c.id] = c.name; });
          }

          wfActive.forEach((t: any) => {
            const wfName = (t.workflow_id && nameMap[t.workflow_id]) || (t.queue_id && nameMap[t.queue_id]) || t.campaign_name || "Workflow";
            items.push({
              id: `wt_${t.id}`,
              source: "workflow",
              leadId: t.lead_id || "",
              leadName: t.leads?.name || "Lead",
              leadPhone: t.phone || t.leads?.phone || "",
              campaignId: t.workflow_id || t.queue_id || "",
              campaignName: wfName,
              callStatus: t.status,
              startedAt: t.started_at,
              durationSeconds: t.duration_seconds || 0,
            });
          });
        }
      } catch (e) {
        console.error("Erro ao buscar chamadas ativas de workflow:", e);
      }

      // 2.2 Call logs in progress
      try {
        let q = (supabase as any)
          .from("call_logs")
          .select("id, campaign_id, lead_id, operator_id, call_status, started_at, duration_seconds, call_leads(name, phone), call_campaigns(name)")
          .in("call_status", ["dialing", "ringing", "in_call", "on_call", "answered", "in_progress"])
          .order("started_at", { ascending: false })
          .limit(20);

        if (activeCompanyId) {
          q = q.or(`company_id.eq.${activeCompanyId},company_id.is.null`);
        }

        const { data } = await q;
        if (data && data.length > 0) {
          data.forEach((c: any) => {
            items.push({
              id: c.id,
              source: "call_log",
              leadId: c.lead_id || "",
              leadName: c.call_leads?.name || "Lead",
              leadPhone: c.call_leads?.phone || "",
              campaignId: c.campaign_id || "",
              campaignName: c.call_campaigns?.name || "Geral",
              callStatus: c.call_status,
              startedAt: c.started_at,
              durationSeconds: c.duration_seconds || 0,
            });
          });
        }
      } catch (e) {
        console.error("Erro ao buscar chamadas ativas de call_logs:", e);
      }

      return items;
    },
    refetchInterval: 3000,
  });

  // 3. Fetch Recent Call History (from both workflow_call_tasks and call_logs)
  const { data: historyCalls = [], isLoading: isLoadingHistory } = useQuery<HistoryItem[]>({
    queryKey: ["mini-call-history", activeCompanyId],
    queryFn: async () => {
      const items: HistoryItem[] = [];

      // 3.1 Finished workflow call tasks
      try {
        let wfQuery = (supabase as any)
          .from("workflow_call_tasks")
          .select("*, leads(name, phone)")
          .in("status", ["completed", "failed", "cancelled", "no_answer", "busy", "answered"])
          .order("created_at", { ascending: false })
          .limit(40);

        if (activeCompanyId) {
          wfQuery = wfQuery.or(`company_id.eq.${activeCompanyId},company_id.is.null`);
        }

        const { data: wfFinished, error: wfErr } = await wfQuery;
        if (!wfErr && wfFinished && wfFinished.length > 0) {
          const workflowIds = [...new Set(wfFinished.map((t: any) => t.workflow_id).filter(Boolean))];
          const queueIds = [...new Set(wfFinished.map((t: any) => t.queue_id).filter(Boolean))];
          const nameMap: Record<string, string> = {};

          if (workflowIds.length > 0) {
            const { data: wfs } = await (supabase as any).from("workflows").select("id, name").in("id", workflowIds);
            wfs?.forEach((w: any) => { nameMap[w.id] = w.name; });
          }
          if (queueIds.length > 0) {
            const { data: camps } = await (supabase as any).from("call_campaigns").select("id, name").in("id", queueIds);
            camps?.forEach((c: any) => { nameMap[c.id] = c.name; });
          }

          wfFinished.forEach((t: any) => {
            const wfName = (t.workflow_id && nameMap[t.workflow_id]) || (t.queue_id && nameMap[t.queue_id]) || t.campaign_name || "Workflow";
            items.push({
              id: `wt_${t.id}`,
              source: "workflow",
              leadId: t.lead_id || "",
              leadName: t.leads?.name || "Lead",
              leadPhone: t.phone || t.leads?.phone || "",
              campaignId: t.workflow_id || t.queue_id || "",
              campaignName: wfName,
              callStatus: t.status,
              startedAt: t.started_at,
              endedAt: t.completed_at || t.updated_at,
              createdAt: t.created_at,
              durationSeconds: t.duration_seconds || 0,
            });
          });
        }
      } catch (e) {
        console.error("Erro ao buscar histórico de workflows:", e);
      }

      // 3.2 Finished call_logs
      try {
        let q = (supabase as any)
          .from("call_logs")
          .select("id, campaign_id, lead_id, operator_id, call_status, started_at, ended_at, created_at, duration_seconds, call_leads(name, phone), call_campaigns(name)")
          .in("call_status", ["completed", "no_answer", "failed", "cancelled", "busy", "voicemail", "timeout", "max_attempts_exceeded"])
          .order("created_at", { ascending: false })
          .limit(30);

        if (activeCompanyId) {
          q = q.or(`company_id.eq.${activeCompanyId},company_id.is.null`);
        }

        const { data: logs, error } = await q;
        if (!error && logs && logs.length > 0) {
          const crmLeadIds = logs.filter((l: any) => !l.call_leads && l.lead_id).map((l: any) => l.lead_id);
          let crmMap: Record<string, { name: string; phone: string }> = {};
          if (crmLeadIds.length > 0) {
            const { data: crmData } = await supabase.from("leads").select("id, name, phone").in("id", crmLeadIds);
            crmData?.forEach((l: any) => { crmMap[l.id] = { name: l.name, phone: l.phone }; });
          }

          logs.forEach((c: any) => {
            const crm = c.lead_id ? crmMap[c.lead_id] : null;
            items.push({
              id: c.id,
              source: "call_log",
              leadId: c.lead_id || "",
              leadName: c.call_leads?.name || crm?.name || "Lead",
              leadPhone: c.call_leads?.phone || crm?.phone || "",
              campaignId: c.campaign_id || "",
              campaignName: c.call_campaigns?.name || "Geral",
              callStatus: c.call_status,
              startedAt: c.started_at,
              endedAt: c.ended_at,
              createdAt: c.created_at,
              durationSeconds: c.duration_seconds || 0,
            });
          });
        }
      } catch (e) {
        console.error("Erro ao buscar histórico de call_logs:", e);
      }

      return items.sort((a, b) => {
        const timeA = new Date(a.endedAt || a.createdAt).getTime();
        const timeB = new Date(b.endedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
    },
    refetchInterval: 8000,
  });

  // Filter items by search query
  const filteredQueue = useMemo(() => {
    if (!search.trim()) return queueItems;
    const term = search.toLowerCase().trim();
    const cleanTerm = term.replace(/\D/g, "");
    return queueItems.filter(
      (item) =>
        item.leadName.toLowerCase().includes(term) ||
        item.campaignName.toLowerCase().includes(term) ||
        (cleanTerm && item.leadPhone.replace(/\D/g, "").includes(cleanTerm))
    );
  }, [queueItems, search]);

  const filteredActive = useMemo(() => {
    if (!search.trim()) return activeCalls;
    const term = search.toLowerCase().trim();
    const cleanTerm = term.replace(/\D/g, "");
    return activeCalls.filter(
      (c) =>
        c.leadName.toLowerCase().includes(term) ||
        c.campaignName.toLowerCase().includes(term) ||
        (cleanTerm && c.leadPhone.replace(/\D/g, "").includes(cleanTerm))
    );
  }, [activeCalls, search]);

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return historyCalls;
    const term = search.toLowerCase().trim();
    const cleanTerm = term.replace(/\D/g, "");
    return historyCalls.filter(
      (c) =>
        c.leadName.toLowerCase().includes(term) ||
        c.campaignName.toLowerCase().includes(term) ||
        (cleanTerm && c.leadPhone.replace(/\D/g, "").includes(cleanTerm))
    );
  }, [historyCalls, search]);

  const handleStartCall = (item: CombinedItem, autoDial: boolean) => {
    const dialogData: CallDialogData = {
      callId: item.id,
      campaignId: item.campaignId,
      leadId: item.leadId,
      leadName: item.leadName,
      leadPhone: item.leadPhone,
      campaignName: item.campaignName,
      duration: 0,
      notes: item.notes || "",
      attemptNumber: item.attemptNumber,
      maxAttempts: item.maxAttempts,
      isPriority: item.isPriority,
      callStatus: autoDial ? "dialing" : "idle",
      userId: user?.id,
      autoDial,
    };

    openCall(dialogData);
  };

  const handleOpenChat = async (item: CombinedItem) => {
    let targetLeadId = item.leadId;
    let targetName = item.leadName;
    const targetPhone = item.leadPhone;

    if (!targetLeadId && targetPhone && activeCompanyId) {
      try {
        const cleanPhone = targetPhone.replace(/\D/g, "");
        const { data: matchedLead } = await supabase
          .from("leads")
          .select("id, name, phone")
          .eq("company_id", activeCompanyId)
          .or(`phone.ilike.%${cleanPhone}%,phone.eq.${targetPhone}`)
          .maybeSingle();

        if (matchedLead) {
          targetLeadId = matchedLead.id;
          targetName = targetName || matchedLead.name;
        } else {
          const { data: newLead } = await supabase
            .from("leads")
            .insert({
              company_id: activeCompanyId,
              name: targetName || targetPhone || "Lead",
              phone: targetPhone || null,
            })
            .select("id, name, phone")
            .maybeSingle();
          if (newLead) {
            targetLeadId = newLead.id;
          }
        }
      } catch (e) {
        console.warn("Could not resolve lead for chat:", e);
      }
    }

    useChatExpressStore.getState().openLeadSession({
      leadId: targetLeadId || item.id,
      leadName: targetName || targetPhone || "Lead",
      phone: targetPhone || null,
    });
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* 1. Header */}
      <div className="relative bg-gradient-to-b from-slate-50/90 via-slate-50/40 to-white dark:from-slate-900/90 dark:via-slate-900/40 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#7C3AED] to-[#3B4DFF] text-white flex items-center justify-center shadow-xs shrink-0">
              <PhoneCall className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  Painel de Ligações
                </h2>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                >
                  🟢 Ao Vivo
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground truncate">
                {queueItems.length} na fila · {activeCalls.length} em andamento · {historyCalls.length} no histórico
              </span>
            </div>
          </div>

          {/* Window Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => refetchQueue()}
              disabled={isRefetchingQueue}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Atualizar lista"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetchingQueue && "animate-spin text-primary")} />
            </button>

            <button
              type="button"
              onClick={onMinimize}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Minimizar para balão flutuante"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleDock}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isDocked ? "Expandir tela cheia" : "Fixar no canto (Dock)"}
            >
              {isDocked ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lead, telefone ou campanha..."
            className="pl-8 h-8 text-xs rounded-lg border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 focus-visible:ring-primary/20"
          />
        </div>
      </div>

      {/* 2. Active Call Banner (if a call is in progress) */}
      {isCallActive && (
        <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border-b border-emerald-500/30 px-3.5 py-2 flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <div className="flex items-center gap-1.5 truncate text-xs">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 truncate">
                Em chamada: {activeCall?.leadName || "Lead"}
              </span>
              <span className="font-mono text-[11px] text-emerald-700/80 dark:text-emerald-400 font-semibold">
                ({formatSecs(duration)})
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setView("call")}
            className="h-6 px-2.5 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shrink-0 shadow-2xs"
          >
            <span>Ver Card</span>
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* 3. Segmented Navigation Tabs */}
      <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
        <div className="grid grid-cols-3 gap-1 bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("queue")}
            className={cn(
              "py-1 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1 truncate",
              activeTab === "queue"
                ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListOrdered className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Fila ({queueItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("in_progress")}
            className={cn(
              "py-1 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1 truncate",
              activeTab === "in_progress"
                ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Ativas ({activeCalls.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={cn(
              "py-1 px-2 rounded-md transition-all text-center flex items-center justify-center gap-1 truncate",
              activeTab === "history"
                ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Histórico ({historyCalls.length})</span>
          </button>
        </div>
      </div>

      {/* 4. Tab Content (Scrollable List) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
        {/* ── QUEUE TAB ── */}
        {activeTab === "queue" && (
          <>
            {isLoadingQueue ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Carregando fila de ligações...</span>
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground px-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mb-2.5 text-slate-400">
                  <ListOrdered className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Nenhum lead na fila</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  {search ? "Nenhum resultado para a busca realizada." : "Não há chamadas pendentes ou aguardando atendimento no momento."}
                </p>
              </div>
            ) : (
              filteredQueue.map((item, idx) => {
                const isFirst = idx === 0;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border p-3 transition-all space-y-2 bg-white dark:bg-slate-900 shadow-2xs hover:border-primary/40",
                      item.isPriority
                        ? "border-amber-400/50 bg-amber-500/5 dark:bg-amber-950/15"
                        : isFirst
                        ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                        : "border-slate-200/80 dark:border-slate-800"
                    )}
                  >
                    {/* Row 1: Position, Name, Priority & Attempt badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={cn(
                            "h-5 min-w-[20px] px-1 rounded-md text-[10px] font-black flex items-center justify-center font-mono shrink-0",
                            isFirst
                              ? "bg-gradient-to-r from-[#7C3AED] to-[#3B4DFF] text-white shadow-2xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          )}
                        >
                          #{idx + 1}
                        </span>

                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {item.leadName || "Lead Sem Nome"}
                        </span>

                        {item.isPriority && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-400/40 rounded font-bold shrink-0 gap-0.5"
                          >
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            Prioritária
                          </Badge>
                        )}
                      </div>

                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1.5 rounded bg-blue-500/5 text-blue-700 dark:text-blue-300 border-blue-300/50 font-medium shrink-0"
                      >
                        x{item.attemptNumber}/{item.maxAttempts}
                      </Badge>
                    </div>

                    {/* Row 2: Phone & Campaign Name */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2">
                      <div className="flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-300 truncate">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{item.leadPhone ? formatPhone(item.leadPhone) : "Sem telefone"}</span>
                      </div>

                      <span className="truncate text-slate-500 dark:text-slate-400 text-[10px]">
                        📁 {item.campaignName || "Workflow"}
                      </span>
                    </div>

                    {/* Row 3: Action Buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenChat(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[11px] font-semibold transition-colors border border-emerald-500/20"
                        title="Abrir WhatsApp / Chat Express"
                      >
                        <MessageSquare className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Chat</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartCall(item, false)}
                          className="h-7 px-2.5 text-[11px] font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Ver Card
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleStartCall(item, true)}
                          className="h-7 px-3 text-[11px] font-bold rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B4DFF] hover:opacity-95 text-white gap-1 shadow-2xs"
                        >
                          <Phone className="h-3 w-3" />
                          <span>Discar</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ── IN PROGRESS TAB ── */}
        {activeTab === "in_progress" && (
          <>
            {isLoadingActive ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Carregando chamadas ativas...</span>
              </div>
            ) : filteredActive.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground px-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mb-2.5 text-slate-400">
                  <Headset className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Nenhuma ligação em andamento</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  No momento não há chamadas ativas sendo executadas pelos operadores.
                </p>
              </div>
            ) : (
              filteredActive.map((call) => (
                <div
                  key={call.id}
                  className="rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/20 p-3 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {call.leadName || "Lead"}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300/40 font-semibold">
                      {call.callStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">{call.leadPhone ? formatPhone(call.leadPhone) : "Sem telefone"}</span>
                    <span className="truncate max-w-[160px]">📁 {call.campaignName || "Geral"}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-500">
                      Duração: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatSecs(call.durationSeconds || 0)}</strong>
                    </span>

                    <Button
                      size="sm"
                      onClick={() => {
                        openCall({
                          callId: call.id,
                          campaignId: call.campaignId,
                          leadId: call.leadId,
                          leadName: call.leadName || "Lead",
                          leadPhone: call.leadPhone || "",
                          campaignName: call.campaignName || "Geral",
                          duration: call.durationSeconds || 0,
                          callStatus: call.callStatus,
                          autoDial: false,
                        });
                      }}
                      className="h-6 px-2.5 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white gap-1"
                    >
                      <span>Acessar</span>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {activeTab === "history" && (
          <>
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Carregando histórico...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground px-4">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center mb-2.5 text-slate-400">
                  <History className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Nenhum histórico recente</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  As chamadas concluídas aparecerão listadas aqui para consulta rápida.
                </p>
              </div>
            ) : (
              filteredHistory.map((call) => (
                <div
                  key={call.id}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {call.leadName || "Lead"}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-medium shrink-0",
                        call.callStatus === "completed"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                          : call.callStatus === "cancelled"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      )}
                    >
                      {call.callStatus === "completed"
                        ? "✅ Concluída"
                        : call.callStatus === "cancelled"
                        ? "🚫 Cancelada"
                        : call.callStatus === "no_answer"
                        ? "📵 Não atendeu"
                        : call.callStatus === "busy"
                        ? "🔴 Ocupado"
                        : call.callStatus === "failed"
                        ? "❌ Falha"
                        : call.callStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono">{call.leadPhone ? formatPhone(call.leadPhone) : "—"}</span>
                    <span>
                      {call.endedAt || call.createdAt
                        ? new Date(call.endedAt || call.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <span className="text-slate-500 truncate max-w-[170px]">
                      📁 {call.campaignName || "Workflow"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleOpenChat({
                            id: call.id,
                            source: call.source === "workflow" ? "workflow" : "queue",
                            leadId: call.leadId,
                            leadName: call.leadName,
                            leadPhone: call.leadPhone,
                            campaignId: call.campaignId,
                            campaignName: call.campaignName,
                            isPriority: false,
                            position: 0,
                            attemptNumber: 1,
                            maxAttempts: 3,
                            createdAt: call.createdAt,
                          })
                        }
                        className="h-6 w-6 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md"
                        title="Chat do lead"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          openCall({
                            callId: call.id,
                            campaignId: call.campaignId,
                            leadId: call.leadId,
                            leadName: call.leadName,
                            leadPhone: call.leadPhone,
                            campaignName: call.campaignName,
                            duration: call.durationSeconds,
                            callStatus: call.callStatus,
                            autoDial: false,
                          });
                        }}
                        className="h-6 px-2 text-[11px] rounded-md text-primary font-semibold hover:bg-primary/5 gap-1"
                      >
                        <span>Ver Card</span>
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* 5. Footer Quick Bar */}
      <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800 px-4 py-2.5 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground truncate">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>Fila atualizada automaticamente</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const first = filteredQueue[0];
            if (first) {
              handleStartCall(first, true);
            }
          }}
          disabled={filteredQueue.length === 0}
          className="h-8 px-3 text-xs font-bold rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B4DFF] hover:opacity-95 text-white gap-1.5 shadow-2xs disabled:opacity-50"
        >
          <Phone className="h-3.5 w-3.5" />
          <span>Discar Próximo</span>
        </Button>
      </div>
    </div>
  );
}
