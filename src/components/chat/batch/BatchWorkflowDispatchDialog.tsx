import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Play,
  Pause,
  Square,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Workflow,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChatConversation } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

interface BatchWorkflowDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: ChatConversation[];
  instances?: Array<{ id: string; name: string; phoneNumber?: string; status: string }>;
  onComplete?: () => void;
}

interface DispatchItemStatus {
  conversationId: string;
  name: string;
  phone: string;
  status: "pending" | "waiting_delay" | "sending" | "success" | "error" | "cancelled";
  error?: string;
}

export default function BatchWorkflowDispatchDialog({
  open,
  onOpenChange,
  conversations,
  instances = [],
  onComplete,
}: BatchWorkflowDispatchDialogProps) {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  // Settings State
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [minMinutes, setMinMinutes] = useState<number>(3);
  const [maxMinutes, setMaxMinutes] = useState<number>(5);
  const [instanceMode, setInstanceMode] = useState<string>("original"); // "original" or specific instance_id

  // Execution State
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCancelled, setIsCancelled] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number>(0);
  const [itemsStatus, setItemsStatus] = useState<DispatchItemStatus[]>([]);

  // Refs for execution loop control
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isCancelledRef.current = isCancelled;
  }, [isCancelled]);

  // Fetch active workflows
  const { data: workflows = [], isLoading: isLoadingWorkflows } = useQuery({
    queryKey: ["active-message-sequences", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_sequences")
        .select("id, name, description, active")
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!activeCompanyId,
  });

  // Initialize dispatch item list when dialog opens or selection changes
  useEffect(() => {
    if (open) {
      setIsExecuting(false);
      setIsPaused(false);
      setIsCancelled(false);
      setIsCompleted(false);
      setCountdownRemaining(0);
      isPausedRef.current = false;
      isCancelledRef.current = false;

      const items: DispatchItemStatus[] = conversations.map((c) => {
        const phone = c.lead?.phone || c.contact_phone || "";
        const isGrp = phone.includes("@g.us") || phone.includes("-group") || phone.startsWith("1203");
        const name = c.lead?.name?.trim() || (c.contact_name && c.contact_name !== "Grupo" ? c.contact_name.trim() : null) || (isGrp ? "Grupo WhatsApp" : phone || "Sem Nome");
        return {
          conversationId: c.id,
          name,
          phone,
          status: "pending",
        };
      });
      setItemsStatus(items);
    }
  }, [open, conversations]);

  // Helper to ensure lead exists
  const resolveLeadId = async (conv: ChatConversation): Promise<string | null> => {
    if (conv.lead_id) return conv.lead_id;

    const phone = conv.lead?.phone || conv.contact_phone || "";
    const cleanDigits = phone.replace("@g.us", "").replace("-group", "").replace(/\D/g, "");
    const isGrp = Boolean(
      phone.includes("@g.us") ||
      phone.includes("-group") ||
      cleanDigits.startsWith("1203") ||
      (conv.lead?.custom_fields as any)?.is_group
    );
    const groupJid = phone.includes("@g.us") ? phone : (cleanDigits.startsWith("1203") ? `${cleanDigits}@g.us` : undefined);

    if (!cleanDigits && !phone) return null;
    if (!activeCompanyId) return null;

    try {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("company_id", activeCompanyId)
        .eq("phone", cleanDigits || phone)
        .maybeSingle();

      if (existingLead?.id) {
        await supabase.from("chat_conversations").update({ lead_id: existingLead.id }).eq("id", conv.id);
        return existingLead.id;
      }

      const { data: newLead } = await supabase
        .from("leads")
        .insert({
          company_id: activeCompanyId,
          name: conv.contact_name || (isGrp ? "Grupo WhatsApp" : cleanDigits),
          phone: cleanDigits || phone,
          status: "novo",
          source_type: isGrp ? "whatsapp_group" : "whatsapp_inbound",
          custom_fields: isGrp ? { is_group: true, group_jid: groupJid } : {},
        })
        .select("id")
        .single();

      if (newLead?.id) {
        await supabase.from("chat_conversations").update({ lead_id: newLead.id }).eq("id", conv.id);
        return newLead.id;
      }
    } catch (err) {
      console.error("Erro ao resolver lead em massa:", err);
    }
    return null;
  };

  // Wait utility with pause/cancel support and countdown
  const waitCadence = async (seconds: number) => {
    let remaining = seconds;
    setCountdownRemaining(remaining);

    while (remaining > 0) {
      if (isCancelledRef.current) break;

      // Handle pause
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise((r) => setTimeout(r, 400));
      }

      if (isCancelledRef.current) break;

      await new Promise((r) => setTimeout(r, 1000));
      remaining -= 1;
      setCountdownRemaining(Math.max(0, remaining));
    }
    setCountdownRemaining(0);
  };

  const formatTimeRemaining = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `${secs}s`;
  };

  // Run the batch execution
  const handleStartDispatch = async () => {
    if (!selectedWorkflowId) {
      toast.error("Por favor, selecione um fluxo para disparar.");
      return;
    }

    if (conversations.length === 0) {
      toast.error("Nenhuma conversa selecionada.");
      return;
    }

    setIsExecuting(true);
    setIsPaused(false);
    setIsCancelled(false);
    setIsCompleted(false);
    isPausedRef.current = false;
    isCancelledRef.current = false;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < conversations.length; i++) {
      if (isCancelledRef.current) {
        // Mark all remaining as cancelled
        setItemsStatus((prev) =>
          prev.map((item, idx) => (idx >= i ? { ...item, status: "cancelled" } : item))
        );
        break;
      }

      // Check pause
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise((r) => setTimeout(r, 400));
      }
      if (isCancelledRef.current) break;

      const conv = conversations[i];

      // Mark current item as sending
      setItemsStatus((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: "sending" } : item))
      );

      try {
        const targetLeadId = await resolveLeadId(conv);
        if (!targetLeadId) {
          throw new Error("Não foi possível identificar ou cadastrar o lead deste contato.");
        }

        const phone = conv.lead?.phone || conv.contact_phone || "";
        const cleanDigits = phone.replace("@g.us", "").replace("-group", "").replace(/\D/g, "");
        const isGrp = Boolean(
          phone.includes("@g.us") ||
          phone.includes("-group") ||
          cleanDigits.startsWith("1203") ||
          (conv.lead?.custom_fields as any)?.is_group
        );
        const groupJid = phone.includes("@g.us") ? phone : (cleanDigits.startsWith("1203") ? `${cleanDigits}@g.us` : undefined);

        const targetInstanceId =
          instanceMode === "original"
            ? (conv.instance_id || undefined)
            : instanceMode;

        const { data, error } = await supabase.functions.invoke("start-workflow-for-leads", {
          body: {
            workflowId: selectedWorkflowId,
            leadIds: [targetLeadId],
            instanceId: targetInstanceId,
            groupJid,
            isGroup: isGrp,
          },
        });

        if (error) throw error;

        successCount++;
        setItemsStatus((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "success" } : item))
        );
      } catch (err: any) {
        console.error("Falha ao disparar para conversa:", conv.id, err);
        failCount++;
        setItemsStatus((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: "error", error: err.message || "Erro ao iniciar workflow" }
              : item
          )
        );
      }

      // If not the last item and not cancelled, wait cadence
      if (i < conversations.length - 1 && !isCancelledRef.current) {
        // Mark next as waiting_delay
        setItemsStatus((prev) =>
          prev.map((item, idx) => (idx === i + 1 ? { ...item, status: "waiting_delay" } : item))
        );

        const safeMin = Math.max(1, Math.min(minMinutes, maxMinutes));
        const safeMax = Math.max(safeMin, Math.max(minMinutes, maxMinutes));
        const minSec = safeMin * 60;
        const maxSec = safeMax * 60;
        const delaySec = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;

        await waitCadence(delaySec);
      }
    }

    setIsExecuting(false);
    setIsCompleted(true);

    if (isCancelledRef.current) {
      toast.info(`Disparos interrompidos: ${successCount} enviados, ${failCount} falhas.`);
    } else {
      toast.success(`Disparo em massa concluído! ${successCount} enviados com sucesso.`);
    }

    queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
  };

  const completedCount = itemsStatus.filter(
    (item) => item.status === "success" || item.status === "error" || item.status === "cancelled"
  ).length;
  const progressPercent = itemsStatus.length > 0 ? Math.round((completedCount / itemsStatus.length) * 100) : 0;
  const successTotal = itemsStatus.filter((i) => i.status === "success").length;
  const errorTotal = itemsStatus.filter((i) => i.status === "error").length;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (isExecuting) {
        toast.warning("Aguarde a conclusão ou interrompa o disparo antes de fechar.");
        return;
      }
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <span>Disparo de Fluxo em Massa</span>
                <Badge variant="secondary" className="font-semibold text-xs bg-primary/15 text-primary border-primary/20">
                  {conversations.length} selecionado{conversations.length > 1 ? "s" : ""}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Dispare uma automação para os contatos selecionados com controle de cadência e intervalo anti-ban.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Dialog Body */}
        <div className="p-5 space-y-4 max-h-[68vh] overflow-y-auto">
          {/* If NOT executing and NOT completed, show setup form */}
          {!isExecuting && !isCompleted ? (
            <>
              {/* Selected Contacts Summary Chips */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>Destinatários selecionados ({conversations.length}):</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {itemsStatus.map((item) => (
                    <span
                      key={item.conversationId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-background border border-border/50 text-foreground"
                      title={item.phone}
                    >
                      <span className="truncate max-w-[130px]">{item.name}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Workflow Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Workflow className="h-3.5 w-3.5 text-primary" />
                  <span>Fluxo / Sequência a Disparar *</span>
                </Label>
                {isLoadingWorkflows ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-xl text-xs text-muted-foreground bg-muted/20">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Carregando fluxos disponíveis...</span>
                  </div>
                ) : workflows.length === 0 ? (
                  <div className="p-3 text-center border border-dashed rounded-xl text-xs text-muted-foreground">
                    Nenhum fluxo ativo encontrado. Crie ou ative um fluxo antes de disparar.
                  </div>
                ) : (
                  <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                    <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-border/60">
                      <SelectValue placeholder="Selecione o fluxo que deseja executar..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 rounded-xl">
                      {workflows.map((wf) => (
                        <SelectItem key={wf.id} value={wf.id} className="text-xs py-2">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{wf.name}</span>
                            {wf.description && (
                              <span className="text-[11px] text-muted-foreground line-clamp-1">
                                {wf.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Cadence & Interval Configuration */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 via-background to-muted/20 border border-border/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>Intervalo entre disparos (Cadência em Minutos)</span>
                  </Label>
                  <span className="text-xs font-extrabold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                    De {minMinutes} a {maxMinutes} minutos
                  </span>
                </div>

                {/* Range inputs: De X a Y minutos */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Definir intervalo personalizado:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 bg-background border border-border/60 rounded-xl px-3 py-1.5 shadow-xs">
                      <span className="text-xs text-muted-foreground font-semibold">De</span>
                      <Input
                        type="number"
                        min={1}
                        max={180}
                        value={minMinutes}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value) || 1);
                          setMinMinutes(val);
                          if (val > maxMinutes) setMaxMinutes(val);
                        }}
                        className="h-7 w-16 text-center font-bold text-xs p-0 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <span className="text-xs text-muted-foreground font-semibold">min</span>
                    </div>

                    <div className="flex items-center gap-2 bg-background border border-border/60 rounded-xl px-3 py-1.5 shadow-xs">
                      <span className="text-xs text-muted-foreground font-semibold">Até</span>
                      <Input
                        type="number"
                        min={1}
                        max={180}
                        value={maxMinutes}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value) || 1);
                          setMaxMinutes(val);
                          if (val < minMinutes) setMinMinutes(val);
                        }}
                        className="h-7 w-16 text-center font-bold text-xs p-0 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <span className="text-xs text-muted-foreground font-semibold">minutos</span>
                    </div>
                  </div>
                </div>

                {/* Quick Presets Requested by User: 3 a 5 min, 6 a 10 min, etc. */}
                <div className="space-y-1.5 pt-1 border-t border-border/30">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Intervalos sugeridos (Anti-ban WhatsApp):</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: "3 a 5 min", min: 3, max: 5 },
                      { label: "5 a 8 min", min: 5, max: 8 },
                      { label: "6 a 10 min", min: 6, max: 10 },
                      { label: "10 a 15 min", min: 10, max: 15 },
                      { label: "15 a 20 min", min: 15, max: 20 },
                    ].map((p) => {
                      const isSelected = minMinutes === p.min && maxMinutes === p.max;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            setMinMinutes(p.min);
                            setMaxMinutes(p.max);
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border shrink-0 cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-background hover:bg-muted text-muted-foreground border-border/40"
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Anti-ban Safe Note */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px]">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Intervalo longo e dinâmico sorteado aleatoriamente entre {minMinutes} e {maxMinutes} minutos para cada lead. Essa alternância protege seus números contra bloqueios e banimentos do WhatsApp.
                  </span>
                </div>
              </div>

              {/* Instance Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Smartphone className="h-3.5 w-3.5 text-primary" />
                  <span>Conexão WhatsApp (Instância de Envio)</span>
                </Label>
                <Select value={instanceMode} onValueChange={setInstanceMode}>
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="original" className="text-xs py-2 font-semibold">
                      ⚡ Usar conexão original de cada conversa (Recomendado)
                    </SelectItem>
                    {instances.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id} className="text-xs py-2">
                        {inst.name} {inst.phoneNumber ? `(${inst.phoneNumber})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            /* Execution & Progress View */
            <div className="space-y-4">
              {/* Progress Summary Card */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">
                    {isCompleted
                      ? "Disparos Finalizados"
                      : isPaused
                      ? "Disparos Pausados"
                      : "Executando Disparos..."}
                  </span>
                  <span className="font-bold text-primary">
                    {completedCount} de {itemsStatus.length} ({progressPercent}%)
                  </span>
                </div>

                <Progress value={progressPercent} className="h-2 rounded-full" />

                {/* Live Countdown & Stats */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {successTotal} sucesso
                    </span>
                    {errorTotal > 0 && (
                      <span className="text-red-500 font-semibold flex items-center gap-1">
                        <XCircle className="h-3.5 w-3.5" /> {errorTotal} falhas
                      </span>
                    )}
                  </div>

                  {countdownRemaining > 0 && !isPaused && !isCancelled && (
                    <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full text-[11px] animate-pulse">
                      <Clock className="h-3 w-3" />
                      <span>Próximo disparo em {formatTimeRemaining(countdownRemaining)}...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Execution Controls */}
              {isExecuting && (
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsPaused(!isPaused)}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />
                        <span>Retomar</span>
                      </>
                    ) : (
                      <>
                        <Pause className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span>Pausar</span>
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setIsCancelled(true);
                      isCancelledRef.current = true;
                    }}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    <span>Interromper</span>
                  </Button>
                </div>
              )}

              {/* Item by Item Realtime Status List */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">
                  Status detalhado dos envios:
                </Label>
                <div className="max-h-52 overflow-y-auto divide-y divide-border/30 rounded-xl border border-border/50 bg-background/50">
                  {itemsStatus.map((item, idx) => (
                    <div
                      key={item.conversationId}
                      className={cn(
                        "p-2.5 flex items-center justify-between gap-2 text-xs transition-colors",
                        item.status === "sending" && "bg-primary/10 font-semibold",
                        item.status === "waiting_delay" && "bg-amber-500/5"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] text-muted-foreground w-4 text-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">{item.phone}</p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {item.status === "pending" && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                            <Clock className="h-2.5 w-2.5" /> Aguardando
                          </Badge>
                        )}
                        {item.status === "waiting_delay" && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-500/10 border-amber-500/20 gap-1 animate-pulse">
                            <Clock className="h-2.5 w-2.5" /> Na fila
                          </Badge>
                        )}
                        {item.status === "sending" && (
                          <Badge variant="default" className="text-[10px] gap-1 bg-primary text-primary-foreground">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" /> Disparando...
                          </Badge>
                        )}
                        {item.status === "success" && (
                          <Badge className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Sucesso
                          </Badge>
                        )}
                        {item.status === "error" && (
                          <Badge variant="destructive" className="text-[10px] gap-1" title={item.error}>
                            <XCircle className="h-2.5 w-2.5" /> Falha
                          </Badge>
                        )}
                        {item.status === "cancelled" && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Cancelado
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <DialogFooter className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-between sm:justify-between">
          {!isExecuting && !isCompleted ? (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleStartDispatch}
                disabled={!selectedWorkflowId || conversations.length === 0}
                className="h-9 px-4 text-xs font-semibold gap-1.5 shadow-md shadow-primary/20"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Iniciar Disparos ({conversations.length})</span>
              </Button>
            </>
          ) : isCompleted ? (
            <div className="w-full flex justify-end">
              <Button
                onClick={() => {
                  onOpenChange(false);
                  if (onComplete) onComplete();
                }}
                className="h-9 px-5 text-xs font-semibold"
              >
                Concluir e Fechar
              </Button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Processando envio em cadência...</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCancelled(true);
                  isCancelledRef.current = true;
                }}
                className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
              >
                Parar restante
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
