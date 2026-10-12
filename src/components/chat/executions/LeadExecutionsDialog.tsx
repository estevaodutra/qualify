import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  Calendar,
  AlertTriangle,
  Send,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeadExecutions, LeadExecutionItem } from "@/hooks/useLeadExecutions";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface LeadExecutionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  leadPhone?: string;
  leadName?: string;
}

export default function LeadExecutionsDialog({
  open,
  onOpenChange,
  leadId,
  leadPhone,
  leadName,
}: LeadExecutionsDialogProps) {
  const { activeCompanyId } = useCompany();
  const {
    activeExecutions,
    historyExecutions,
    isLoading,
    refetch,
    pauseExecution,
    isPausing,
    stopExecution,
    isStopping,
    resumeExecution,
    isResuming,
  } = useLeadExecutions({ leadId, leadPhone });

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [executionToStop, setExecutionToStop] = useState<LeadExecutionItem | null>(null);
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
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 flex items-center gap-1.5 font-semibold text-xs">
            <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
            Em execução
          </Badge>
        );
      case "waiting":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 flex items-center gap-1.5 font-semibold text-xs">
            <Clock className="h-3 w-3 text-amber-600" />
            Aguardando
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20 flex items-center gap-1.5 font-semibold text-xs">
            <Pause className="h-3 w-3 text-orange-600" />
            Pausada
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200 flex items-center gap-1.5 font-semibold text-xs">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Concluída
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200 flex items-center gap-1.5 font-semibold text-xs">
            <Ban className="h-3 w-3 text-slate-500" />
            Cancelada
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20 flex items-center gap-1.5 font-semibold text-xs">
            <XCircle className="h-3 w-3 text-rose-600" />
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-2xl gap-0 max-h-[85vh] flex flex-col">
          {/* Header */}
          <DialogHeader className="p-5 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  Execuções do Lead
                  {leadName && (
                    <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-md bg-muted">
                      {leadName}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Gerencie automações e fluxos em andamento para este contato.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-border/60"
              onClick={() => refetch()}
              title="Atualizar execuções"
              disabled={isLoading}
            >
              <RotateCw className={cn("h-4 w-4 text-muted-foreground", isLoading && "animate-spin")} />
            </Button>
          </DialogHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-3 border-b border-border/40 flex items-center justify-between">
              <TabsList className="bg-muted/50 p-1 rounded-xl h-9">
                <TabsTrigger value="active" className="text-xs font-semibold px-3 py-1 rounded-lg">
                  Em Andamento
                  {activeExecutions.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                      {activeExecutions.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs font-semibold px-3 py-1 rounded-lg">
                  Histórico
                  {historyExecutions.length > 0 && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                      ({historyExecutions.length})
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold rounded-xl border-dashed border-primary/40 text-primary hover:bg-primary/5 gap-1.5"
                onClick={() => setShowTriggerPicker(!showTriggerPicker)}
              >
                <Zap className="h-3.5 w-3.5 text-primary" />
                Iniciar Workflow
              </Button>
            </div>

            {/* Quick Trigger Picker Sub-Panel */}
            {showTriggerPicker && (
              <div className="p-4 bg-primary/5 border-b border-primary/20 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    Selecione um workflow para iniciar para este lead:
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2 text-muted-foreground"
                    onClick={() => setShowTriggerPicker(false)}
                  >
                    Fechar
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {workflows.length === 0 ? (
                    <div className="col-span-2 text-center py-3 text-xs text-muted-foreground">
                      Nenhum workflow ativo cadastrado.
                    </div>
                  ) : (
                    workflows.map((wf: any) => (
                      <button
                        key={wf.id}
                        disabled={isStartingWf}
                        onClick={() => handleStartWorkflow(wf)}
                        className="text-left p-2.5 rounded-xl border border-primary/20 bg-background hover:bg-primary/10 transition-colors flex flex-col justify-between group disabled:opacity-50"
                      >
                        <p className="text-xs font-bold text-foreground group-hover:text-primary truncate">
                          {wf.name}
                        </p>
                        {wf.description && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {wf.description}
                          </p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab: Em Andamento */}
            <TabsContent value="active" className="flex-1 overflow-y-auto p-5 m-0 space-y-3">
              {isLoading && activeExecutions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs">Carregando execuções...</p>
                </div>
              ) : activeExecutions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
                    <Workflow className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Nenhuma automação em andamento</p>
                    <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                      Não há nenhuma sequência ou workflow executando para este lead no momento.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTriggerPicker(true)}
                    className="rounded-xl text-xs font-semibold gap-1.5"
                  >
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    Iniciar um Workflow Agora
                  </Button>
                </div>
              ) : (
                activeExecutions.map((exec) => (
                  <div
                    key={exec.id}
                    className="p-4 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-all shadow-sm space-y-3"
                  >
                    {/* Top Row: Title + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <GitBranch className="h-4 w-4 text-primary" />
                          {exec.sequenceName}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          <span>Iniciado {formatRelativeTime(exec.startedAt)}</span>
                          {exec.triggerType && (
                            <>
                              <span>•</span>
                              <span className="capitalize">Gatilho: {exec.triggerType}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {renderStatusBadge(exec.status)}
                    </div>

                    {/* Step / Current Node info */}
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground truncate">
                          Etapa atual: {exec.currentNodeName || "Aguardando próxima etapa"}
                        </span>
                      </div>

                      {exec.resumeAt && (
                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md shrink-0">
                          Retoma: {format(new Date(exec.resumeAt), "HH:mm:ss")}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: Pause, Resume, Stop */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                      {exec.status === "paused" ? (
                        <Button
                          variant="default"
                          size="sm"
                          disabled={isResuming}
                          onClick={() => resumeExecution(exec.id)}
                          className="h-8 rounded-lg text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {isResuming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                          Retomar Execução
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPausing}
                          onClick={() => pauseExecution(exec.id)}
                          className="h-8 rounded-lg text-xs font-semibold gap-1.5 border-orange-500/30 text-orange-600 hover:bg-orange-500/10"
                        >
                          {isPausing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                          Pausar
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isStopping}
                        onClick={() => setExecutionToStop(exec)}
                        className="h-8 rounded-lg text-xs font-semibold gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        <Square className="h-3.5 w-3.5 fill-current text-destructive" />
                        Parar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Tab: Histórico */}
            <TabsContent value="history" className="flex-1 overflow-y-auto p-5 m-0 space-y-3">
              {historyExecutions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs">Nenhum histórico de execução registrado para este lead.</p>
                </div>
              ) : (
                historyExecutions.map((exec) => (
                  <div
                    key={exec.id}
                    className="p-3.5 rounded-xl border border-border/40 bg-card/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground truncate">{exec.sequenceName}</p>
                        {renderStatusBadge(exec.status)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{format(new Date(exec.startedAt), "dd/MM/yyyy HH:mm")}</span>
                        {exec.durationMs != null && (
                          <span>• Duração: {Math.round(exec.durationMs / 1000)}s</span>
                        )}
                      </div>
                      {exec.errorMessage && (
                        <p className="text-[11px] text-destructive truncate">
                          Motivo: {exec.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Stopping Execution */}
      <AlertDialog open={!!executionToStop} onOpenChange={(open) => !open && setExecutionToStop(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Parar Execução de Automação?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta ação interromperá definitivamente a execução do workflow{" "}
              <strong>"{executionToStop?.sequenceName}"</strong> para este lead. As mensagens agendadas e nós seguintes serão cancelados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (executionToStop) {
                  stopExecution(executionToStop.id);
                  setExecutionToStop(null);
                }
              }}
            >
              Sim, Parar Execução
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
