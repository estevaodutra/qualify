import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Workflow,
  Play,
  Pause,
  Square,
  RotateCw,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Ban,
  GitBranch,
  Zap,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeadExecutions, LeadExecutionItem } from "@/hooks/useLeadExecutions";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface LeadExecutionsButtonProps {
  leadId?: string;
  leadPhone?: string;
  leadName?: string;
  disabled?: boolean;
}

export default function LeadExecutionsButton({
  leadId,
  leadPhone,
  leadName,
  disabled,
}: LeadExecutionsButtonProps) {
  const [open, setOpen] = useState(false);
  const { activeCompanyId } = useCompany();
  const leadExecutions = useLeadExecutions({ leadId, leadPhone });
  const {
    activeExecutions,
    historyExecutions,
    activeCount,
    isLoading,
    refetch,
    pauseExecution,
    isPausing,
    stopExecution,
    isStopping,
    resumeExecution,
    isResuming,
  } = leadExecutions;

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [confirmStopId, setConfirmStopId] = useState<string | null>(null);
  const [showTriggerPicker, setShowTriggerPicker] = useState(false);
  const [isStartingWf, setIsStartingWf] = useState(false);

  // Fetch available workflows to trigger
  const { data: workflows = [] } = useQuery({
    queryKey: ["available-workflows-for-lead", activeCompanyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("message_sequences")
        .select("id, name, description, active")
        .eq("active", true)
        .order("name", { ascending: true });
      return data || [];
    },
    enabled: showTriggerPicker && !!activeCompanyId,
  });

  const handleStartWorkflow = async (workflow: any) => {
    if (!leadId) {
      toast.error("Lead não identificado.");
      return;
    }
    setIsStartingWf(true);
    const toastId = toast.loading(`Iniciando workflow "${workflow.name}"...`);
    try {
      const { data, error } = await supabase.functions.invoke("start-workflow-for-leads", {
        body: { workflowId: workflow.id, leadIds: [leadId] },
      });
      if (error) throw error;
      toast.success(data?.message || `Workflow "${workflow.name}" iniciado com sucesso!`, { id: toastId });
      setShowTriggerPicker(false);
      refetch();
    } catch (err: any) {
      toast.error(`Erro ao iniciar workflow: ${err.message || err}`, { id: toastId });
    } finally {
      setIsStartingWf(false);
    }
  };

  const renderStatusBadge = (status: LeadExecutionItem["status"]) => {
    switch (status) {
      case "running":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 flex items-center gap-1 font-semibold text-[10px] px-1.5 py-0.2">
            <Loader2 className="h-2.5 w-2.5 animate-spin text-emerald-600" />
            Em execução
          </Badge>
        );
      case "waiting":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 flex items-center gap-1 font-semibold text-[10px] px-1.5 py-0.2">
            <Clock className="h-2.5 w-2.5 text-amber-600" />
            Aguardando
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20 flex items-center gap-1 font-semibold text-[10px] px-1.5 py-0.2">
            <Pause className="h-2.5 w-2.5 text-orange-600" />
            Pausada
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 flex items-center gap-1 font-semibold text-[10px] px-1.5 py-0.2">
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
            Concluída
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200 flex items-center gap-1 font-semibold text-[10px] px-1.5 py-0.2">
            <Ban className="h-2.5 w-2.5 text-slate-500" />
            Cancelada
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20 flex items-center gap-1 font-semibold text-[10px] px-1.5 py-0.2">
            <XCircle className="h-2.5 w-2.5 text-rose-600" />
            Erro
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true, locale: ptBR });
    } catch {
      return isoString;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled || (!leadId && !leadPhone)}
          title={
            activeCount > 0
              ? `Execuções (${activeCount} ativa${activeCount > 1 ? "s" : ""})`
              : "Execuções de workflows do lead"
          }
          className={cn(
            "relative h-9 w-9 shrink-0 mb-0.5 rounded-xl transition-all duration-300 cursor-pointer",
            activeCount > 0
              ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            (!leadId && !leadPhone) && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="relative flex items-center justify-center">
            <Workflow className="h-4.5 w-4.5 shrink-0" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-background"></span>
              </span>
            )}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        className="w-[420px] max-w-[95vw] p-0 bg-popover/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl z-[9990] overflow-hidden flex flex-col max-h-[520px]"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-border/40 bg-card/30 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Workflow className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground truncate">
                  Execuções do Lead
                </span>
                {leadName && (
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.2 rounded bg-muted truncate max-w-[120px]">
                    {leadName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => refetch()}
              title="Atualizar"
              disabled={isLoading}
            >
              <RotateCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Tabs & Trigger action */}
        <div className="px-3 pt-2.5 pb-2 border-b border-border/40 flex items-center justify-between gap-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
            <TabsList className="bg-muted/50 p-0.5 rounded-lg h-7">
              <TabsTrigger value="active" className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                Em Andamento
                {activeExecutions.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-primary text-primary-foreground">
                    {activeExecutions.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                Histórico
                {historyExecutions.length > 0 && (
                  <span className="ml-1 text-[9px] text-muted-foreground font-normal">
                    ({historyExecutions.length})
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] font-semibold rounded-lg border-dashed border-primary/40 text-primary hover:bg-primary/5 gap-1 px-2"
            onClick={() => setShowTriggerPicker(!showTriggerPicker)}
          >
            <Zap className="h-3 w-3 text-primary" />
            Iniciar
          </Button>
        </div>

        {/* Quick Trigger Sub-Panel */}
        {showTriggerPicker && (
          <div className="p-3 bg-primary/5 border-b border-primary/20 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                <Zap className="h-3 w-3 text-primary" />
                Iniciar workflow para o lead:
              </span>
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => setShowTriggerPicker(false)}
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {workflows.length === 0 ? (
                <div className="text-center py-2 text-[11px] text-muted-foreground">
                  Nenhum workflow ativo disponível.
                </div>
              ) : (
                workflows.map((wf: any) => (
                  <button
                    key={wf.id}
                    disabled={isStartingWf}
                    onClick={() => handleStartWorkflow(wf)}
                    className="text-left px-2.5 py-1.5 rounded-lg border border-primary/20 bg-background hover:bg-primary/10 transition-colors flex items-center justify-between group disabled:opacity-50 text-xs"
                  >
                    <span className="font-semibold text-foreground group-hover:text-primary truncate">
                      {wf.name}
                    </span>
                    <Zap className="h-3 w-3 text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {activeTab === "active" ? (
            isLoading && activeExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground space-y-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <p className="text-xs">Carregando execuções...</p>
              </div>
            ) : activeExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-2.5">
                <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Nenhuma automação em andamento</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Nenhum workflow ativo para este contato no momento.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTriggerPicker(true)}
                  className="rounded-lg text-xs font-semibold gap-1 h-7 px-2.5"
                >
                  <Zap className="h-3 w-3 text-primary" />
                  Iniciar Workflow
                </Button>
              </div>
            ) : (
              activeExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="p-3 rounded-xl border border-border/60 bg-card/60 hover:border-primary/30 transition-all shadow-sm space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate flex items-center gap-1.5">
                        <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
                        {exec.sequenceName}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Iniciado {formatRelativeTime(exec.startedAt)}
                      </p>
                    </div>

                    {renderStatusBadge(exec.status)}
                  </div>

                  {/* Step info */}
                  <div className="p-2 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground truncate">
                      {exec.currentNodeName || "Aguardando próxima etapa"}
                    </span>
                    {exec.resumeAt && (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.2 rounded shrink-0">
                        {format(new Date(exec.resumeAt), "HH:mm:ss")}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/30">
                    {confirmStopId === exec.id ? (
                      <div className="flex items-center gap-1.5 w-full justify-between animate-in fade-in duration-150">
                        <span className="text-[10px] text-destructive font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Parar execução?
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 rounded"
                            onClick={() => setConfirmStopId(null)}
                          >
                            Não
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isStopping}
                            className="h-6 text-[10px] px-2 rounded font-bold"
                            onClick={() => {
                              stopExecution(exec.id);
                              setConfirmStopId(null);
                            }}
                          >
                            Sim, parar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {exec.status === "paused" ? (
                          <Button
                            variant="default"
                            size="sm"
                            disabled={isResuming}
                            onClick={() => resumeExecution(exec.id)}
                            className="h-7 text-xs font-semibold gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5"
                          >
                            {isResuming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
                            Retomar
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isPausing}
                            onClick={() => pauseExecution(exec.id)}
                            className="h-7 text-xs font-semibold gap-1 rounded-lg border-orange-500/30 text-orange-600 hover:bg-orange-500/10 px-2.5"
                          >
                            {isPausing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
                            Pausar
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isStopping}
                          onClick={() => setConfirmStopId(exec.id)}
                          className="h-7 text-xs font-semibold gap-1 rounded-lg border-destructive/30 text-destructive hover:bg-destructive/10 px-2"
                        >
                          <Square className="h-3 w-3 fill-current text-destructive" />
                          Parar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            historyExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-1.5">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground/40" />
                <p className="text-xs">Nenhum histórico registrado.</p>
              </div>
            ) : (
              historyExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="p-2.5 rounded-xl border border-border/40 bg-card/40 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{exec.sequenceName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(exec.startedAt), "dd/MM HH:mm")}
                      {exec.durationMs != null && ` • ${Math.round(exec.durationMs / 1000)}s`}
                    </p>
                    {exec.errorMessage && (
                      <p className="text-[10px] text-destructive truncate mt-0.5">
                        {exec.errorMessage}
                      </p>
                    )}
                  </div>

                  {renderStatusBadge(exec.status)}
                </div>
              ))
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
