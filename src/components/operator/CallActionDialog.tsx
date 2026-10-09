import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCallActions } from "@/hooks/useCallActions";
import { InlineScriptRunner } from "@/components/call-campaigns/operator/InlineScriptRunner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, Phone, PhoneMissed, ChevronDown, Clock, Copy, Check, History, ChevronLeft, ChevronRight, Pencil, X, Timer, FileText, CheckCircle2, RotateCcw, Target, PenLine, Maximize2, Minimize2, Minus, MessageSquare } from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";
import { useCallFloatingStore } from "@/stores/callFloating.store";
import { useChatExpressStore } from "@/stores/chatExpress.store";
import { addHours, format, setHours, setMinutes, addDays } from "date-fns";
import { InlineReschedule } from "./InlineReschedule";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useQueryClient } from "@tanstack/react-query";

interface CallDialogData {
  callId: string;
  campaignId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  campaignName: string;
  duration: number;
  notes: string;
  attemptNumber: number;
  maxAttempts: number;
  isPriority: boolean;
  callStatus?: string;
  externalCallId?: string | null;
  audioUrl?: string | null;
  userId?: string;
}

interface CallActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string;
  campaignId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  campaignName: string;
  duration: number;
  initialObservations?: string;
  attemptNumber: number;
  maxAttempts: number;
  isPriority: boolean;
  callStatus?: string;
  externalCallId?: string | null;
  audioUrl?: string | null;
  operatorId?: string;
  depth?: number; // kept for backwards compat but unused
  userId?: string;
  autoDial?: boolean;
}

interface CallLogEntry {
  id: string;
  call_status: string | null;
  attempt_number: number | null;
  duration_seconds: number | null;
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
  custom_message: string | null;
  created_at: string | null;
  action_id: string | null;
  operator_name?: string;
  action_name?: string;
  action_color?: string;
  audio_url?: string | null;
}

