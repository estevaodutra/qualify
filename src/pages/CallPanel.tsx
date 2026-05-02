import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Checkbox } from "@/components/ui/checkbox";
import { useCallPanel, CallPanelEntry } from "@/hooks/useCallPanel";
import { useCallCampaigns } from "@/hooks/useCallCampaigns";
import { useCallActions, CallAction } from "@/hooks/useCallActions";
import { useCallQueue, QueueItem } from "@/hooks/useCallQueue";
import { useCallOperators } from "@/hooks/useCallOperators";
import { OperatorsPanel } from "@/components/call-panel/OperatorsPanel";
import { CallPopup } from "@/components/operator/CallPopup";
import { Users, Settings as SettingsIcon, Copy, CalendarIcon, History } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InlineScriptRunner } from "@/components/call-campaigns/operator/InlineScriptRunner";
import { CallActionDialog } from "@/components/operator/CallActionDialog";
import { CreateQueueDialog } from "@/components/call-panel/CreateQueueDialog";
import { RemoveFromQueueDialog } from "@/components/call-panel/RemoveFromQueueDialog";
import { ClearAllQueueDialog } from "@/components/call-panel/ClearAllQueueDialog";
import {
  Clock,
  Pause,
  Square,
  Phone,
  PhoneCall,
  PhoneOff,
  User,
  FolderOpen,
  Plus,
  CalendarClock,
  XCircle,
  Play,
  Target,
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Timer,
  FileText,
  Headset,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  ListOrdered,
  Trash2,
  Eye,
  RefreshCw,
  MoreHorizontal,
  Bot,
  Star,
  Zap,
} from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";
import { format } from "date-fns";

// ── Helpers ──

function getTimeRemaining(scheduledFor: string | null): { text: string; seconds: number; isUrgent: boolean } {
  if (!scheduledFor) return { text: "", seconds: Infinity, isUrgent: false };
  const diff = new Date(scheduledFor).getTime() - Date.now();
  if (diff <= 0) return { text: "AGORA", seconds: 0, isUrgent: true };
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600).toString().padStart(2, "0");
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return {
    text: `${h}:${m}:${s}`,
    seconds: totalSec,
    isUrgent: totalSec <= 60,
  };
}

function getElapsedTime(startedAt: string | null): string {
  if (!startedAt) return "—";
  const diff = Date.now() - new Date(startedAt).getTime();
  if (diff < 0) return "00:00";
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return h > 0 ? `${h.toString().padStart(2, "0")}:${m}:${s}` : `${m}:${s}`;
}

function getStatusCategory(status: string): "scheduled" | "in_progress" | "completed" | "failed" | "cancelled" {
  if (["scheduled", "ready", "waiting_operator"].includes(status)) return "scheduled";
  if (["dialing", "ringing", "answered", "in_progress"].includes(status)) return "in_progress";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "failed";
}

// ── Sound ──

function playAlertSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.3);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.1);
    osc2.start(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 1.1);
  } catch {
    // Audio context not available
  }
}

// ── History Status Badge ──

function HistoryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    completed: { label: "✅ Atendida", className: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" },
    no_answer: { label: "📵 N/Atendeu", className: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800" },
    busy: { label: "🔴 Ocupado", className: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800" },
    voicemail: { label: "📬 Cx. Postal", className: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" },
    failed: { label: "❌ Falhou", className: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800" },
    cancelled: { label: "⛔ Cancelada", className: "text-muted-foreground bg-muted border-border" },
    timeout: { label: "⏱️ Timeout", className: "text-muted-foreground bg-muted border-border" },
    max_attempts_exceeded: { label: "🚫 Esgotado", className: "text-red-800 bg-red-100 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800" },
  };
  const cfg = map[status] || { label: status, className: "text-muted-foreground" };
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs whitespace-nowrap", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

// ── In-Progress Status Badge ──

function InProgressStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    dialing: { label: "🔵 Discando", className: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" },
    ringing: { label: "🟡 Chamando", className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" },
    answered: { label: "🟢 Em Linha", className: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" },
    in_progress: { label: "🟢 Em Linha", className: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800" },
  };
  const cfg = map[status] || { label: status, className: "text-muted-foreground" };
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs whitespace-nowrap", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

// ── Main Component ──

export default function CallPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(() =>
    searchParams.get("tab") || "queue"
  );
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [historyOperatorFilter, setHistoryOperatorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [, setTick] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  // Dialogs
  const [rescheduleEntry, setRescheduleEntry] = useState<CallPanelEntry | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [cancelEntry, setCancelEntry] = useState<CallPanelEntry | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionEntry, setActionEntry] = useState<CallPanelEntry | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [editOperatorEntry, setEditOperatorEntry] = useState<CallPanelEntry | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [showCreateQueue, setShowCreateQueue] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [showRemoveFromQueue, setShowRemoveFromQueue] = useState(false);
  const [viewingQueueLead, setViewingQueueLead] = useState<any | null>(null);

  const { campaigns } = useCallCampaigns();
  const { toast } = useToast();

  const { entries, stats, isLoading, delayCall, rescheduleCall, cancelCall, dialNow, registerAction, updateOperator, bulkUpdateOperator, bulkEnqueue } = useCallPanel({
    campaignId: campaignFilter !== "all" ? campaignFilter : undefined,
    search: searchQuery || undefined,
  });

  const callQueue = useCallQueue({
    campaignFilter: campaignFilter !== "all" ? campaignFilter : undefined,
    searchQuery: searchQuery || undefined,
  });
  const { items: queueEntries, isLoading: queueLoading, totalWaiting, removeFromQueue, clearQueue, isClearingQueue, moveToEnd: sendToEndOfQueue, moveToStart: sendToStartOfQueue } = callQueue;
  const { operators, isLoading: operatorsLoading, refetch: refetchOperators } = useCallOperators();
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false);
  const queryClient = useQueryClient();

  // ── Remove scheduled call_log (cancel it) ──
  const removeScheduledLog = useCallback(async (compositeId: string) => {
    const realId = compositeId.startsWith("cl_") ? compositeId.slice(3) : compositeId;
    const { error } = await (supabase as any)
      .from("call_logs")
      .update({ call_status: "cancelled", ended_at: new Date().toISOString() })
      .eq("id", realId);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Removido da fila" });
      queryClient.invalidateQueries({ queryKey: ["call_logs_queue"] });
      queryClient.invalidateQueries({ queryKey: ["call_queue"] });
    }
  }, [toast, queryClient]);

  // ── Move call_log to start/end by adjusting scheduled_for ──
  const moveScheduledLogToStart = useCallback(async (compositeId: string) => {
    const realId = compositeId.startsWith("cl_") ? compositeId.slice(3) : compositeId;
    const earliest = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { error } = await (supabase as any)
      .from("call_logs")
      .update({ scheduled_for: earliest })
      .eq("id", realId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["call_logs_queue"] });
    }
  }, [toast, queryClient]);

  const moveScheduledLogToEnd = useCallback(async (compositeId: string) => {
    const realId = compositeId.startsWith("cl_") ? compositeId.slice(3) : compositeId;
    const latest = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await (supabase as any)
      .from("call_logs")
      .update({ scheduled_for: latest })
      .eq("id", realId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["call_logs_queue"] });
    }
  }, [toast, queryClient]);

  const handleRefreshQueue = useCallback(async () => {
    setIsRefreshingQueue(true);
    try {
      await refetchOperators();
    } finally {
      setIsRefreshingQueue(false);
    }
  }, [refetchOperators]);

  // 1-second tick for countdowns
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Notification permission
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  }, []);

  const requestNotifications = useCallback(async () => {
    setSoundEnabled(true);
    try {
      if (typeof Notification !== "undefined") {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          setNotificationsEnabled(true);
        }
      }
    } catch {
      // Notification API blocked
    }
  }, []);

  // Alert when call is <= 60s away
  useEffect(() => {
    entries.forEach((entry) => {
      if (!["scheduled", "ready"].includes(entry.callStatus)) return;
      const { seconds, isUrgent } = getTimeRemaining(entry.scheduledFor);
      if (isUrgent && seconds <= 60 && !notifiedRef.current.has(entry.id)) {
        notifiedRef.current.add(entry.id);
        if (soundEnabled) playAlertSound();
        if (notificationsEnabled && typeof Notification !== "undefined") {
          new Notification("📞 Ligação em instantes", {
            body: `${entry.leadName || "Lead"} - ${formatPhone(entry.leadPhone)}`,
            tag: entry.id,
          });
        }
      }
    });
  }, [entries, soundEnabled, notificationsEnabled]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, campaignFilter, searchQuery, itemsPerPage, historyStatusFilter, historyOperatorFilter, dateFrom, dateTo]);

  // Remove tab param from URL on mount
  useEffect(() => {
    if (searchParams.get("tab")) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("tab");
      setSearchParams(newParams, { replace: true });
    }
  }, []);

  // ── Answered today query ──
  const { user } = useAuth();
  const { activeCompanyId, isAdmin } = useCompany();

  // ── In-progress entries (filtered by operator for non-admins) ──
  const myOperator = useMemo(() => {
    if (!user || isAdmin) return null;
    return operators.find(op => op.userId === user.id) || null;
  }, [operators, user, isAdmin]);

  const inProgressEntries = useMemo(() => {
    const all = entries.filter(e => ["dialing", "ringing", "answered", "in_progress"].includes(e.callStatus));
    if (myOperator) {
      return all.filter(e => !e.operatorId || e.operatorId === myOperator.id);
    }
    return all;
  }, [entries, myOperator]);

  // ── "Ligar a Seguir" — inserts lead at top of queue ──
  const handleDialNext = useCallback(async (entry: { leadId?: string | null; leadName?: string | null; leadPhone?: string | null; campaignId?: string | null; phone?: string | null }) => {
    const phone = entry.leadPhone || entry.phone;
    const campaignId = entry.campaignId;
    if (!phone || !campaignId || !user) {
      toast({ title: "Dados insuficientes", description: "Telefone ou campanha ausente.", variant: "destructive" });
      return;
    }
    const { data: existing } = await supabase
      .from("call_queue")
      .select("id, position")
      .eq("campaign_id", campaignId)
      .eq("status", "waiting")
      .order("position", { ascending: true });
    if (existing?.length) {
      for (const item of existing) {
        await supabase.from("call_queue").update({ position: item.position + 1 }).eq("id", item.id);
      }
    }
    const { error } = await supabase.from("call_queue").insert({
      user_id: user.id,
      company_id: activeCompanyId || undefined,
      campaign_id: campaignId,
      lead_id: entry.leadId || undefined,
      lead_name: entry.leadName || undefined,
      phone,
      position: 0,
      status: "waiting",
      source: "manual",
    } as any);
    if (error) {
      toast({ title: "Erro ao enfileirar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ Lead adicionado ao topo da fila", description: `${entry.leadName || phone} será discado em seguida.` });
      queryClient.invalidateQueries({ queryKey: ["call_queue"] });
    }
  }, [user, activeCompanyId, toast, queryClient]);
  const todayStr = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const { data: answeredEntries = [], isLoading: answeredLoading } = useQuery({
    queryKey: ["call_panel_answered_today", campaignFilter, searchQuery, activeCompanyId, todayStr],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_logs")
        .select("*, call_leads(name, phone, attempts), call_campaigns(name, is_priority), call_operators(operator_name, extension), call_script_actions(name, color)")
        .eq("call_status", "completed")
        .not("started_at", "is", null)
        .gte("created_at", todayStr)
        .order("ended_at", { ascending: false, nullsFirst: false })
        .limit(500);

      if (activeCompanyId) query = query.eq("company_id", activeCompanyId);
      if (campaignFilter !== "all") query = query.eq("campaign_id", campaignFilter);

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []).map((db: any) => ({
        id: db.id,
        campaignId: db.campaign_id,
        campaignName: db.call_campaigns?.name || null,
        leadId: db.lead_id,
        leadName: db.call_leads?.name || null,
        leadPhone: db.call_leads?.phone || null,
        operatorId: db.operator_id,
        operatorName: db.call_operators?.operator_name || null,
        callStatus: db.call_status || "unknown",
        createdAt: db.created_at || new Date().toISOString(),
        endedAt: db.ended_at,
        startedAt: db.started_at,
        durationSeconds: db.duration_seconds,
        isPriority: db.call_campaigns?.is_priority ?? false,
        actionName: db.call_script_actions?.name || null,
        actionColor: db.call_script_actions?.color || null,
      }));

      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        const sDigits = s.replace(/\D/g, "");
        results = results.filter((e: any) => {
          const nameMatch = e.leadName?.toLowerCase().includes(s);
          const phoneDigits = (e.leadPhone || "").replace(/\D/g, "");
          const phoneMatch = sDigits ? phoneDigits.includes(sDigits) : false;
          return nameMatch || phoneMatch;
        });
      }

      return results;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // ── Scheduled/Ready call_logs for Queue tab ──
  const { data: scheduledCallLogs = [], isLoading: scheduledLogsLoading } = useQuery({
    queryKey: ["call_logs_queue", campaignFilter, searchQuery, activeCompanyId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_logs")
        .select("*, call_leads(name, phone, attempts), call_campaigns(name, is_priority)")
        .in("call_status", ["scheduled", "ready"])
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .limit(1000);

      if (activeCompanyId) query = query.eq("company_id", activeCompanyId);
      if (campaignFilter !== "all") query = query.eq("campaign_id", campaignFilter);

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []).map((db: any, idx: number) => ({
        id: `cl_${db.id}`,
        realId: db.id,
        campaignId: db.campaign_id,
        campaignName: db.call_campaigns?.name || null,
        leadId: db.lead_id,
        leadName: db.call_leads?.name || null,
        phone: db.call_leads?.phone || null,
        isPriority: db.call_campaigns?.is_priority ?? false,
        status: db.call_status as string,
        scheduledFor: db.scheduled_for,
        attemptNumber: db.attempt_number || 1,
        maxAttempts: db.max_attempts || 3,
        position: 90000 + idx,
        observations: db.observations || null,
        source: "call_log" as const,
      }));

      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        const sDigits = s.replace(/\D/g, "");
        results = results.filter((e: any) => {
          const nameMatch = e.leadName?.toLowerCase().includes(s);
          const phoneDigits = (e.phone || "").replace(/\D/g, "");
          const phoneMatch = sDigits ? phoneDigits.includes(sDigits) : false;
          return nameMatch || phoneMatch;
        });
      }

      return results;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // ── Combined queue: call_queue + call_logs (scheduled/ready) ──
  const combinedQueue = useMemo(() => {
    // Map queueEntries to a uniform shape
    const fromQueue = queueEntries.map((q) => ({
      id: q.id,
      realId: q.id,
      campaignId: q.campaignId,
      campaignName: q.campaignName || null,
      leadId: q.leadId || null,
      leadName: q.leadName || null,
      phone: q.phone,
      isPriority: q.isPriority ?? false,
      status: q.status || "waiting",
      scheduledFor: null,
      attemptNumber: q.attemptNumber ?? 1,
      maxAttempts: q.maxAttempts ?? 3,
      position: q.position ?? 99999,
      observations: q.observations || null,
      source: "call_queue" as const,
    }));

    // Deduplicate: remove call_logs entries whose lead_id already exists in call_queue
    const queueLeadIds = new Set(fromQueue.filter(q => q.leadId).map(q => q.leadId));
    const fromLogs = scheduledCallLogs.filter((cl: any) => !cl.leadId || !queueLeadIds.has(cl.leadId));

    const combined = [...fromQueue, ...fromLogs];

    // Sort: scheduled first (by scheduled_for), then priority, then position
    combined.sort((a, b) => {
      // Scheduled items first
      const aScheduled = !!a.scheduledFor;
      const bScheduled = !!b.scheduledFor;
      if (aScheduled && !bScheduled) return -1;
      if (!aScheduled && bScheduled) return 1;
      if (aScheduled && bScheduled) {
        const diff = new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime();
        if (diff !== 0) return diff;
      }
      // Priority next
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      // Then by position
      return (a.position ?? 99999) - (b.position ?? 99999);
    });

    return combined;
  }, [queueEntries, scheduledCallLogs]);

  const combinedQueueCount = combinedQueue.length;

  // ── History query ──
  const HISTORY_STATUSES = ["completed", "no_answer", "busy", "voicemail", "failed", "cancelled", "timeout", "max_attempts_exceeded"];

  const { data: historyEntries = [], isLoading: historyLoading } = useQuery({
    queryKey: ["call_panel_history", campaignFilter, searchQuery, dateFrom?.toISOString(), dateTo?.toISOString(), activeCompanyId, historyStatusFilter, historyOperatorFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_logs")
        .select("*, call_leads(name, phone, attempts), call_campaigns(name, is_priority), call_operators(operator_name, extension)")
        .order("ended_at", { ascending: false, nullsFirst: false })
        .limit(500);

      if (historyStatusFilter !== "all") {
        query = query.eq("call_status", historyStatusFilter);
      } else {
        query = query.in("call_status", HISTORY_STATUSES);
      }

      if (activeCompanyId) query = query.eq("company_id", activeCompanyId);
      if (campaignFilter !== "all") query = query.eq("campaign_id", campaignFilter);
      if (historyOperatorFilter !== "all") query = query.eq("operator_id", historyOperatorFilter);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        query = query.gte("created_at", from.toISOString());
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        query = query.lte("created_at", to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []).map((db: any) => ({
        id: db.id,
        campaignId: db.campaign_id,
        campaignName: db.call_campaigns?.name || null,
        leadId: db.lead_id,
        leadName: db.call_leads?.name || null,
        leadPhone: db.call_leads?.phone || null,
        operatorId: db.operator_id,
        operatorName: db.call_operators?.operator_name || null,
        callStatus: db.call_status || "unknown",
        createdAt: db.created_at || new Date().toISOString(),
        endedAt: db.ended_at,
        startedAt: db.started_at,
        durationSeconds: db.duration_seconds,
        isPriority: db.call_campaigns?.is_priority ?? false,
      }));

      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        const sDigits = s.replace(/\D/g, "");
        results = results.filter((e: any) => {
          const nameMatch = e.leadName?.toLowerCase().includes(s);
          const phoneDigits = (e.leadPhone || "").replace(/\D/g, "");
          const phoneMatch = sDigits ? phoneDigits.includes(sDigits) : false;
          return nameMatch || phoneMatch;
        });
      }

      return results;
    },
    enabled: !!user && activeTab === "history",
    refetchInterval: 10000,
  });

  // ── Counts for tabs ──
  const availableOps = operators.filter(op => op.status === "available").length;
  const totalActiveOps = operators.filter(op => ["available", "on_call", "cooldown"].includes(op.status)).length;

  // Queue pagination (using combinedQueue)
  const queueTotalPages = Math.ceil(combinedQueue.length / itemsPerPage);
  const paginatedQueue = combinedQueue.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // History pagination
  const historyTotalPages = Math.ceil(historyEntries.length / itemsPerPage);
  const paginatedHistory = historyEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Answered pagination
  const answeredTotalPages = Math.ceil(answeredEntries.length / itemsPerPage);
  const paginatedAnswered = answeredEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Handlers
  const handleReschedule = async () => {
    if (!rescheduleEntry || !rescheduleDate || !rescheduleTime) return;
    await rescheduleCall({ callId: rescheduleEntry.id, scheduledFor: new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString() });
    setRescheduleEntry(null);
  };
  const handleCancel = async () => {
    if (!cancelEntry) return;
    await cancelCall({ callId: cancelEntry.id, reason: cancelReason || undefined });
    setCancelEntry(null);
    setCancelReason("");
  };

  const handleRescheduleQuick = (minutes: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    setRescheduleDate(format(now, "yyyy-MM-dd"));
    setRescheduleTime(format(now, "HH:mm"));
  };

  const openRescheduleDialog = (entry: CallPanelEntry) => {
    setRescheduleEntry(entry);
    const now = new Date();
    setRescheduleDate(format(now, "yyyy-MM-dd"));
    setRescheduleTime(format(new Date(now.getTime() + 30 * 60000), "HH:mm"));
  };

  const openActionDialog = (entry: CallPanelEntry) => {
    setActionEntry(entry);
    setActionNotes(entry.observations || "");
  };

  const openEditOperator = (entry: CallPanelEntry) => {
    setEditOperatorEntry(entry);
    setSelectedOperatorId(entry.operatorId || "");
  };

  const [panelTab, setPanelTab] = useState("calls");

  // Queue status helpers
  const queueGlobalStatus = callQueue.globalStatus;
  const queueSummary = callQueue.summary;

  const statusConfig: Record<string, { label: string; dotClass: string; className: string }> = {
    running: { label: "🟢 Fila Ativa", dotClass: "bg-emerald-500 animate-pulse", className: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400" },
    paused: { label: "⏸️ Fila Pausada", dotClass: "bg-amber-500", className: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400" },
    stopped: { label: "⏹️ Fila Parada", dotClass: "bg-muted-foreground", className: "bg-muted border-border text-muted-foreground" },
    mixed: { label: "🔀 Fila Mista", dotClass: "bg-blue-500 animate-pulse", className: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400" },
  };

  // Next in queue info
  const nextInQueue = combinedQueue[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <PhoneCall className="h-6 w-6 text-primary" />
            Painel de Ligações
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie todas as ligações em tempo real</p>
        </div>
        {!soundEnabled ? (
          <Button variant="outline" size="sm" onClick={requestNotifications}>
            <Bell className="h-4 w-4 mr-2" />
            Ativar Alertas
          </Button>
        ) : (
          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-300">
            <Bell className="h-3 w-3" />
            {notificationsEnabled ? "Alertas e notificações ativos" : "Alertas sonoros ativos"}
          </Badge>
        )}
      </div>

      {/* Embedded Operator Popup */}
      <CallPopup embedded />

      {/* Panel Tabs */}
      <Tabs value={panelTab} onValueChange={setPanelTab}>
        <TabsList>
          <TabsTrigger value="calls" className="gap-2">
            <Phone className="h-4 w-4" /> Ligações
          </TabsTrigger>
          <TabsTrigger value="operators" className="gap-2">
            <Users className="h-4 w-4" /> Operadores
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <SettingsIcon className="h-4 w-4" /> Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operators" className="mt-6">
          <OperatorsPanel />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="text-center py-12 text-muted-foreground">
            Configurações gerais de telefonia (em breve)
          </div>
        </TabsContent>

        <TabsContent value="calls" className="mt-6">
          <div className="space-y-6">

      {/* ═══════ STATUS METRICS ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setActiveTab("queue")}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-amber-500/10 p-2">
              <ListOrdered className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{combinedQueueCount}</p>
              <p className="text-xs text-muted-foreground">Na Fila</p>
              {combinedQueueCount > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  ⚡{combinedQueue.filter(q => q.isPriority).length} prioritárias · 📋{combinedQueue.filter(q => !q.isPriority).length} normais
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setActiveTab("in_progress")}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-blue-500/10 p-2">
              <Phone className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressEntries.length}</p>
              <p className="text-xs text-muted-foreground">Em Andamento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => setActiveTab("answered")}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-emerald-500/10 p-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{answeredEntries.length}</p>
              <p className="text-xs text-muted-foreground">Atendidas (hoje)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-md bg-primary/10 p-2">
              <Headset className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{availableOps}</p>
              <p className="text-xs text-muted-foreground">
                Operadores disponíveis
                {totalActiveOps > availableOps && ` / ${totalActiveOps} online`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════ CONTROLS ═══════ */}
      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">CONTROLES DA FILA</h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Start / Pause / Resume / Stop */}
              {queueGlobalStatus === "stopped" && combinedQueueCount > 0 && (
                <Button size="sm" onClick={() => { const first = combinedQueue[0]; if (first) callQueue.startQueue(first.campaignId); }} disabled={callQueue.isStarting} className="gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  {callQueue.isStarting ? "Iniciando..." : "Iniciar Fila"}
                </Button>
              )}
              {(queueGlobalStatus === "running" || queueGlobalStatus === "mixed") && (
                <>
                  <Button variant="outline" size="sm" onClick={() => callQueue.pauseAll()} disabled={callQueue.isPausingAll} className="gap-1.5">
                    <Pause className="h-3.5 w-3.5" />
                    {callQueue.isPausingAll ? "Pausando..." : "Pausar"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { const first = combinedQueue[0]; if (first) callQueue.stopQueue(first.campaignId); }} disabled={callQueue.isStopping} className="gap-1.5">
                    <Square className="h-3.5 w-3.5" />
                    Parar
                  </Button>
                </>
              )}
              {queueGlobalStatus === "paused" && (
                <>
                  <Button size="sm" onClick={() => callQueue.resumeAll()} disabled={callQueue.isResumingAll} className="gap-1.5">
                    <Play className="h-3.5 w-3.5" />
                    {callQueue.isResumingAll ? "Retomando..." : "Retomar"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { const first = combinedQueue[0]; if (first) callQueue.stopQueue(first.campaignId); }} disabled={callQueue.isStopping} className="gap-1.5">
                    <Square className="h-3.5 w-3.5" />
                    Parar
                  </Button>
                </>
              )}
              {(queueGlobalStatus === "mixed") && (
                <Button variant="outline" size="sm" onClick={() => callQueue.resumeAll()} disabled={callQueue.isResumingAll} className="gap-1.5">
                  <Play className="h-3.5 w-3.5" />
                  Retomar
                </Button>
              )}

              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreateQueue(true)}>
                <Plus className="h-3.5 w-3.5" /> Adicionar à Fila
              </Button>

              {combinedQueueCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRemoveFromQueue(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover da Fila
                </Button>
              )}

              <Button variant="ghost" size="sm" onClick={handleRefreshQueue} disabled={isRefreshingQueue} className="gap-1.5">
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshingQueue && "animate-spin")} />
                Atualizar
              </Button>

              {combinedQueueCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClearConfirmOpen(true)}
                  disabled={isClearingQueue}
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isClearingQueue ? "Esvaziando..." : "Limpar Tudo"}
                </Button>
              )}
            </div>
          </div>

          {/* Queue Status Banner */}
          {(queueGlobalStatus !== "stopped" || combinedQueueCount > 0) && (
            <div className={cn("flex items-center gap-3 rounded-lg border px-4 py-2", statusConfig[queueGlobalStatus]?.className || statusConfig.stopped.className)}>
              <span className={cn("h-2 w-2 rounded-full shrink-0", statusConfig[queueGlobalStatus]?.dotClass || statusConfig.stopped.dotClass)} />
              <span className="text-sm font-medium">{statusConfig[queueGlobalStatus]?.label || "Parada"}</span>
              {nextInQueue && (
                <span className="text-xs opacity-75 ml-2">
                  Próximo: {nextInQueue.leadName || "Sem nome"} {nextInQueue.isPriority ? "⚡" : ""} ({nextInQueue.campaignName || "—"})
                </span>
              )}
              <div className="flex-1" />
              <Badge
                variant={availableOps > 0 ? "default" : "destructive"}
                className={cn("shrink-0 gap-1 text-xs", availableOps > 0
                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400"
                  : ""
                )}
              >
                <Headset className="h-3 w-3" />
                {availableOps} disponíve{availableOps === 1 ? "l" : "is"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clear queue confirm */}
      <ClearAllQueueDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        campaignFilter={campaignFilter}
      />

      {/* Remove from queue dialog */}
      <RemoveFromQueueDialog
        open={showRemoveFromQueue}
        onOpenChange={setShowRemoveFromQueue}
      />

      {/* ═══════ 4 TABS ═══════ */}
      <div className="space-y-3">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="🔍 Buscar por nome ou telefone..."
            className="max-w-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Campanha" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as campanhas</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* History-specific filters */}
          {activeTab === "history" && (
            <>
              <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="completed">✅ Atendida</SelectItem>
                  <SelectItem value="no_answer">📵 Não Atendeu</SelectItem>
                  <SelectItem value="busy">🔴 Ocupado</SelectItem>
                  <SelectItem value="failed">❌ Falhou</SelectItem>
                  <SelectItem value="cancelled">⛔ Cancelada</SelectItem>
                  <SelectItem value="voicemail">📬 Caixa Postal</SelectItem>
                  <SelectItem value="timeout">⏱️ Timeout</SelectItem>
                </SelectContent>
              </Select>
              <Select value={historyOperatorFilter} onValueChange={setHistoryOperatorFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Operador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os operadores</SelectItem>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>{op.operatorName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[260px] justify-start text-left font-normal", !dateFrom && !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom && dateTo
                      ? `${format(dateFrom, "dd/MM/yyyy")} — ${format(dateTo, "dd/MM/yyyy")}`
                      : dateFrom
                      ? `${format(dateFrom, "dd/MM/yyyy")} — ...`
                      : "📅 Filtrar período"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 space-y-3">
                    <div className="flex gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Início</Label>
                        <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-2 pointer-events-auto" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Fim</Label>
                        <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-2 pointer-events-auto" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => { const today = new Date(); setDateFrom(today); setDateTo(today); }}>Hoje</Button>
                      <Button variant="outline" size="sm" onClick={() => { const y = new Date(); y.setDate(y.getDate() - 1); setDateFrom(y); setDateTo(y); }}>Ontem</Button>
                      <Button variant="outline" size="sm" onClick={() => { const d = new Date(); const w = new Date(); w.setDate(w.getDate() - 7); setDateFrom(w); setDateTo(d); }}>7 dias</Button>
                      <Button variant="outline" size="sm" onClick={() => { const d = new Date(); setDateFrom(new Date(d.getFullYear(), d.getMonth(), 1)); setDateTo(d); }}>Este mês</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Limpar</Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>

        {/* Tab Triggers */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="queue" className="flex-1 min-w-[100px] gap-1">
              📋 Fila ({combinedQueueCount})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="flex-1 min-w-[100px] gap-1">
              📞 Em Andamento ({inProgressEntries.length})
            </TabsTrigger>
            <TabsTrigger value="answered" className="flex-1 min-w-[100px] gap-1">
              ✅ Atendidas ({answeredEntries.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 min-w-[100px] gap-1">
              📊 Histórico
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ═══════ TAB CONTENT ═══════ */}

      {/* ── Aba Fila ── */}
      {activeTab === "queue" && (
        (queueLoading || scheduledLogsLoading) ? (
          <div className="text-center py-12 text-muted-foreground">Carregando fila...</div>
        ) : paginatedQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <ListOrdered className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Nenhum lead na fila</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Crie uma fila selecionando leads das suas campanhas com filtros.</p>
            <Button className="mt-6" onClick={() => setShowCreateQueue(true)}>
              <Plus className="h-4 w-4 mr-1" /> Criar Fila de Ligações
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden md:table-cell">Telefone</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="hidden md:table-cell w-[90px]">Tentativa</TableHead>
                  <TableHead className="hidden lg:table-cell w-[100px]">Agendado</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedQueue.map((qe, idx) => {
                  const hasSchedule = !!qe.scheduledFor;
                  const icon = qe.isPriority ? "⚡" : "";
                  const isFromCallLog = qe.source === "call_log";
                  return (
                    <TableRow key={qe.id} className={cn(
                      qe.isPriority && "bg-amber-500/5",
                      qe.status === "in_call" && "bg-blue-500/5"
                    )}>
                      <TableCell className="font-mono text-xs text-muted-foreground py-2">
                        {icon && <span className="mr-1">{icon}</span>}
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{qe.leadName || "Sem nome"}</span>
                          {qe.status === "in_call" && (
                            <Badge variant="outline" className="gap-1 text-xs bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                              🔄 Em Ligação
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground py-2">
                        {formatPhone(qe.phone || "")}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-xs text-muted-foreground truncate block max-w-[160px] flex items-center gap-1">
                          {qe.isPriority && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                          {qe.campaignName || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center py-2">
                        <span className="text-xs font-mono">{qe.attemptNumber}/{qe.maxAttempts || 3}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell py-2">
                        {hasSchedule ? (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(qe.scheduledFor!), "HH:mm")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setViewingQueueLead(qe)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver detalhes</TooltipContent>
                          </Tooltip>
                          {!isFromCallLog && (
                            <>
                              {qe.status !== "in_call" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                      onClick={() => sendToStartOfQueue(qe.id)}
                                    >
                                      <Phone className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Mover para o início</TooltipContent>
                                </Tooltip>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {qe.status !== "in_call" && (
                                    <>
                                      <DropdownMenuItem onClick={() => sendToStartOfQueue(qe.id)}>
                                        <ChevronsUp className="h-4 w-4 mr-2" /> Para o início
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => sendToEndOfQueue(qe.id)}>
                                        <ChevronsDown className="h-4 w-4 mr-2" /> Para o final
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      if (qe.status === "in_call" && qe.callLogId) {
                                        setCancelEntry({
                                          id: qe.callLogId,
                                          leadName: qe.leadName || null,
                                          leadPhone: qe.phone || null,
                                          callStatus: "in_progress",
                                          operatorId: qe.operatorId || null,
                                          operatorName: qe.operatorName || null,
                                          operatorExtension: null,
                                          campaignId: qe.campaignId,
                                          campaignName: qe.campaignName || null,
                                          leadId: qe.leadId || null,
                                          scheduledFor: null,
                                          startedAt: null,
                                          endedAt: null,
                                          durationSeconds: null,
                                          notes: null,
                                          actionId: null,
                                          externalCallId: null,
                                          createdAt: new Date().toISOString(),
                                          leadAttempts: 0,
                                          audioUrl: null,
                                          attemptNumber: qe.attemptNumber || 1,
                                          maxAttempts: qe.maxAttempts || 1,
                                          isPriority: qe.isPriority || false,
                                          observations: qe.observations || null,
                                        });
                                      } else {
                                        removeFromQueue(qe.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Remover da fila
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                          {isFromCallLog && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-primary"
                                    onClick={() => moveScheduledLogToStart(qe.id)}
                                  >
                                    <Phone className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mover para o início</TooltipContent>
                              </Tooltip>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => moveScheduledLogToStart(qe.id)}>
                                    <ChevronsUp className="h-4 w-4 mr-2" /> Para o início
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => moveScheduledLogToEnd(qe.id)}>
                                    <ChevronsDown className="h-4 w-4 mr-2" /> Para o final
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeScheduledLog(qe.id)}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Remover
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      )}

      {/* ── Aba Em Andamento (Cards) ── */}
      {activeTab === "in_progress" && (
        isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : inProgressEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Phone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Nenhuma ligação em andamento</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">As ligações ativas aparecerão aqui em tempo real.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {inProgressEntries.map((entry) => (
              <Card key={entry.id} className={cn(
                "transition-shadow hover:shadow-md",
                entry.callStatus === "answered" || entry.callStatus === "in_progress"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : entry.callStatus === "ringing"
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "border-blue-500/30 bg-blue-500/5"
              )}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base uppercase">{entry.leadName || "Sem nome"}</h4>
                      <p className="text-sm font-mono text-muted-foreground">{formatPhone(entry.leadPhone)}</p>
                    </div>
                    <InProgressStatusBadge status={entry.callStatus} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {entry.campaignName && (
                      <span className="flex items-center gap-1">
                        <FolderOpen className="h-3 w-3" />
                        {entry.isPriority && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                        {entry.campaignName}
                      </span>
                    )}
                    {entry.operatorName && (
                      <span className="flex items-center gap-1">
                        <Headset className="h-3 w-3" /> {entry.operatorName}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-mono font-semibold text-sm text-foreground">
                      <Timer className="h-3.5 w-3.5" /> {getElapsedTime(entry.startedAt)}
                    </span>
                  </div>
                  {entry.attemptNumber > 0 && (
                    <p className="text-xs text-muted-foreground">Tentativa {entry.attemptNumber}/{entry.maxAttempts || "∞"}</p>
                  )}
                  <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setViewingQueueLead({
                            campaignId: entry.campaignId,
                            leadId: entry.leadId,
                            leadName: entry.leadName,
                            phone: entry.leadPhone,
                            campaignName: entry.campaignName,
                            attemptNumber: entry.attemptNumber,
                            maxAttempts: entry.maxAttempts,
                            isPriority: entry.isPriority,
                            observations: entry.observations,
                          })}
                        >
                          <Eye className="h-3.5 w-3.5" /> Detalhes
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver detalhes</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleDialNext(entry)}
                        >
                          <Phone className="h-3.5 w-3.5" /> Ligar a Seguir
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Adicionar ao topo da fila</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setCancelEntry(entry)}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancelar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cancelar ligação</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ── Aba Atendidas (hoje) ── */}
      {activeTab === "answered" && (
        answeredLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando atendidas...</div>
        ) : paginatedAnswered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Nenhuma ligação atendida hoje</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">As ligações atendidas de hoje aparecerão aqui.</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden md:table-cell">Telefone</TableHead>
                  <TableHead className="hidden lg:table-cell">Campanha</TableHead>
                  <TableHead className="hidden md:table-cell">Operador</TableHead>
                  <TableHead className="w-[80px]">Duração</TableHead>
                  <TableHead className="hidden lg:table-cell">Ação</TableHead>
                  <TableHead className="w-[90px]">Horário</TableHead>
                  <TableHead className="w-[90px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAnswered.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="py-2">
                      <span className="text-sm font-medium truncate block max-w-[150px]">
                        {entry.leadName || "Sem nome"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground py-2">
                      {formatPhone(entry.leadPhone)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-2">
                      <span className="text-xs text-muted-foreground truncate block max-w-[160px] flex items-center gap-1">
                        {entry.isPriority && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                        {entry.campaignName || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className="text-xs truncate block max-w-[90px]">{entry.operatorName || "Auto"}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {entry.durationSeconds != null && entry.durationSeconds > 0
                          ? `${Math.floor(entry.durationSeconds / 60).toString().padStart(2, "0")}:${(entry.durationSeconds % 60).toString().padStart(2, "0")}`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-2">
                      {entry.actionName ? (
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.actionColor || "#10b981" }} />
                          <span className="text-xs truncate block max-w-[100px]">{entry.actionName}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {entry.endedAt ? format(new Date(entry.endedAt), "HH:mm") : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setViewingQueueLead({
                              campaignId: entry.campaignId,
                              leadId: entry.leadId,
                              leadName: entry.leadName,
                              phone: entry.leadPhone,
                              campaignName: entry.campaignName,
                              attemptNumber: 0,
                              maxAttempts: 3,
                              isPriority: entry.isPriority,
                            })}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalhes</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleDialNext(entry)}>
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ligar a Seguir</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}

      {/* ── Aba Histórico ── */}
      {activeTab === "history" && (
        historyLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando histórico...</div>
        ) : paginatedHistory.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum registro no histórico.</div>
        ) : (
          <div className="rounded-lg border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[160px]">Entrada</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden md:table-cell w-[140px]">Telefone</TableHead>
                  <TableHead className="hidden lg:table-cell w-[180px]">Campanha</TableHead>
                  <TableHead className="hidden md:table-cell w-[80px]">Duração</TableHead>
                  <TableHead className="hidden md:table-cell w-[100px]">Operador</TableHead>
                  <TableHead className="w-[90px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedHistory.map((entry: any) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground font-mono py-2">
                      {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="py-2">
                      <HistoryStatusBadge status={entry.callStatus} />
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm font-medium truncate block max-w-[150px]">
                        {entry.leadName || "Sem nome"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground py-2">
                      {formatPhone(entry.leadPhone)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-2">
                      <span className="text-xs text-muted-foreground truncate block max-w-[160px] flex items-center gap-1">
                        {entry.isPriority && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                        {entry.campaignName || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {entry.durationSeconds != null && entry.durationSeconds > 0
                          ? `${Math.floor(entry.durationSeconds / 60).toString().padStart(2, "0")}:${(entry.durationSeconds % 60).toString().padStart(2, "0")}`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-2">
                      <span className="text-xs truncate block max-w-[90px]">{entry.operatorName || "Auto"}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setViewingQueueLead({
                              campaignId: entry.campaignId,
                              leadId: entry.leadId,
                              leadName: entry.leadName,
                              phone: entry.leadPhone,
                              campaignName: entry.campaignName,
                              attemptNumber: 0,
                              maxAttempts: 3,
                              isPriority: entry.isPriority,
                            })}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalhes</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleDialNext(entry)}>
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ligar a Seguir</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      )}

      {/* Pagination */}
      {(() => {
        const totalItems = activeTab === "history" ? historyEntries.length
          : activeTab === "queue" ? combinedQueue.length
          : activeTab === "answered" ? answeredEntries.length
          : 0;
        const pages = Math.ceil(totalItems / itemsPerPage);
        const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        const endItem = Math.min(currentPage * itemsPerPage, totalItems);
        if (pages <= 1 && totalItems <= 25) return null;
        // In-progress tab doesn't paginate (usually few items)
        if (activeTab === "in_progress") return null;
        return (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Itens por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">
                ({startItem}-{endItem} de {totalItems})
              </span>
            </div>
            {pages > 1 && (
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">Página {currentPage} de {pages}</span>
                <Button variant="outline" size="sm" disabled={currentPage === pages} onClick={() => setCurrentPage((p) => p + 1)}>
                  Próxima <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleEntry} onOpenChange={(o) => !o && setRescheduleEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar Ligação</DialogTitle>
            <DialogDescription>
              {rescheduleEntry?.leadName} — {formatPhone(rescheduleEntry?.leadPhone || null)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data</Label>
                <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleRescheduleQuick(10)}>+10 min</Button>
              <Button variant="outline" size="sm" onClick={() => handleRescheduleQuick(30)}>+30 min</Button>
              <Button variant="outline" size="sm" onClick={() => handleRescheduleQuick(60)}>+1 hora</Button>
              <Button variant="outline" size="sm" onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setRescheduleDate(format(tomorrow, "yyyy-MM-dd"));
              }}>Amanhã</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRescheduleEntry(null)}>Cancelar</Button>
            <Button onClick={handleReschedule}>Reagendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={!!cancelEntry} onOpenChange={(o) => !o && setCancelEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Ligação</DialogTitle>
            <DialogDescription>
              {cancelEntry?.leadName} — {formatPhone(cancelEntry?.leadPhone || null)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Tem certeza que deseja cancelar esta ligação?</p>
            <div>
              <Label>Motivo (opcional)</Label>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Motivo do cancelamento..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelEntry(null)}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel}>Confirmar Cancelamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      {actionEntry && (
        <ActionDialog
          entry={actionEntry}
          notes={actionNotes}
          onNotesChange={setActionNotes}
          onClose={() => setActionEntry(null)}
          onSelect={async (actionId) => {
            await registerAction({ callId: actionEntry.id, actionId, notes: actionNotes || undefined });
            setActionEntry(null);
          }}
          onRescheduleConfirm={async (e, scheduledFor) => {
            await rescheduleCall({ callId: e.id, scheduledFor });
            setActionEntry(null);
          }}
        />
      )}

      {/* Edit Operator Dialog */}
      <EditOperatorDialog
        entry={editOperatorEntry}
        selectedOperatorId={selectedOperatorId}
        onSelectedChange={setSelectedOperatorId}
        onClose={() => setEditOperatorEntry(null)}
        onConfirm={async () => {
          if (!editOperatorEntry || !selectedOperatorId) return;
          await updateOperator({ callId: editOperatorEntry.id, operatorId: selectedOperatorId });
          setEditOperatorEntry(null);
        }}
      />

      <CreateQueueDialog
        open={showCreateQueue}
        onOpenChange={setShowCreateQueue}
        onStartQueue={async (cId) => {
          await callQueue.startQueue(cId);
          setActiveTab("queue");
        }}
      />

      {/* Lead Details Dialog - Full CallActionDialog */}
      {viewingQueueLead && (
        <CallActionDialog
          open={!!viewingQueueLead}
          onOpenChange={(open) => !open && setViewingQueueLead(null)}
          callId={viewingQueueLead.callLogId || ""}
          campaignId={viewingQueueLead.campaignId || ""}
          leadId={viewingQueueLead.leadId || ""}
          leadName={viewingQueueLead.leadName || "Sem nome"}
          leadPhone={viewingQueueLead.phone || ""}
          campaignName={viewingQueueLead.campaignName || "—"}
          duration={0}
          attemptNumber={viewingQueueLead.attemptNumber || 0}
          maxAttempts={viewingQueueLead.maxAttempts || 3}
          isPriority={viewingQueueLead.isPriority || false}
          callStatus="queued"
          initialObservations={viewingQueueLead.observations || ""}
          audioUrl={viewingQueueLead.audioUrl || null}
        />
      )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ──

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Action Dialog (Unified 2-tab layout) ──

function ActionDialog({
  entry,
  notes,
  onNotesChange,
  onClose,
  onSelect,
  onRescheduleConfirm,
}: {
  entry: CallPanelEntry;
  notes: string;
  onNotesChange: (v: string) => void;
  onClose: () => void;
  onSelect: (actionId: string) => Promise<void>;
  onRescheduleConfirm: (entry: CallPanelEntry, scheduledFor: string) => Promise<void>;
}) {
  const { actions, isLoading } = useCallActions(entry.campaignId || "");
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const hasScript = !!(entry.campaignId && entry.leadId);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(entry.leadName || "");
  const [localEntry, setLocalEntry] = useState(entry);

  const [showReschedule, setShowReschedule] = useState(false);
  const [localDate, setLocalDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [localTime, setLocalTime] = useState(() => format(new Date(Date.now() + 30 * 60000), "HH:mm"));
  const [rescheduling, setRescheduling] = useState(false);

  const handleQuickReschedule = (minutes: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    setLocalDate(format(d, "yyyy-MM-dd"));
    setLocalTime(format(d, "HH:mm"));
  };

  const handleConfirmReschedule = async () => {
    if (!localDate || !localTime) return;
    setRescheduling(true);
    try {
      await onRescheduleConfirm(entry, new Date(`${localDate}T${localTime}`).toISOString());
      onClose();
    } finally {
      setRescheduling(false);
    }
  };

  const handleSave = async () => {
    if (!selectedActionId) return;
    setSubmitting(true);
    try {
      await onSelect(selectedActionId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="bg-gradient-to-b from-primary/10 to-transparent border-b px-6 py-5 text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
              {(localEntry.leadName || "L")[0].toUpperCase()}
            </div>
          </div>
          {isEditingName ? (
            <Input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setEditName(localEntry.leadName || ""); setIsEditingName(false); } }}
              onBlur={async () => {
                const trimmed = editName.trim();
                if (trimmed && trimmed !== (localEntry.leadName || "")) {
                  if (localEntry.leadId) {
                    await (supabase as any).from("call_leads").update({ name: trimmed }).eq("id", localEntry.leadId);
                  }
                  setLocalEntry(prev => ({ ...prev, leadName: trimmed }));
                  toast({ title: "Nome atualizado" });
                } else {
                  setEditName(localEntry.leadName || "");
                }
                setIsEditingName(false);
              }}
              className="text-center text-2xl font-bold uppercase max-w-[300px] mx-auto"
            />
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-bold tracking-wide uppercase text-foreground">
                {localEntry.leadName || "Lead"}
              </h2>
              <button onClick={() => { setEditName(localEntry.leadName || ""); setIsEditingName(true); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <p className="text-lg font-mono text-primary">
            📞 {formatPhone(entry.leadPhone)}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {entry.campaignName && (
              <Badge variant="outline" className="text-xs">📁 {entry.campaignName}</Badge>
            )}
            {entry.attemptNumber != null && (
              <Badge variant="outline" className="text-xs">🔄 x{entry.attemptNumber}/{entry.maxAttempts || "∞"}</Badge>
            )}
            {entry.isPriority && <Badge variant="secondary" className="text-xs">⭐ Prioridade</Badge>}
            {entry.callStatus && (
              <Badge variant="outline" className="text-xs">📡 {entry.callStatus}</Badge>
            )}
          </div>
          {entry.externalCallId && (
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">
                🆔 {entry.externalCallId}
              </span>
              <button onClick={() => { navigator.clipboard.writeText(entry.externalCallId!); }} className="hover:text-primary transition-colors">
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
          {entry.durationSeconds != null && entry.durationSeconds > 0 && (
            <p className="text-2xl font-semibold font-mono text-emerald-500">
              ⏱️ {Math.floor(entry.durationSeconds / 60).toString().padStart(2, "0")}:{(entry.durationSeconds % 60).toString().padStart(2, "0")}
            </p>
          )}
          {entry.audioUrl && (
            <div className="mt-2 rounded-lg border border-border bg-background/50 p-2 mx-auto max-w-md">
              <p className="text-xs font-medium text-muted-foreground mb-1">🎧 Gravação</p>
              <audio controls className="w-full h-8" src={entry.audioUrl} preload="none">
                Seu navegador não suporta o player de áudio.
              </audio>
            </div>
          )}
        </div>

        <Tabs defaultValue="call" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-3 w-auto self-start">
            <TabsTrigger value="call" className="gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Ligação
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="call" className="flex-1 min-h-0 mt-0">
            <div className="h-[calc(90vh-380px)] overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {hasScript && (
                  <>
                    <div className="space-y-2">
                      <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">📋 Roteiro</span>
                      <div className="rounded-lg border bg-muted/10 p-3">
                        <InlineScriptRunner campaignId={entry.campaignId!} leadId={entry.leadId!} />
                      </div>
                    </div>
                    <div className="border-t" />
                  </>
                )}

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">🎯 Resultado da Ligação</h3>

                  <div className={cn(
                    "rounded-lg border transition-all",
                    showReschedule
                      ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40"
                      : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                  )}>
                    <button
                      onClick={() => setShowReschedule(!showReschedule)}
                      className="w-full text-left p-3"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="font-medium text-sm">Reagendar</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">A pessoa não pode falar agora</p>
                    </button>

                    {showReschedule && (
                      <div className="px-3 pb-3 space-y-3 border-t border-amber-200 dark:border-amber-700 pt-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Data</Label>
                            <Input type="date" value={localDate} onChange={(e) => setLocalDate(e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs">Horário</Label>
                            <Input type="time" value={localTime} onChange={(e) => setLocalTime(e.target.value)} className="mt-1" />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickReschedule(10)}>+10 min</Button>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickReschedule(30)}>+30 min</Button>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleQuickReschedule(60)}>+1 hora</Button>
                          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            setLocalDate(format(tomorrow, "yyyy-MM-dd"));
                          }}>Amanhã</Button>
                        </div>
                        <Button
                          className="w-full gap-1.5"
                          onClick={handleConfirmReschedule}
                          disabled={!localDate || !localTime || rescheduling}
                        >
                          <CalendarClock className="h-4 w-4" />
                          {rescheduling ? "Reagendando..." : "Confirmar Reagendamento"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Qual foi o resultado?</p>
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Carregando ações...</p>
                    ) : actions.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-3 bg-muted/20">
                        <p className="text-xs text-muted-foreground">
                          ⚠️ Nenhuma ação configurada para esta campanha. Configure ações na aba de configurações.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {actions.map((action) => (
                          <button
                            key={action.id}
                            onClick={() => setSelectedActionId(action.id)}
                            className={cn(
                              "rounded-lg border p-3 text-left transition-all",
                              selectedActionId === action.id
                                ? "border-primary bg-primary/5 ring-2 ring-primary"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full shrink-0"
                                style={{ backgroundColor: action.color }}
                              />
                              <span className="font-medium text-sm">{action.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">📝 Observações (opcional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => onNotesChange(e.target.value)}
                      placeholder="Anotações sobre a ligação..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 pb-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!selectedActionId || submitting}
                  >
                    {submitting ? "Salvando..." : "✅ Salvar e Encerrar"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="flex-1 min-h-0 mt-0">
            <div className="h-[calc(90vh-380px)] overflow-y-auto px-6 py-4">
              <LeadCallHistory leadId={entry.leadId} campaignId={entry.campaignId} currentLogId={entry.id} />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Lead Call History ──

function LeadCallHistory({ leadId, campaignId, currentLogId }: { leadId: string | null; campaignId: string | null; currentLogId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["call-lead-history", leadId, campaignId],
    enabled: !!leadId && !!campaignId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("call_logs")
        .select("*, call_script_actions(name, color), call_operators(operator_name)")
        .eq("lead_id", leadId)
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        call_status: string | null;
        created_at: string | null;
        started_at: string | null;
        ended_at: string | null;
        duration_seconds: number | null;
        notes: string | null;
        call_script_actions: { name: string; color: string } | null;
        call_operators: { operator_name: string } | null;
      }>;
    },
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusLabel = (status: string | null) => {
    const map: Record<string, string> = {
      scheduled: "Agendada", ready: "Pronta", waiting_operator: "Aguardando Operador", dialing: "Discando", ringing: "Tocando",
      answered: "Atendida", in_progress: "Em Ligação", completed: "Atendida",
      no_answer: "Não Atendeu", busy: "Ocupado", failed: "Falha",
      cancelled: "Cancelada", not_found: "Não Encontrada", voicemail: "Caixa Postal",
      timeout: "Tempo Esgotado",
    };
    return map[status || ""] || status || "—";
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Carregando histórico...</p>;
  }

  if (!history?.length) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Nenhum registro encontrado.</p>;
  }

  return (
    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
      {history.map((log, idx) => {
        const isCurrent = log.id === currentLogId;
        return (
          <div
            key={log.id}
            className={cn(
              "rounded-lg border p-3 space-y-1",
              isCurrent ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={isCurrent ? "default" : "secondary"} className="text-xs">
                  {isCurrent ? "Atual" : `#${history.length - idx}`}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getStatusLabel(log.call_status)}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {log.created_at ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm") : "—"}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground ml-1">
              {log.call_operators?.operator_name && (
                <span className="flex items-center gap-1">
                  <Headset className="h-3 w-3" /> {log.call_operators.operator_name}
                </span>
              )}
              {log.duration_seconds != null && log.duration_seconds > 0 && (
                <span className="flex items-center gap-1">
                  <Timer className="h-3 w-3" /> {formatDuration(log.duration_seconds)}
                </span>
              )}
              {log.call_script_actions && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: log.call_script_actions.color }} />
                  {log.call_script_actions.name}
                </span>
              )}
            </div>
            {log.notes && (
              <p className="text-xs text-muted-foreground mt-1 ml-1 italic">"{log.notes}"</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Edit Operator Dialog ──

function EditOperatorDialog({
  entry,
  selectedOperatorId,
  onSelectedChange,
  onClose,
  onConfirm,
}: {
  entry: CallPanelEntry | null;
  selectedOperatorId: string;
  onSelectedChange: (id: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { operators, isLoading } = useCallOperators();
  const [submitting, setSubmitting] = useState(false);
  const activeOperators = operators.filter((o) => o.isActive);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Trocar Operador</DialogTitle>
          <DialogDescription>
            {entry?.leadName} — {formatPhone(entry?.leadPhone || null)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando operadores...</p>
          ) : activeOperators.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum operador ativo nesta campanha.</p>
          ) : (
            <Select value={selectedOperatorId} onValueChange={onSelectedChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um operador" />
              </SelectTrigger>
              <SelectContent>
                {activeOperators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.operatorName}{op.extension ? ` • R. ${op.extension}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selectedOperatorId || submitting}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Operator Dialog ──

function BulkOperatorDialog({
  open,
  selectedOperatorId,
  onSelectedChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  selectedOperatorId: string;
  onSelectedChange: (id: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const { operators, isLoading } = useCallOperators();
  const [submitting, setSubmitting] = useState(false);
  const activeOperators = operators.filter((o) => o.isActive);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Atribuir Operador em Massa</DialogTitle>
          <DialogDescription>
            Selecione o operador para as ligações selecionadas
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando operadores...</p>
          ) : (
            <Select value={selectedOperatorId} onValueChange={onSelectedChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um operador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <span className="flex items-center gap-2">🤖 Auto (sem operador fixo)</span>
                </SelectItem>
                {activeOperators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>
                    {op.operatorName}{op.extension ? ` • R. ${op.extension}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Aplicando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
