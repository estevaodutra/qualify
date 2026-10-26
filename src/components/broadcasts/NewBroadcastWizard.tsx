import { useState, useMemo, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useBroadcastAudience } from "@/hooks/useBroadcastAudience";
import { calculateBroadcastSchedule } from "@/utils/broadcastUtils";
import {
  BroadcastDistributionMode,
  BroadcastAudienceFilters,
  CreateBroadcastInput,
} from "@/types/broadcast.types";
import {
  GitBranch,
  Users,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Search,
  Radio,
  Send,
  Sliders,
  ChevronRight,
  Layers,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NewBroadcastWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateBroadcastInput) => Promise<any>;
  isCreating: boolean;
}

const STEPS = [
  { id: 1, title: "Fluxo", description: "Nome e ação a executar" },
  { id: 2, title: "Audiência", description: "Segmentação de leads" },
  { id: 3, title: "Cadência Anti-Ban", description: "Distribuição e limites" },
  { id: 4, title: "Revisão", description: "Confirmar e disparar" },
];

export function NewBroadcastWizard({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
}: NewBroadcastWizardProps) {
  const { activeCompanyId } = useCompany();
  const [currentStep, setCurrentStep] = useState(1);

  // Form State - Step 1: Info & Workflow
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workflowId, setWorkflowId] = useState("");
  const [instanceId, setInstanceId] = useState<string>("default");

  // Form State - Step 2: Audience Filters
  const [filters, setFilters] = useState<BroadcastAudienceFilters>({
    status: "all",
    tags: [],
    sourceGroupName: "all",
    search: "",
  });
  const [deselectedLeadIds, setDeselectedLeadIds] = useState<Set<string>>(new Set());

  // Form State - Step 3: Cadence & Anti-Ban
  const [distributionMode, setDistributionMode] = useState<BroadcastDistributionMode>("daily_limit");
  const [dailyLimit, setDailyLimit] = useState<number>(10);
  const [workdaysOnly, setWorkdaysOnly] = useState<boolean>(true);
  const [sendTimeStart, setSendTimeStart] = useState("09:00");
  const [sendTimeEnd, setSendTimeEnd] = useState("18:00");
  const [startDateStr, setStartDateStr] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Fetch Workflows
  const { data: workflows = [], isLoading: isLoadingWorkflows } = useQuery({
    queryKey: ["broadcast_wizard_workflows", activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("message_sequences")
        .select("id, name, description, trigger_type, active")
        .order("name", { ascending: true });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch WhatsApp Instances
  const { data: instances = [] } = useQuery({
    queryKey: ["broadcast_wizard_instances", activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("instances")
        .select("id, name, phone_number, status")
        .order("name", { ascending: true });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    },
    enabled: open,
  });

  // Audience query hook
  const {
    totalMatchingLeads,
    matchedLeadIds,
    isCountLoading,
    previewLeads,
    isPreviewLoading,
    availableTags,
    availableGroups,
    previewPage,
    setPreviewPage,
  } = useBroadcastAudience(filters);

  // Selected lead IDs excluding manually deselected
  const effectiveSelectedLeadIds = useMemo(() => {
    return matchedLeadIds.filter((id) => !deselectedLeadIds.has(id));
  }, [matchedLeadIds, deselectedLeadIds]);

  // Selected Workflow object
  const selectedWorkflow = useMemo(() => {
    return workflows.find((w) => w.id === workflowId);
  }, [workflows, workflowId]);

  // Real-time schedule calculation
  const scheduleCalc = useMemo(() => {
    const total = effectiveSelectedLeadIds.length;
    const start = startDateStr ? new Date(`${startDateStr}T${sendTimeStart}:00`) : new Date();

    return calculateBroadcastSchedule({
      totalLeads: total,
      dailyLimit: distributionMode === "immediate" ? total : dailyLimit,
      startDate: start,
      workdaysOnly,
      sendTimeEnd,
    });
  }, [effectiveSelectedLeadIds.length, distributionMode, dailyLimit, startDateStr, sendTimeStart, workdaysOnly, sendTimeEnd]);

  // Reset wizard on open
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      setName("");
      setDescription("");
      setWorkflowId("");
      setInstanceId("default");
      setFilters({ status: "all", tags: [], sourceGroupName: "all", search: "" });
      setDeselectedLeadIds(new Set());
      setDistributionMode("daily_limit");
      setDailyLimit(10);
      setWorkdaysOnly(true);
      setStartDateStr(new Date().toISOString().split("T")[0]);
    }
  }, [open]);

  // Handlers for audience selection
  const toggleTagFilter = (tag: string) => {
    setFilters((prev) => {
      const currentTags = prev.tags || [];
      const exists = currentTags.includes(tag);
      return {
        ...prev,
        tags: exists ? currentTags.filter((t) => t !== tag) : [...currentTags, tag],
      };
    });
  };

  const toggleLeadSelection = (leadId: string) => {
    setDeselectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  // Validation
  const canAdvance = useMemo(() => {
    if (currentStep === 1) {
      return !!name.trim() && !!workflowId;
    }
    if (currentStep === 2) {
      return effectiveSelectedLeadIds.length > 0;
    }
    if (currentStep === 3) {
      return distributionMode === "immediate" || dailyLimit > 0;
    }
    return true;
  }, [currentStep, name, workflowId, effectiveSelectedLeadIds.length, distributionMode, dailyLimit]);

  const handleNext = () => {
    if (!canAdvance) {
      if (currentStep === 1 && !name.trim()) toast.error("Informe um nome para o disparo.");
      else if (currentStep === 1 && !workflowId) toast.error("Selecione um fluxo para ser executado.");
      else if (currentStep === 2 && effectiveSelectedLeadIds.length === 0) toast.error("Nenhum lead selecionado na audiência.");
      return;
    }
    setCurrentStep((prev) => Math.min(STEPS.length, prev + 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleConfirmLaunch = async () => {
    if (!name.trim() || !workflowId || effectiveSelectedLeadIds.length === 0) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const payload: CreateBroadcastInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        workflowId,
        instanceId: instanceId !== "default" ? instanceId : undefined,
        distributionMode,
        dailyLimit: distributionMode === "immediate" ? effectiveSelectedLeadIds.length : dailyLimit,
        sendTimeStart,
        sendTimeEnd,
        workdaysOnly,
        scheduledAt: `${startDateStr}T${sendTimeStart}:00`,
        filters,
        selectedLeadIds: effectiveSelectedLeadIds,
      };

      await onSubmit(payload);
      onOpenChange(false);
    } catch (err: any) {
      // Error handled in hook toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        {/* Header with Steps */}
        <DialogHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Radio className="w-5 h-5 text-primary animate-pulse" />
                Novo Disparo em Massa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Selecione a audiência, o fluxo de disparo e configure a cadência anti-ban.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
              Passo {currentStep} de {STEPS.length}
            </Badge>
          </div>

          {/* Stepper Navigation */}
          <div className="grid grid-cols-4 gap-2 pt-4">
            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isPast = step.id < currentStep;
              return (
                <div
                  key={step.id}
                  className={`flex flex-col border-t-2 pt-2 transition-all ${
                    isActive
                      ? "border-primary text-primary"
                      : isPast
                      ? "border-emerald-500 text-foreground"
                      : "border-border/60 text-muted-foreground"
                  }`}
                >
                  <span className="text-[11px] font-semibold flex items-center gap-1">
                    {isPast && <CheckCircle2 className="w-3 h-3 text-emerald-500 inline" />}
                    {step.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground hidden sm:inline truncate">
                    {step.description}
                  </span>
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* Content Body based on step */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[360px]">
          {/* STEP 1: IDENTIFICAÇÃO E FLUXO */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="broadcast-name" className="text-sm font-semibold">
                  Nome do Disparo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="broadcast-name"
                  placeholder="Ex: Campanha de Reativação WhatsApp - Leads Frios"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 text-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="broadcast-desc" className="text-sm">
                  Descrição ou Objetivo (opcional)
                </Label>
                <Textarea
                  id="broadcast-desc"
                  placeholder="Ex: Disparo de fluxo para reengajar contatos que não respondem há mais de 30 dias..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="broadcast-workflow" className="text-sm font-semibold flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-primary" />
                    Fluxo a Disparar <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {workflows.length} fluxos disponíveis
                  </span>
                </div>
                <Select value={workflowId} onValueChange={setWorkflowId}>
                  <SelectTrigger id="broadcast-workflow" className="h-10 text-sm">
                    <SelectValue placeholder="Selecione o fluxo a ser executado..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {isLoadingWorkflows ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        Carregando fluxos...
                      </div>
                    ) : workflows.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        Nenhum fluxo encontrado. Crie um fluxo em Workflows primeiro.
                      </div>
                    ) : (
                      workflows.map((wf) => (
                        <SelectItem key={wf.id} value={wf.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{wf.name}</span>
                            {wf.trigger_type && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1 text-muted-foreground">
                                {wf.trigger_type}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedWorkflow && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Fluxo Selecionado:</span> {selectedWorkflow.name}
                    {selectedWorkflow.description && <p className="mt-1">{selectedWorkflow.description}</p>}
                  </div>
                )}
              </div>

              {/* Optional instance selection */}
              <div className="space-y-2 pt-1">
                <Label htmlFor="broadcast-instance" className="text-sm flex items-center justify-between">
                  <span>Linha / Instância WhatsApp (Opcional)</span>
                  <span className="text-xs text-muted-foreground">Padrão da empresa se não especificado</span>
                </Label>
                <Select value={instanceId} onValueChange={setInstanceId}>
                  <SelectTrigger id="broadcast-instance" className="h-9 text-xs">
                    <SelectValue placeholder="Usar linha ativa do contato / padrão da empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Usar conexão padrão da empresa</SelectItem>
                    {instances.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.name} {inst.phone_number ? `(${inst.phone_number})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* STEP 2: AUDIÊNCIA */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              {/* Audience counter pill */}
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Audiência Selecionada</span>
                    <strong className="text-xl font-bold text-foreground">
                      {isCountLoading ? "Contando leads..." : `${effectiveSelectedLeadIds.length} leads prontos`}
                    </strong>
                    {deselectedLeadIds.size > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({deselectedLeadIds.size} desmarcados manualmente)
                      </span>
                    )}
                  </div>
                </div>

                {effectiveSelectedLeadIds.length > 0 && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Audiência Elegível
                  </Badge>
                )}
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Buscar Contatos</Label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Nome, telefone..."
                      value={filters.search}
                      onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Status do Lead</Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(val) => setFilters((prev) => ({ ...prev, status: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                      <SelectItem value="qualificado">Qualificado</SelectItem>
                      <SelectItem value="desqualificado">Desqualificado</SelectItem>
                      <SelectItem value="ganho">Ganho / Convertido</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Grupo de Origem</Label>
                  <Select
                    value={filters.sourceGroupName || "all"}
                    onValueChange={(val) => setFilters((prev) => ({ ...prev, sourceGroupName: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos os grupos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os grupos</SelectItem>
                      {availableGroups.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tag filters */}
              {availableTags.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Filtrar por Tags:</Label>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1">
                    {availableTags.map((tag) => {
                      const isSelected = (filters.tags || []).includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer text-[11px] transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => toggleTagFilter(tag)}
                        >
                          {tag}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preview table */}
              <div className="border border-border/50 rounded-lg overflow-hidden">
                <div className="bg-muted/40 px-3 py-2 text-xs font-semibold flex items-center justify-between border-b border-border/40">
                  <span>Pré-visualização de Leads ({effectiveSelectedLeadIds.length})</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Desmarque os contatos que não devem receber o fluxo
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-10 text-center py-1.5"></TableHead>
                        <TableHead className="text-xs py-1.5">Nome</TableHead>
                        <TableHead className="text-xs py-1.5">Telefone</TableHead>
                        <TableHead className="text-xs py-1.5">Status</TableHead>
                        <TableHead className="text-xs py-1.5">Tags</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isPreviewLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                            Carregando contatos...
                          </TableCell>
                        </TableRow>
                      ) : previewLeads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                            Nenhum contato encontrado com estes filtros.
                          </TableCell>
                        </TableRow>
                      ) : (
                        previewLeads.map((lead: any) => {
                          const isDeselected = deselectedLeadIds.has(lead.id);
                          return (
                            <TableRow
                              key={lead.id}
                              className={`text-xs cursor-pointer ${
                                isDeselected ? "opacity-40 bg-muted/20 line-through" : ""
                              }`}
                              onClick={() => toggleLeadSelection(lead.id)}
                            >
                              <TableCell className="text-center py-1.5" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={!isDeselected}
                                  onChange={() => toggleLeadSelection(lead.id)}
                                  className="rounded border-border"
                                />
                              </TableCell>
                              <TableCell className="font-medium py-1.5">{lead.name || "Sem nome"}</TableCell>
                              <TableCell className="py-1.5 font-mono text-muted-foreground">{lead.phone || "—"}</TableCell>
                              <TableCell className="py-1.5">
                                <Badge variant="outline" className="text-[10px] py-0 px-1 capitalize">
                                  {lead.status || "novo"}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1.5">
                                <div className="flex gap-1 flex-wrap">
                                  {(lead.tags || []).slice(0, 2).map((t: string) => (
                                    <Badge key={t} variant="secondary" className="text-[9px] py-0 px-1">
                                      {t}
                                    </Badge>
                                  ))}
                                  {(lead.tags || []).length > 2 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{lead.tags.length - 2}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CADÊNCIA ANTI-BAN */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              {/* Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setDistributionMode("daily_limit")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    distributionMode === "daily_limit"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold text-sm">Distribuir em Lotes Diários</span>
                  </div>
                  <Badge className="mt-2 bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
                    Recomendado (Proteção Anti-Ban)
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Distribui os {effectiveSelectedLeadIds.length} leads em disparos graduais ao longo dos dias,
                    evitando bloqueios e limites de envio.
                  </p>
                </div>

                <div
                  onClick={() => setDistributionMode("immediate")}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    distributionMode === "immediate"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold text-sm">Disparar na Hora (Todos de uma vez)</span>
                  </div>
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    Imediato
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Inicia a execução do fluxo para todos os {effectiveSelectedLeadIds.length} leads de uma vez só.
                  </p>
                </div>
              </div>

              {/* Cadence configuration for daily_limit */}
              {distributionMode === "daily_limit" && (
                <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">Limite de Disparos por Dia</Label>
                      <p className="text-xs text-muted-foreground">
                        Quantos leads serão acionados a cada dia até zerar a lista.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDailyLimit((prev) => Math.max(1, prev - 5))}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 h-8 text-center font-bold text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDailyLimit((prev) => prev + 5)}
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Presets:</span>
                    {[5, 10, 20, 50, 100].map((val) => (
                      <Button
                        key={val}
                        type="button"
                        size="sm"
                        variant={dailyLimit === val ? "secondary" : "ghost"}
                        onClick={() => setDailyLimit(val)}
                        className="h-7 text-xs px-2.5"
                      >
                        {val} / dia
                      </Button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Data de Início</Label>
                      <Input
                        type="date"
                        value={startDateStr}
                        onChange={(e) => setStartDateStr(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Horário Início Envio</Label>
                      <Input
                        type="time"
                        value={sendTimeStart}
                        onChange={(e) => setSendTimeStart(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Horário Fim Envio</Label>
                      <Input
                        type="time"
                        value={sendTimeEnd}
                        onChange={(e) => setSendTimeEnd(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium">Apenas Dias Úteis (Segunda a Sexta)</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Pula automaticamente sábados e domingos no cálculo e envio.
                      </p>
                    </div>
                    <Switch checked={workdaysOnly} onCheckedChange={setWorkdaysOnly} />
                  </div>
                </div>
              )}

              {/* REAL-TIME PREVISION BOX (CRITICAL REQUIREMENT) */}
              <div className="p-4 rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Previsão de Encerramento da Lista
                  </span>
                  <Badge className="bg-primary text-primary-foreground font-semibold text-xs">
                    {scheduleCalc.totalDays} {scheduleCalc.totalDays === 1 ? "dia" : "dias"} de disparo
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                  <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Total de Leads</span>
                    <strong className="text-base font-bold text-foreground">
                      {scheduleCalc.totalLeads}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Disparos / Dia</span>
                    <strong className="text-base font-bold text-foreground">
                      {scheduleCalc.dailyLimit}
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Total de Lotes</span>
                    <strong className="text-base font-bold text-foreground">
                      {scheduleCalc.totalBatches} lotes
                    </strong>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card/60 border border-border/40">
                    <span className="text-[11px] text-muted-foreground block">Início</span>
                    <strong className="text-base font-bold text-foreground">
                      {format(new Date(scheduleCalc.startDate), "dd/MM/yyyy")}
                    </strong>
                  </div>
                </div>

                {/* HIGHLIGHTED COMPLETION DATE */}
                <div className="mt-2 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground block">
                      Data e Hora estimada de encerramento:
                    </span>
                    <strong className="text-sm font-bold text-primary capitalize">
                      {scheduleCalc.estimatedCompletionFormatted}
                    </strong>
                  </div>
                </div>

                {/* Batches timeline snippet */}
                {scheduleCalc.batches.length > 1 && (
                  <div className="pt-2 text-xs">
                    <span className="text-[11px] text-muted-foreground font-medium block mb-1">
                      Cronograma dos Primeiros Lotes:
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {scheduleCalc.batches.slice(0, 6).map((b) => (
                        <div
                          key={b.batchIndex}
                          className="px-2.5 py-1.5 rounded-md bg-secondary/80 border border-border/50 text-[11px] shrink-0"
                        >
                          <span className="font-semibold block">Lote #{b.batchIndex}</span>
                          <span className="text-muted-foreground">{b.dateFormatted}</span>
                          <span className="block text-primary font-medium">{b.count} leads</span>
                        </div>
                      ))}
                      {scheduleCalc.batches.length > 6 && (
                        <div className="px-2.5 py-1.5 rounded-md bg-secondary/40 border border-dashed border-border/50 text-[11px] shrink-0 flex items-center">
                          +{scheduleCalc.batches.length - 6} lotes...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: REVISÃO E LANÇAMENTO */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-foreground">Tudo pronto para iniciar!</h4>
                  <p className="text-xs text-muted-foreground">
                    Revise os detalhes da campanha de disparo abaixo antes de confirmar.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <span className="text-muted-foreground font-semibold block text-[11px] uppercase tracking-wider">
                    Configuração Geral
                  </span>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Nome:</span>
                    <strong className="text-foreground">{name}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Fluxo:</span>
                    <strong className="text-foreground">{selectedWorkflow?.name}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Conexão:</span>
                    <strong className="text-foreground">
                      {instances.find((i) => i.id === instanceId)?.name || "Padrão da Empresa"}
                    </strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <span className="text-muted-foreground font-semibold block text-[11px] uppercase tracking-wider">
                    Cadência & Previsão
                  </span>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Modo:</span>
                    <strong className="text-foreground">
                      {distributionMode === "immediate" ? "Imediato" : "Lotes Diários"}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Limite por Dia:</span>
                    <strong className="text-foreground">{scheduleCalc.dailyLimit} leads/dia</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Previsão Conclusão:</span>
                    <strong className="text-primary font-semibold">
                      {format(new Date(scheduleCalc.estimatedCompletionDate), "dd/MM/yyyy 'às' HH:mm")}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground block">Total de Destinatários</span>
                  <strong className="text-2xl font-bold text-foreground">
                    {effectiveSelectedLeadIds.length} contatos
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">Cronograma</span>
                  <strong className="text-sm font-semibold text-primary">
                    {scheduleCalc.totalBatches} lotes distribuídos
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <DialogFooter className="pt-3 border-t border-border/40 flex items-center justify-between sm:justify-between">
          <div>
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={isCreating}
                className="gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancelar
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                disabled={!canAdvance}
                className="gap-1.5"
              >
                Próximo Passo <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmLaunch}
                disabled={isCreating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 font-semibold"
              >
                {isCreating ? (
                  <>Criando e agendando disparos...</>
                ) : distributionMode === "immediate" ? (
                  <>
                    <Send className="w-4 h-4" /> Confirmar e Disparar Agora
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" /> Confirmar e Agendar Disparo
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