const statusStyles: Record<string, { label: string; className: string }> = {
  queued: { label: "📋 Na Fila", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  dialing: { label: "🔵 Discando...", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 animate-pulse" },
  ringing: { label: "🔔 Chamando...", className: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 animate-pulse" },
  in_call: { label: "📞 Em Andamento", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  answered: { label: "🟢 Atendido", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  completed: { label: "✅ Concluído", className: "bg-gray-500/15 text-gray-700 dark:text-gray-400" },
  failed: { label: "❌ Falha", className: "bg-destructive/15 text-destructive dark:text-destructive-400" },
  cancelled: { label: "🚫 Cancelado", className: "bg-gray-500/15 text-gray-700 dark:text-gray-400" },
  in_progress: { label: "⚙️ Em Progresso", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
};

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

export function CallActionDialog({
  open, onOpenChange, callId, campaignId, leadId,
  leadName, leadPhone, campaignName, duration,
  initialObservations, attemptNumber, maxAttempts, isPriority,
  callStatus, externalCallId, audioUrl, operatorId, userId,
  autoDial,
}: CallActionDialogProps) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const [isDocked, setIsDocked] = useState(true);
  const autoDialTriggeredRef = useRef(false);
  // --- Navigation state ---
  const cleanCallId = callId?.startsWith("cl_") ? callId.replace("cl_", "") : callId;

  const initialData: CallDialogData = {
    callId: cleanCallId, campaignId, leadId, leadName, leadPhone, campaignName,
    duration, notes: initialObservations || "", attemptNumber, maxAttempts,
    isPriority, callStatus, externalCallId, audioUrl, userId,
  };

  const [currentData, setCurrentData] = useState<CallDialogData>(initialData);
  const [forwardStack, setForwardStack] = useState<CallDialogData[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  // Keep currentData in sync with props when dialog reopens
  useEffect(() => {
    if (open) {
      const activeCallId = callId?.startsWith("cl_") ? callId.replace("cl_", "") : callId;
      setCurrentData({
        callId: activeCallId, campaignId, leadId, leadName, leadPhone, campaignName,
        duration, notes: initialObservations || "", attemptNumber, maxAttempts,
        isPriority, callStatus, externalCallId, audioUrl, userId,
      });
      setForwardStack([]);
      autoDialTriggeredRef.current = false;
    }
  }, [open, callId, userId]);

  // Sync specific props that might change while dialog is open (like status or externalCallId)
  useEffect(() => {
    if (open) {
      setCurrentData(prev => ({
        ...prev,
        callStatus: callStatus || prev.callStatus,
        externalCallId: externalCallId || prev.externalCallId,
      }));
    }
  }, [callStatus, externalCallId, open]);

  // Live timer tick when call is active
  useEffect(() => {
    const isActiveCall = ["on_call", "in_progress", "in_call", "answered"].includes(currentData.callStatus || "");
    if (!open || !isActiveCall) return;

    const interval = setInterval(() => {
      setCurrentData(prev => ({ ...prev, duration: (prev.duration || 0) + 1 }));
    }, 1000);

    return () => clearInterval(interval);
  }, [open, currentData.callStatus]);

  useEffect(() => {
    if (duration !== undefined && duration > 0) {
      setCurrentData(prev => ({ ...prev, duration }));
    }
  }, [duration]);

  // --- Per-view state ---
  const { actions, isLoading: actionsLoading } = useCallActions(currentData.campaignId);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(currentData.leadName);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [confirmingActionId, setConfirmingActionId] = useState<string | null>(null);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [executedActionIds, setExecutedActionIds] = useState<string[]>([]);
  const [notes, setNotes] = useState(currentData.notes);
  const [customMessage, setCustomMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<CallLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  const [isDialing, setIsDialing] = useState(false);

  const isWorkflowCall = currentData.callId?.startsWith("wt_") || false;
  const realTaskId = isWorkflowCall ? currentData.callId.replace("wt_", "") : null;
  const [workflowTask, setWorkflowTask] = useState<{ script: string; actions: any[] } | null>(null);
  const [workflowTaskLoading, setWorkflowTaskLoading] = useState(false);

  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (workflowTask?.script) {
      try {
        const parsed = JSON.parse(workflowTask.script);
        if (parsed && parsed.type === "quiz" && parsed.quiz && parsed.quiz.length > 0) {
          setCurrentQuestionId(parsed.quiz[0].id);
        } else {
          setCurrentQuestionId(null);
        }
      } catch (e) {
        setCurrentQuestionId(null);
      }
    } else {
      setCurrentQuestionId(null);
    }
  }, [workflowTask]);

  useEffect(() => {
    if (isWorkflowCall && realTaskId && open) {
      setWorkflowTaskLoading(true);
      supabase
        .from("workflow_call_tasks")
        .select("script, actions")
        .eq("id", realTaskId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching workflow task script/actions:", error);
          } else if (data) {
            setWorkflowTask(data);
          }
          setWorkflowTaskLoading(false);
        });
    } else {
      setWorkflowTask(null);
    }
  }, [currentData.callId, open]);

  // Subscribe to changes on the workflow_call_task
  useEffect(() => {
    if (!isWorkflowCall || !realTaskId || !open) return;

    const channel = supabase
      .channel(`workflow_task_${realTaskId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workflow_call_tasks",
          filter: `id=eq.${realTaskId}`,
        },
        (payload) => {
          const updatedTask = payload.new;
          if (updatedTask && updatedTask.status) {
            setCurrentData((prev) => ({
              ...prev,
              callStatus: updatedTask.status,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realTaskId, isWorkflowCall, open]);

  // Reset per-view state when currentData changes
  useEffect(() => {
    setSelectedActionId(null);
    setConfirmingActionId(null);
    setExecutingActionId(null);
    setExecutedActionIds([]);
    setNotes(currentData.notes);
    setCustomMessage("");
    setEditName(currentData.leadName);
    setIsEditingName(false);
    setScheduledDate("");
    setScheduledTime("");
    setCopied(false);
  }, [currentData.callId]);

  const selectedAction = actions.find(a => a.id === selectedActionId);
  const hasCustomMessageAction = actions.some(a => a.actionType === "custom_message");
  const isScheduleType = selectedAction?.actionType === "none" &&
    selectedAction?.name?.toLowerCase().includes("agend");

  const fallbackActions = [
    { id: "__success", name: "Sucesso", color: "#10b981", icon: "✅", actionType: "none" as const },
    { id: "__failure", name: "Sem Sucesso", color: "#ef4444", icon: "❌", actionType: "none" as const },
  ];
  const displayActions = isWorkflowCall
    ? (workflowTask?.actions || fallbackActions).map((a: any) => ({
        id: a.id,
        name: a.label || a.name,
        color: a.color === "green" ? "#10b981" : a.color === "red" ? "#ef4444" : a.color || "#6b7280",
        icon: a.type === "success" ? "✅" : "❌",
        actionType: "none" as const,
        requiresNote: a.requiresNote || false,
      }))
    : (actions.length > 0 ? actions : fallbackActions);

  const copyExternalId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpenChat = async () => {
    let targetLeadId = currentData.leadId;
    let targetLeadName = currentData.leadName;
    const targetPhone = currentData.leadPhone;

    try {
      let matchedLead: { id: string; name?: string; phone?: string } | null = null;
      
      // 1. If leadId is set, verify if it exists in `leads` table (foreign key used by chat_conversations)
      if (targetLeadId) {
        const { data: leadCheck } = await supabase
          .from("leads")
          .select("id, name, phone")
          .eq("id", targetLeadId)
          .maybeSingle();
        if (leadCheck) {
          matchedLead = leadCheck;
        }
      }

      // 2. If not found by ID in `leads`, search by phone number
      if (!matchedLead && targetPhone && activeCompanyId) {
        const cleanPhone = targetPhone.replace(/\D/g, "");
        const { data: phoneCheck } = await supabase
          .from("leads")
          .select("id, name, phone")
          .eq("company_id", activeCompanyId)
          .or(`phone.ilike.%${cleanPhone}%,phone.eq.${targetPhone}`)
          .maybeSingle();
        if (phoneCheck) {
          matchedLead = phoneCheck;
          targetLeadId = phoneCheck.id;
        }
      }

      // 3. If lead does not exist in `leads` yet, create it so chat_conversations can be linked
      if (!matchedLead && activeCompanyId && (targetPhone || targetLeadName)) {
        const { data: newLead } = await supabase
          .from("leads")
          .insert({
            company_id: activeCompanyId,
            name: targetLeadName || targetPhone || "Lead",
            phone: targetPhone || null,
          })
          .select("id, name, phone")
          .maybeSingle();
        if (newLead) {
          targetLeadId = newLead.id;
          matchedLead = newLead;
        }
      }

      const finalLeadId = targetLeadId || currentData.callId;
      if (finalLeadId) {
        useChatExpressStore.getState().openLeadSession({
          leadId: finalLeadId,
          leadName: targetLeadName || matchedLead?.name || targetPhone || "Lead",
          phone: targetPhone || matchedLead?.phone || null,
        });
        toast({
          title: "Chat aberto",
          description: `Conversa com ${targetLeadName || "Lead"} aberta no chat express.`,
        });
      } else {
        toast({
          title: "Não foi possível abrir o chat",
          description: "Nenhum lead ou telefone encontrado para esta ligação.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Erro ao abrir chat:", err);
      if (targetLeadId) {
        useChatExpressStore.getState().openLeadSession({
          leadId: targetLeadId,
          leadName: targetLeadName || targetPhone || "Lead",
          phone: targetPhone || null,
        });
      }
    }
  };

  const setScheduleShortcut = (date: Date) => {
    setScheduledDate(format(date, "yyyy-MM-dd"));
    setScheduledTime(format(date, "HH:mm"));
  };

  // --- Navigation handlers ---
  const handleGoBack = async () => {
    if (!operatorId) return;
    setLoadingPrevious(true);
    try {
      // Collect all call IDs already in the forwardStack + current to exclude
      const excludeIds = [currentData.callId, ...forwardStack.map(d => d.callId)];

      const { data } = await (supabase as any)
        .from("call_logs")
        .select("id, campaign_id, lead_id, attempt_number, duration_seconds, notes, call_status, external_call_id, audio_url, operator_id, call_leads(name, phone), call_campaigns!call_logs_campaign_id_fkey(name, retry_count, is_priority)")
        .eq("operator_id", operatorId)
        .not("id", "in", `(${excludeIds.join(",")})`)
        .in("call_status", ["completed", "no_answer", "failed", "cancelled", "scheduled", "busy", "voicemail", "timeout"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        // Push current to forward stack
        setForwardStack(prev => [...prev, currentData]);
        setCurrentData({
          callId: data.id,
          campaignId: data.campaign_id,
          leadId: data.lead_id,
          leadName: data.call_leads?.name || "—",
          leadPhone: data.call_leads?.phone || "—",
          campaignName: data.call_campaigns?.name || "—",
          duration: data.duration_seconds || 0,
          notes: data.notes || "",
          attemptNumber: data.attempt_number || 1,
          maxAttempts: data.call_campaigns?.retry_count || 3,
          isPriority: data.call_campaigns?.is_priority || false,
          callStatus: data.call_status || undefined,
          externalCallId: data.external_call_id,
          audioUrl: data.audio_url || null,
        });
      } else {
        toast({ title: "Nenhuma ligação anterior encontrada" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao buscar anterior", description: err.message, variant: "destructive" });
    } finally {
      setLoadingPrevious(false);
    }
  };

  const handleGoForward = () => {
    if (forwardStack.length === 0) return;
    const next = [...forwardStack];
    const item = next.pop()!;
    setForwardStack(next);
    setCurrentData(item);
  };

  // Fetch history for current lead/campaign
  useEffect(() => {
    if (!open || !currentData.leadId || !currentData.campaignId) return;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      const { data } = await (supabase as any)
        .from("call_logs")
        .select("id, call_status, attempt_number, duration_seconds, started_at, ended_at, notes, custom_message, created_at, action_id, audio_url, call_operators!call_logs_operator_id_fkey(operator_name), call_script_actions!call_logs_action_id_fkey(name, color)")
        .eq("lead_id", currentData.leadId)
        .eq("campaign_id", currentData.campaignId)
        .order("created_at", { ascending: false });

      if (data) {
        setHistory(data.map((d: any) => ({
          ...d,
          operator_name: d.call_operators?.operator_name || "—",
          action_name: d.call_script_actions?.name || null,
          action_color: d.call_script_actions?.color || null,
          audio_url: d.audio_url || null,
        })));
      }
      setHistoryLoading(false);
    };
    fetchHistory();
  }, [open, currentData.leadId, currentData.campaignId, currentData.callId, historyVersion]);

  const executeAutomation = async (actionId: string) => {
    if (actionId.startsWith("__")) return;

    try {
      const { data: actionData } = await (supabase as any)
        .from("call_script_actions")
        .select("action_type, action_config")
        .eq("id", actionId)
        .maybeSingle();

      if (!actionData) return;

      if (
        (actionData.action_type === "custom_message" && actionData.action_config?.webhook_url) ||
        (actionData.action_type === "webhook" && (actionData.action_config?.url || actionData.action_config?.webhook_url))
      ) {
        const { error: fnError } = await supabase.functions.invoke("execute-call-action", {
          body: {
            action_id: actionId,
            lead_id: currentData.leadId,
            campaign_id: currentData.campaignId,
          },
        });

        if (fnError) {
          toast({ title: "Webhook falhou", description: fnError.message, variant: "destructive" });
        }
      } else if (actionData.action_type === "start_sequence" && actionData.action_config) {
        const { campaignId: seqCampaignId, campaignType, sequenceId } = actionData.action_config as {
          campaignId?: string; campaignType?: string; sequenceId?: string;
        };

        if (campaignType === "dispatch" && sequenceId && currentData.leadPhone) {
          const { data: result, error: fnError } = await supabase.functions.invoke("execute-dispatch-sequence", {
            body: { campaignId: seqCampaignId, sequenceId, contactPhone: currentData.leadPhone, contactName: currentData.leadName || "" },
          });
          if (fnError || result?.error) {
            toast({ title: "Erro na sequência", description: result?.error || fnError?.message, variant: "destructive" });
          }
        } else if (campaignType === "group" && sequenceId && seqCampaignId) {
          const { error: fnError } = await supabase.functions.invoke("execute-message", {
            body: {
              campaignId: seqCampaignId, sequenceId,
              triggerContext: {
                respondentPhone: currentData.leadPhone || "", respondentName: currentData.leadName || "",
                respondentJid: currentData.leadPhone ? `${currentData.leadPhone}@s.whatsapp.net` : "",
                groupJid: "", sendPrivate: true,
              },
            },
          });
          if (fnError) {
            toast({ title: "Erro na sequência de grupo", description: fnError.message, variant: "destructive" });
          }
        }
      } else if (actionData.action_type === "add_tag" && actionData.action_config?.tag) {
        const tag = actionData.action_config.tag as string;
        const { data: leadData } = await (supabase as any)
          .from("call_leads").select("custom_fields").eq("id", currentData.leadId).single();
        const currentFields = (leadData?.custom_fields as Record<string, unknown>) || {};
        const currentTags = Array.isArray(currentFields.tags) ? currentFields.tags : [];
        if (!currentTags.includes(tag)) {
          await (supabase as any).from("call_leads")
            .update({ custom_fields: { ...currentFields, tags: [...currentTags, tag] } })
            .eq("id", currentData.leadId);
        }
      } else if (actionData.action_type === "update_status" && actionData.action_config?.status) {
        const newStatus = String(actionData.action_config.status);
        await (supabase as any).from("call_leads").update({ status: newStatus }).eq("id", currentData.leadId);
        if (newStatus !== "completed") {
          await (supabase as any).from("call_logs").update({ call_status: newStatus }).eq("id", currentData.callId);
        }
      }
    } catch (err: any) {
      console.error("[CallActionDialog] Automation failed:", err);
      toast({ title: "Erro na automação", description: err.message, variant: "destructive" });
    }
  };

  const handleExecuteActionNow = async (action: any) => {
    setExecutingActionId(action.id);
    setSelectedActionId(action.id);
    try {
      if (isWorkflowCall && realTaskId) {
        const { data: taskData, error: taskErr } = await (supabase as any)
          .from("workflow_call_tasks")
          .select("*")
          .eq("id", realTaskId)
          .single();

        if (taskErr || !taskData) {
          throw new Error(taskErr?.message || "Tarefa de ligação não encontrada");
        }

        let triggerPayload: any = {};
        let effectiveCampaignId = taskData.workflow_id;

        if (taskData.workflow_execution_id) {
          const { data: wfExec } = await (supabase as any)
            .from("workflow_executions")
            .select("campaign_id, trigger_payload")
            .eq("id", taskData.workflow_execution_id)
            .maybeSingle();

          if (wfExec) {
            triggerPayload = wfExec.trigger_payload || {};
            if (wfExec.campaign_id) {
              effectiveCampaignId = wfExec.campaign_id;
            }
          }
        }

        // Find active node in sequence_nodes in case workflow was re-saved
        let effectiveNodeId = taskData.node_id;
        const { data: activeNodes } = await (supabase as any)
          .from("sequence_nodes")
          .select("id, node_type")
          .eq("sequence_id", taskData.workflow_id);

        if (activeNodes && activeNodes.length > 0) {
          const exists = activeNodes.some((n: any) => n.id === effectiveNodeId);
          if (!exists) {
            const phoneNode = activeNodes.find((n: any) => n.node_type === "phone_call");
            if (phoneNode) effectiveNodeId = phoneNode.id;
          }
        }

        const respondentPhone = taskData.phone || currentData.leadPhone || triggerPayload.respondentPhone || "";
        const respondentJid = respondentPhone ? `${respondentPhone}@s.whatsapp.net` : triggerPayload.respondentJid;

        const mergedContext = {
          ...triggerPayload,
          callResult: action.id || action.output,
          actionId: action.id,
          actionOutput: action.output,
          leadId: taskData.lead_id || currentData.leadId,
          companyId: taskData.company_id || activeCompanyId,
          respondentPhone,
          respondentJid,
          sendPrivate: true,
        };

        const executePayload = {
          campaignId: effectiveCampaignId,
          sequenceId: taskData.workflow_id,
          executionId: taskData.workflow_execution_id,
          startFromNodeId: effectiveNodeId,
          triggerContext: mergedContext,
        };

        const { data: execRes, error: execErr } = await supabase.functions.invoke("execute-message", {
          body: executePayload,
        });

        if (execErr) {
          throw new Error(execErr.message || "Falha ao disparar workflow");
        }

        // Keep task marked in_progress with observation
        await (supabase as any)
          .from("workflow_call_tasks")
          .update({
            observation: notes || taskData.observation,
            assigned_operator_id: operatorId || taskData.assigned_operator_id,
            status: "in_progress",
            updated_at: new Date().toISOString(),
          })
          .eq("id", realTaskId);

        setExecutedActionIds(prev => [...prev, action.id]);
        setConfirmingActionId(null);
        toast({
          title: "✅ Mensagem enviada!",
          description: `Ação "${action.name}" disparada no workflow. A ligação continua ativa.`,
        });
      } else {
        await executeAutomation(action.id);
        setExecutedActionIds(prev => [...prev, action.id]);
        setConfirmingActionId(null);
        toast({
          title: "✅ Ação disparada!",
          description: `Ação "${action.name}" executada com sucesso. A ligação continua ativa.`,
        });
      }
    } catch (err: any) {
      console.error("[CallActionDialog] Error executing action now:", err);
      toast({
        title: "Erro ao disparar ação",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setExecutingActionId(null);
    }
  };

  const handleSave = async () => {
    if (!selectedActionId) {
      toast({ title: "Selecione uma ação", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      if (isWorkflowCall && realTaskId) {
        // If not already executed during the call, execute it now
        if (!executedActionIds.includes(selectedActionId)) {
          const act = displayActions.find(a => a.id === selectedActionId);
          if (act) {
            await handleExecuteActionNow(act);
          }
        }

        const now = new Date().toISOString();

        // Finalize the task in workflow_call_tasks
        await (supabase as any)
          .from("workflow_call_tasks")
          .update({
            status: "completed",
            observation: notes || null,
            completed_at: now,
          })
          .eq("id", realTaskId);

        // Also record in call_logs so it appears in standard call history and logs
        const effectiveUserId = user?.id || currentData.userId || "95b89774-fba0-485b-b539-14cb2901befe";
        try {
          await (supabase as any)
            .from("call_logs")
            .insert({
              user_id: effectiveUserId,
              company_id: activeCompanyId || undefined,
              call_status: "completed",
              notes: notes || null,
              operator_id: operatorId || undefined,
              duration_seconds: currentData.duration || 0,
              started_at: currentData.duration ? new Date(Date.now() - currentData.duration * 1000).toISOString() : now,
              ended_at: now,
              attempt_number: currentData.attemptNumber || 1,
            });
        } catch (logErr) {
          console.warn("[CallActionDialog] Warning inserting call_log:", logErr);
        }

        // Invalidate queries so history and queue refresh immediately
        queryClient.invalidateQueries({ queryKey: ["call_panel_history"] });
        queryClient.invalidateQueries({ queryKey: ["call_panel_answered_today"] });
        queryClient.invalidateQueries({ queryKey: ["workflow_call_tasks_queue"] });
        queryClient.invalidateQueries({ queryKey: ["call_logs_queue"] });
        queryClient.invalidateQueries({ queryKey: ["call_queue"] });

        toast({ title: "Ligação finalizada", description: "O resultado da ligação foi salvo e concluído com sucesso." });
        onOpenChange(false);
        return;
      }

      // Resolve targetCallId — fallback to latest log if callId is empty
      let targetCallId = currentData.callId;

      if (!targetCallId && currentData.leadId && currentData.campaignId) {
        const { data: latestLog } = await (supabase as any)
          .from("call_logs")
          .select("id")
          .eq("lead_id", currentData.leadId)
          .eq("campaign_id", currentData.campaignId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (latestLog) targetCallId = latestLog.id;
      }

      if (!targetCallId) {
        toast({ title: "Erro", description: "Nenhum registro de ligação encontrado para este lead", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      const updates: Record<string, unknown> = {
        notes: notes || null,
      };

      if (selectedActionId && !selectedActionId.startsWith("__")) {
        updates.action_id = selectedActionId;
      }

      // Save custom_message if the selected action is custom_message type
      if (selectedAction?.actionType === "custom_message") {
        updates.custom_message = customMessage || null;
        if (!customMessage.trim()) {
          toast({ title: "⚠️ Mensagem personalizada vazia", description: "A mensagem será enviada em branco." });
        }
      }

      if (isScheduleType && scheduledDate && scheduledTime) {
        updates.scheduled_for = `${scheduledDate}T${scheduledTime}:00`;
      }

      await (supabase as any)
        .from("call_logs")
        .update(updates)
        .eq("id", targetCallId);

      await executeAutomation(selectedActionId);

      // Refresh history after save
      setHistoryVersion(v => v + 1);
      queryClient.invalidateQueries({ queryKey: ["call_panel_history"] });
      queryClient.invalidateQueries({ queryKey: ["call_panel_answered_today"] });
      queryClient.invalidateQueries({ queryKey: ["call_logs_queue"] });
      queryClient.invalidateQueries({ queryKey: ["call_queue"] });

      toast({ title: "Ação registrada", description: "Resultado salvo. A ligação será encerrada pelo callback." });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualDial = async () => {
    setIsDialing(true);
    setCurrentData(prev => ({ ...prev, callStatus: "dialing" }));
    try {
      // Fetch webhook configs
      const targetUserId = currentData.userId || user?.id;
      let { data: configs } = await supabase
        .from("webhook_configs")
        .select("url")
        .eq("user_id", targetUserId)
        .eq("category", "calls")
        .eq("is_active", true)
        .limit(1);

      if (!configs || configs.length === 0) {
        const { data: fallbackConfigs } = await supabase
          .from("webhook_configs")
          .select("url")
          .eq("category", "calls")
          .eq("is_active", true)
          .limit(1);
        configs = fallbackConfigs;
      }

      const webhookUrl = configs?.[0]?.url;
      if (!webhookUrl) {
        toast({ title: "Webhook não configurado", description: "Vá em Painel Admin -> Webhooks e configure a categoria 'calls'.", variant: "destructive" });
        setCurrentData(prev => ({ ...prev, callStatus: initialData.callStatus }));
        return;
      }

      // Fetch current operator details
      let operatorDetails = { name: user?.email || "", email: user?.email || "", extension: "" };
      let operatorQueryError = null;
      let operatorQueryCount = 0;
      if (user) {
        let query = supabase
          .from("call_operators")
          .select("operator_name, extension")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (activeCompanyId) {
          query = query.eq("company_id", activeCompanyId);
        }

        const { data: operatorDataArray, error: opError } = await query.limit(1);
        if (opError) {
          operatorQueryError = opError.message;
        }
        if (operatorDataArray) {
          operatorQueryCount = operatorDataArray.length;
        }
        const operatorData = operatorDataArray?.[0] || null;

        if (operatorData) {
          operatorDetails = {
            name: operatorData.operator_name || user.email || "",
            email: user.email || "",
            extension: operatorData.extension || ""
          };
        }
      }

      if (isWorkflowCall && realTaskId) {
        // Update task status in database to dialing
        await supabase
          .from("workflow_call_tasks")
          .update({ status: "dialing", assigned_operator_id: user?.id })
          .eq("id", realTaskId);

        // Invalidate queries so UI reflects dialing state immediately
        queryClient.invalidateQueries({ queryKey: ["workflow_call_tasks_queue"] });

        const payload = {
          action: "call.dial",
          call: {
            id: realTaskId,
            status: "dialing",
            source: "workflow"
          },
          lead: {
            id: currentData.leadId,
            phone: currentData.leadPhone,
            name: currentData.leadName
          },
          operator: {
            name: operatorDetails.name,
            email: operatorDetails.email,
            extension: operatorDetails.extension
          },
          _debug: {
            userId: user?.id || null,
            activeCompanyId: activeCompanyId || null,
            hasUser: !!user,
            operatorQueryCount: operatorQueryCount,
            operatorQueryError: operatorQueryError
          }
        };

        const { data: proxyData, error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
          body: { url: webhookUrl, payload }
        });

        if (proxyError) {
          toast({ title: "Erro no Webhook", description: proxyError.message, variant: "destructive" });
          setCurrentData(prev => ({ ...prev, callStatus: "failed" }));
          await supabase.from("workflow_call_tasks").update({ status: "failed" }).eq("id", realTaskId);
          queryClient.invalidateQueries({ queryKey: ["workflow_call_tasks_queue"] });
        } else {
          // Try to extract external_call_id from proxy response
          let externalCallId = null;
          try {
            const responseBody = typeof proxyData?.body === "string" ? JSON.parse(proxyData.body) : proxyData?.body;
            const externalId = Array.isArray(responseBody) 
              ? (responseBody[0]?.id || responseBody[0]?.call_id) 
              : (responseBody?.id || responseBody?.call_id);
            if (externalId) {
              externalCallId = String(externalId);
            }
          } catch (e) {
            console.warn("[handleManualDial] Failed to extract external_call_id:", e);
          }

          toast({ title: "Ligação iniciada", description: "A chamada foi disparada para o webhook." });
          setCurrentData(prev => ({ 
            ...prev, 
            callStatus: "in_call",
            ...(externalCallId ? { externalCallId } : {})
          }));
          await supabase
            .from("workflow_call_tasks")
            .update({ 
              status: "in_call",
              ...(externalCallId ? { external_call_id: externalCallId } : {})
            })
            .eq("id", realTaskId);
          queryClient.invalidateQueries({ queryKey: ["workflow_call_tasks_queue"] });
        }
      } else if (currentData.callId) {
        await (supabase as any)
          .from("call_logs")
          .update({ call_status: "dialing", started_at: new Date().toISOString() })
          .eq("id", currentData.callId);

        const payload = {
          action: "call.dial",
          call: { id: currentData.callId, status: "dialing" },
          campaign: { id: currentData.campaignId, name: currentData.campaignName },
          lead: { id: currentData.leadId, phone: currentData.leadPhone, name: currentData.leadName },
          operator: operatorDetails
        };

        const { data: proxyData, error: proxyError } = await supabase.functions.invoke("webhook-proxy", {
          body: { url: webhookUrl, payload }
        });

        if (proxyError) {
          toast({ title: "Erro no Webhook", description: proxyError.message, variant: "destructive" });
          setCurrentData(prev => ({ ...prev, callStatus: "failed" }));
        } else {
          let externalCallId = null;
          try {
            const responseBody = typeof proxyData?.body === "string" ? JSON.parse(proxyData.body) : proxyData?.body;
            const externalId = Array.isArray(responseBody) ? (responseBody[0]?.id || responseBody[0]?.call_id) : (responseBody?.id || responseBody?.call_id);
            if (externalId) externalCallId = String(externalId);
          } catch (e) {
            console.warn("[handleManualDial] Failed to extract external_call_id:", e);
          }

          toast({ title: "Ligação iniciada", description: "A chamada foi disparada para o webhook." });
          setCurrentData(prev => ({ 
            ...prev, 
            callStatus: "in_call",
            ...(externalCallId ? { externalCallId } : {})
          }));
          if (externalCallId) {
            await (supabase as any)
              .from("call_logs")
              .update({ external_call_id: externalCallId })
              .eq("id", currentData.callId);
          }
          queryClient.invalidateQueries({ queryKey: ["call_logs_queue"] });
          queryClient.invalidateQueries({ queryKey: ["call_queue"] });
        }
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      setCurrentData(prev => ({ ...prev, callStatus: "failed" }));
    } finally {
      setIsDialing(false);
    }
  };

  // Trigger autoDial on mount if requested
  useEffect(() => {
    if (open && autoDial && !autoDialTriggeredRef.current) {
      const alreadyConnected = ["on_call", "in_call", "answered", "completed", "ended"].includes(currentData.callStatus || "");
      if (!alreadyConnected) {
        autoDialTriggeredRef.current = true;
        handleManualDial();
      }
    }
  }, [open, autoDial, currentData.callStatus]);

  const resetState = () => {
    setSelectedActionId(null);
    setNotes("");
    setCustomMessage("");
    setScheduledDate("");
    setScheduledTime("");
    setForwardStack([]);
  };

  if (!open) return null;

  const innerContent = (
    <div className="flex flex-col w-full h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Compact & Balanced Lead Header */}
      <div className="relative bg-gradient-to-b from-slate-50/90 via-slate-50/40 to-white dark:from-slate-900/90 dark:via-slate-900/40 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2.5 shrink-0">
        
        {/* Row 1: Lead info (Avatar + Name & Phone stacked) on left; Timer + Window controls on right */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {operatorId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-foreground shrink-0 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800"
                onClick={handleGoBack}
                disabled={loadingPrevious}
                title="Lead anterior"
              >
                {loadingPrevious ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}

            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
              {(currentData.leadName || "L").charAt(0).toUpperCase()}
            </div>

            {/* Name + Phone stacked */}
            <div className="min-w-0 flex flex-col justify-center">
              {isEditingName ? (
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") { setEditName(currentData.leadName); setIsEditingName(false); }
                  }}
                  onBlur={async () => {
                    const trimmed = editName.trim();
                    if (trimmed && trimmed !== currentData.leadName) {
                      await (supabase as any).from("call_leads").update({ name: trimmed }).eq("id", currentData.leadId);
                      setCurrentData(prev => ({ ...prev, leadName: trimmed }));
                      toast({ title: "Nome atualizado" });
                    } else {
                      setEditName(currentData.leadName);
                    }
                    setIsEditingName(false);
                  }}
                  className="h-6 text-xs font-bold uppercase max-w-[190px] rounded-md border-primary/40 px-2 py-0"
                />
              ) : (
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2 className="text-sm font-bold tracking-tight uppercase text-slate-900 dark:text-white truncate">
                    {currentData.leadName || "Sem Nome"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => { setEditName(currentData.leadName); setIsEditingName(true); }}
                    className="text-slate-400 hover:text-primary transition-colors p-0.5 rounded shrink-0"
                    title="Editar nome do lead"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Phone with copy & chat */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                    {currentData.leadPhone ? formatPhone(currentData.leadPhone) : "Sem telefone"}
                  </span>
                  {currentData.leadPhone && (
                    <button
                      type="button"
                      onClick={() => copyExternalId(currentData.leadPhone)}
                      className="text-slate-400 hover:text-foreground transition-colors p-0.5"
                      title="Copiar telefone"
                    >
                      {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-sans font-bold transition-all shadow-2xs"
                  title="Abrir WhatsApp / Chat deste lead"
                >
                  <MessageSquare className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Chat</span>
                </button>
              </div>
            </div>

            {forwardStack.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-400 hover:text-foreground shrink-0 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800"
                onClick={handleGoForward}
                title="Avançar"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Right side: Timer Pill + Window control buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-2xs shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black font-mono tracking-tight">
                {formatDuration(currentData.duration)}
              </span>
            </div>

            <div className="flex items-center gap-0.5 pl-1.5 border-l border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleOpenChat}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                title="Abrir Chat Express deste lead"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  useCallFloatingStore.getState().minimizeCallDialog();
                  onOpenChange(false);
                }}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Minimizar para balão"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsDocked((prev) => !prev)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={isDocked ? "Expandir tela cheia" : "Fixar no canto (Dock)"}
              >
                {isDocked ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  resetState();
                  useCallFloatingStore.getState().closeCallDialog();
                }}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Badges + Chat action + Dial action */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {currentData.campaignName && (
              <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-amber-50/5 text-amber-700 dark:text-amber-300 border-amber-300/60 rounded-md font-medium">
                📁 {currentData.campaignName}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-blue-50/5 text-blue-700 dark:text-blue-300 border-blue-300/60 rounded-md font-medium">
              🔄 x{currentData.attemptNumber}/{currentData.maxAttempts}
            </Badge>
            {currentData.isPriority && (
              <Badge variant="secondary" className="text-[10px] py-0.5 px-2 bg-amber-50/15 text-amber-800 dark:text-amber-200 border-amber-400/50 rounded-md font-semibold">
                ⭐ Prioridade
              </Badge>
            )}
            {currentData.callStatus && (() => {
              const style = statusStyles[currentData.callStatus] || {
                label: `📡 ${currentData.callStatus}`,
                className: "bg-primary/10 text-primary border-primary/20",
              };
              return (
                <Badge variant="outline" className={cn("text-[10px] py-0.5 px-2 rounded-md font-medium", style.className)}>
                  {style.label}
                </Badge>
              );
            })()}
            {currentData.externalCallId && (
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]" title={currentData.externalCallId}>
                #{currentData.externalCallId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg text-emerald-600 border-emerald-500/40 bg-emerald-50/60 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 transition-all shadow-2xs"
              onClick={handleOpenChat}
              title="Abrir balão lateral do chat"
            >
              <MessageSquare className="h-3 w-3" />
              Abrir Chat
            </Button>

            {isWorkflowCall && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2.5 text-[11px] font-semibold gap-1.5 rounded-lg text-emerald-600 border-emerald-500/40 bg-emerald-50/60 hover:bg-emerald-100 dark:bg-emerald-950/40"
                onClick={handleManualDial}
                disabled={isDialing}
              >
                {isDialing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Phone className="h-3 w-3" />}
                Discar Agora
              </Button>
            )}
          </div>
        </div>

        {/* Audio recording player (if available) */}
        {currentData.audioUrl && (
          <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 p-1.5">
            <audio controls className="w-full h-6" src={currentData.audioUrl} preload="metadata">
              Seu navegador não suporta áudio.
            </audio>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="call" className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-950">
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/20 shrink-0">
          <TabsList className="grid grid-cols-2 w-full h-8 p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-lg">
            <TabsTrigger
              value="call"
              className="rounded-md py-1 text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all"
            >
              <Phone className="h-3.5 w-3.5" /> Ligação
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-md py-1 text-xs font-semibold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all"
            >
              <History className="h-3.5 w-3.5" /> Histórico ({history.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Call Tab */}
        <TabsContent value="call" className="flex-1 min-h-0 mt-0 flex flex-col data-[state=inactive]:hidden data-[state=active]:flex">
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 space-y-3.5">
                
                {/* ROTEIRO SECTION */}
                <Collapsible defaultOpen={false}>
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-3.5 py-2 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                        <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                          ROTEIRO DA LIGAÇÃO
                        </span>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 data-[state=closed]:-rotate-90" />
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="p-3 border-t border-slate-100 dark:border-slate-800 max-h-36 overflow-y-auto">
                      {isWorkflowCall ? (
                        workflowTaskLoading ? (
                          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" /> Carregando roteiro...
                          </div>
                        ) : (
                          (() => {
                            let quizData: any = null;
                            try {
                              if (workflowTask?.script && (workflowTask.script.trim().startsWith("{") || workflowTask.script.trim().startsWith("["))) {
                                const parsed = JSON.parse(workflowTask.script);
                                if (parsed && typeof parsed === "object") {
                                  quizData = parsed;
                                }
                              }
                            } catch (e) {
                              // Not JSON
                            }

                            // Case 1: Quiz structure with questions
                            if (quizData && quizData.quiz && Array.isArray(quizData.quiz) && quizData.quiz.length > 0) {
                              const currentQuestion = quizData.quiz.find((q: any) => q.id === currentQuestionId) || quizData.quiz[0];
                              const isEnd = !currentQuestionId || currentQuestionId === "end";

                              return (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                    <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">
                                      {quizData.title || "Quiz Interativo"}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setCurrentQuestionId(quizData.quiz[0].id)}
                                      className="h-6 text-[10px] text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg gap-1"
                                    >
                                      <RotateCcw className="h-3 w-3" /> Reiniciar Quiz
                                    </Button>
                                  </div>

                                  {isEnd ? (
                                    <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5">
                                      <span className="text-2xl">🎉</span>
                                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Quiz Concluído!</p>
                                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                        Perguntas finalizadas. Por favor, registre o resultado da ligação selecionando uma ação abaixo.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-3 animate-in fade-in duration-150">
                                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                          PERGUNTA
                                        </span>
                                        <p className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
                                          {currentQuestion.questionText}
                                        </p>
                                      </div>

                                      <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                          ALTERNATIVAS
                                        </span>
                                        {(currentQuestion.alternatives || []).length === 0 ? (
                                          <p className="text-xs text-muted-foreground italic">Nenhuma opção de resposta cadastrada.</p>
                                        ) : (
                                          <div className="grid grid-cols-1 gap-2">
                                            {(currentQuestion.alternatives || []).map((alt: any) => (
                                              <Button
                                                key={alt.id}
                                                type="button"
                                                variant="outline"
                                                onClick={() => setCurrentQuestionId(alt.nextQuestionId || "end")}
                                                className="justify-start text-left text-xs h-auto py-2.5 px-3.5 rounded-xl border-slate-200 dark:border-slate-700 hover:border-violet-500/50 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 transition-all font-medium text-slate-700 dark:text-slate-200 hover:text-violet-700 dark:hover:text-violet-300"
                                              >
                                                {alt.text}
                                              </Button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            // Case 2: Quiz structure with empty quiz array (The bug reported in prompt!)
                            if (quizData && quizData.type === "quiz") {
                              return (
                                <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 text-center space-y-1.5">
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {quizData.title || "Roteiro da Ligação"}
                                  </p>
                                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    Roteiro pronto. Nenhuma pergunta pendente cadastrada no fluxo.
                                  </p>
                                </div>
                              );
                            }

                            // Case 3: Other JSON object (instructions or text)
                            if (quizData && typeof quizData === "object") {
                              const title = quizData.title || quizData.name;
                              const text = quizData.content || quizData.instructions || quizData.description || quizData.message;
                              if (text) {
                                return (
                                  <div className="space-y-2">
                                    {title && <h4 className="text-xs font-bold uppercase tracking-wider text-violet-600">{title}</h4>}
                                    <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                      {text}
                                    </p>
                                  </div>
                                );
                              }
                            }

                            // Case 4: Plain text / Markdown script
                            return (
                              <div className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300 p-2">
                                {workflowTask?.script || "Nenhum roteiro configurado."}
                              </div>
                            );
                          })()
                        )
                      ) : (
                        <InlineScriptRunner campaignId={currentData.campaignId} leadId={currentData.leadId} />
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {currentData.callId && !isWorkflowCall && (
                  <InlineReschedule callId={currentData.callId} />
                )}

                {/* AÇÕES SECTION */}
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                      <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                        AÇÕES
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Selecione o desfecho da chamada
                    </span>
                  </div>

                  {(isWorkflowCall ? workflowTaskLoading : actionsLoading) ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      {!isWorkflowCall && actions.length === 0 && (
                        <div className="rounded-lg border border-dashed border-amber-300/60 p-2 bg-amber-50/40 dark:bg-amber-950/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>Nenhuma ação customizada. Usando ações padrão:</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {displayActions.map((action) => {
                          const isConfirming = confirmingActionId === action.id;
                          const isExecuting = executingActionId === action.id;
                          const isExecuted = executedActionIds.includes(action.id);
                          const isSelected = selectedActionId === action.id;

                          return (
                            <div
                              key={action.id}
                              onClick={() => {
                                if (isExecuted || isExecuting) return;
                                setSelectedActionId(action.id);
                              }}
                              className={cn(
                                "relative flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer select-none",
                                isExecuted
                                  ? "border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200"
                                  : isConfirming
                                  ? "border-[#3B4DFF] ring-2 ring-[#3B4DFF]/25 bg-[#3B4DFF]/5 shadow-2xs"
                                  : isSelected
                                  ? "border-[#3B4DFF] bg-[#3B4DFF]/10 ring-1 ring-[#3B4DFF]/30 shadow-2xs"
                                  : "border-slate-200/90 dark:border-slate-700/80 hover:border-[#3B4DFF]/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                              )}
                            >
                              <button
                                type="button"
                                disabled={isExecuting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isExecuted) return;
                                  setSelectedActionId(action.id);
                                  setConfirmingActionId(isConfirming ? null : action.id);
                                }}
                                className="flex items-center gap-2 flex-1 min-w-0 text-left focus:outline-none"
                              >
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs"
                                  style={{ backgroundColor: action.color }}
                                />
                                <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                                  {action.name}
                                </span>
                              </button>

                              {/* Action controls: Certinho (✓) and Xizinho (✗) confirmation */}
                              <div className="flex items-center gap-1 shrink-0 ml-1.5" onClick={(e) => e.stopPropagation()}>
                                {isExecuting ? (
                                  <div className="flex items-center gap-1 text-[10px] text-primary font-semibold">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Enviando...</span>
                                  </div>
                                ) : isExecuted ? (
                                  <Badge variant="outline" className="text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 gap-0.5 py-0 px-1 rounded">
                                    <Check className="h-2.5 w-2.5" /> Enviado
                                  </Badge>
                                ) : isConfirming ? (
                                  <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                                    <Button
                                      type="button"
                                      size="icon"
                                      title="Confirmar e enviar agora"
                                      onClick={() => handleExecuteActionNow(action)}
                                      className="h-6 w-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      title="Cancelar"
                                      onClick={() => setConfirmingActionId(null)}
                                      className="h-6 w-6 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-md"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 opacity-60">
                                    {action.icon}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {actions.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          ℹ️ Ações de "{currentData.campaignName}"
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Schedule fields */}
                {isScheduleType && selectedActionId && (
                  <div className="space-y-3 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Quando ligar novamente?
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="rounded-xl text-xs bg-white dark:bg-slate-950"
                      />
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="rounded-xl text-xs bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "+1h", date: addHours(new Date(), 1) },
                        { label: "+3h", date: addHours(new Date(), 3) },
                        { label: "Amanhã 9h", date: setMinutes(setHours(addDays(new Date(), 1), 9), 0) },
                        { label: "Amanhã 14h", date: setMinutes(setHours(addDays(new Date(), 1), 14), 0) },
                      ].map(({ label, date }) => (
                        <Button
                          key={label}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-[11px] h-7 rounded-lg"
                          onClick={() => setScheduleShortcut(date)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Message Field */}
                {hasCustomMessageAction && (
                  <div className="space-y-2 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      💬 Mensagem Personalizada (opcional)
                    </Label>
                    <Textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Digite uma mensagem personalizada..."
                      className="mt-1 rounded-xl bg-white dark:bg-slate-950 text-xs resize-none"
                      rows={3}
                    />
                    {actions.filter(a => a.actionType === "custom_message").map(a => (
                      <p key={a.id} className="text-[11px] text-muted-foreground">
                        Essa mensagem será enviada quando você clicar em "{a.name}".
                      </p>
                    ))}
                  </div>
                )}

                {/* OBSERVAÇÕES (OPCIONAL) */}
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <PenLine className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                      <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-700 dark:text-slate-300">
                        OBSERVAÇÕES (OPCIONAL)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {notes.length}/500
                    </span>
                  </div>
                  <Textarea
                    value={notes}
                    maxLength={500}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anotações sobre a ligação..."
                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 focus-visible:ring-primary/30 min-h-[80px] h-[90px] resize-none text-xs p-2.5 leading-relaxed bg-white dark:bg-slate-950"
                    rows={3}
                  />
                </div>
              </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="flex-1 min-h-0 mt-0 flex flex-col data-[state=inactive]:hidden data-[state=active]:flex">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5 space-y-3.5">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-primary" /> Histórico de Contatos
                  </h3>
                  <span className="text-[11px] text-muted-foreground">{history.length} registro(s)</span>
                </div>

                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    Nenhum histórico encontrado para este lead.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {history.map((entry, idx) => {
                      const isCurrent = entry.id === currentData.callId;
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "rounded-xl border p-3.5 space-y-2 transition-all",
                            isCurrent
                              ? "border-primary/60 bg-primary/5 shadow-xs"
                              : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-primary" />
                              Tentativa {entry.attempt_number || (history.length - idx)}
                              {isCurrent && <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-1">atual</Badge>}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                              {entry.started_at
                                ? new Date(entry.started_at).toLocaleString("pt-BR", {
                                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                                  })
                                : "—"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 text-xs text-muted-foreground">
                            <span>Operador: <strong className="text-slate-700 dark:text-slate-300 font-medium">{entry.operator_name || "—"}</strong></span>
                            <span>Duração: <strong className="font-mono text-slate-700 dark:text-slate-300 font-medium">{entry.duration_seconds != null ? formatDuration(entry.duration_seconds) : isCurrent ? formatDuration(currentData.duration) + " (em andamento)" : "—"}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="text-muted-foreground">Resultado: </span>
                            <Badge variant="outline" className="text-[11px] rounded-md font-medium">
                              {entry.call_status === "completed" ? "✅ Atendida" :
                               entry.call_status === "no_answer" ? "📵 Não atendeu" :
                               entry.call_status === "failed" ? "⚠️ Falha" :
                               isCurrent ? "🔄 Em andamento" :
                               entry.call_status || "—"}
                            </Badge>
                            {entry.action_name && (
                              <Badge
                                variant="secondary"
                                className="text-[11px] rounded-md font-medium"
                                style={{ borderColor: entry.action_color || undefined }}
                              >
                                <span
                                  className="h-2 w-2 rounded-full inline-block mr-1"
                                  style={{ backgroundColor: entry.action_color || "hsl(var(--muted-foreground))" }}
                                />
                                {entry.action_name}
                              </Badge>
                            )}
                          </div>
                          {entry.custom_message && (
                            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                              <span className="text-muted-foreground font-medium">Mensagem: </span>
                              <span className="italic">"{entry.custom_message}"</span>
                            </div>
                          )}
                          {entry.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 p-2 rounded-lg">
                              <strong className="font-medium text-slate-700 dark:text-slate-300">Obs:</strong> {entry.notes}
                            </p>
                          )}
                          {entry.audio_url && (
                            <div className="mt-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-2">
                              <audio controls className="w-full h-7" src={entry.audio_url} preload="none">
                                Seu navegador não suporta áudio.
                              </audio>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Docked Footer Bar - Always visible without scroll */}
        <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800 px-4 py-2.5 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="text-[11px] text-muted-foreground truncate max-w-[210px]">
            {selectedActionId ? (
              <span className="font-semibold text-primary flex items-center gap-1.5 truncate">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{displayActions.find(a => a.id === selectedActionId)?.name}</span>
              </span>
            ) : (
              <span className="text-slate-400">Selecione uma ação</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-3 h-8 text-xs font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={!selectedActionId || isSaving}
              className="rounded-lg px-4 h-8 bg-gradient-to-r from-[#7C3AED] to-[#3B4DFF] hover:opacity-95 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              )}
              Salvar e Encerrar
            </Button>
          </div>
        </div>
    </div>
  );

  if (isDocked) {
    return (
      <div
        className={cn(
          "fixed bottom-0 right-0 md:bottom-6 md:right-6 z-[90]",
          "w-full md:w-[480px] h-[100dvh] md:h-[650px] max-h-[100dvh]",
          "flex flex-col bg-white dark:bg-slate-950 md:rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] border border-slate-200/80 dark:border-slate-800 overflow-hidden",
          "animate-in slide-in-from-bottom-5 fade-in duration-200 transition-all ease-out"
        )}
      >
        {innerContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { resetState(); useCallFloatingStore.getState().closeCallDialog(); } }}>
      <DialogContent className="max-w-2xl max-h-[92vh] p-0 gap-0 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950 flex flex-col [&>button]:hidden">
        {innerContent}
      </DialogContent>
    </Dialog>
  );
}
