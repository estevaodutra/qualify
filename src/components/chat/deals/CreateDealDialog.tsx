import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pipeline, PipelineStage } from "@/types/crm.types";
import { Plus, Loader2, Award, Calendar, DollarSign, FileText } from "lucide-react";
import { dispatchWorkflowForDealMove } from "@/lib/workflow-dispatcher";

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName?: string | null;
  leadPhone?: string | null;
}

export function CreateDealDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  leadPhone,
}: CreateDealDialogProps) {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const defaultTitle = leadName || leadPhone ? `Negócio - ${leadName || leadPhone}` : "Novo Negócio";
  const [title, setTitle] = useState(defaultTitle);
  const [value, setValue] = useState<string>("0");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [expectedCloseDate, setExpectedCloseDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      setTitle(leadName || leadPhone ? `Negócio - ${leadName || leadPhone}` : "Novo Negócio");
      setValue("0");
      setExpectedCloseDate("");
      setDescription("");
    }
  }, [open, leadName, leadPhone]);

  // Fetch company pipelines
  const { data: pipelines = [], isLoading: isLoadingPipelines } = useQuery({
    queryKey: ["company-pipelines-create-deal", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("pipelines")
        .select("*, stages:pipeline_stages(*)")
        .eq("company_id", activeCompanyId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return (data || []) as Pipeline[];
    },
    enabled: !!activeCompanyId && open,
  });

  // Auto-select first pipeline
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId]);

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const stages = (selectedPipeline?.stages || []).sort(
    (a, b) => a.order_index - b.order_index
  );

  // Auto-select first stage
  useEffect(() => {
    if (stages.length > 0) {
      setSelectedStageId(stages[0].id);
    } else {
      setSelectedStageId("");
    }
  }, [selectedPipelineId, pipelines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId || !leadId || !selectedPipelineId || !selectedStageId) {
      toast.error("Por favor, preencha o pipeline e a etapa.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedStage = stages.find((s) => s.id === selectedStageId);
      const stageType = selectedStage?.stage_type || "open";

      const numValue = parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;

      const { data: createdDeal, error } = await supabase.from("deals").insert({
        company_id: activeCompanyId,
        lead_id: leadId,
        pipeline_id: selectedPipelineId,
        stage_id: selectedStageId,
        title: title.trim() || "Novo Negócio",
        value: numValue,
        currency: "BRL",
        status: stageType === "won" ? "won" : stageType === "lost" ? "lost" : "open",
        expected_close_date: expectedCloseDate ? new Date(expectedCloseDate).toISOString() : null,
        description: description.trim() || null,
        position: 0,
      }).select("id").single();

      if (error) throw error;

      if (createdDeal?.id) {
        dispatchWorkflowForDealMove(createdDeal.id, selectedPipelineId, selectedStageId).catch(console.error);
      }

      toast.success("Negócio criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["lead-active-deals", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead-deals"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });

      onOpenChange(false);
    } catch (err: any) {
      console.error("Error creating deal:", err);
      toast.error(`Erro ao criar negócio: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Novo Negócio
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Crie uma oportunidade na pipeline para acompanhar o progresso deste lead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {/* Título */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Título do Negócio *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Contrato Anual - Cliente"
              className="h-8 text-xs rounded-xl border-border/50 bg-background/50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Pipeline */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Pipeline *</Label>
              <Select
                value={selectedPipelineId}
                onValueChange={(val) => setSelectedPipelineId(val)}
                disabled={isLoadingPipelines}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/50 bg-background/50">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Etapa */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Etapa *</Label>
              <Select
                value={selectedStageId}
                onValueChange={(val) => setSelectedStageId(val)}
                disabled={stages.length === 0}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/50 bg-background/50">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: s.color || "#3b82f6" }}
                        />
                        <span>{s.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Valor */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" /> Valor (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
                className="h-8 text-xs rounded-xl border-border/50 bg-background/50"
              />
            </div>

            {/* Fechamento Esperado */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" /> Data Prevista
              </Label>
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="h-8 text-xs rounded-xl border-border/50 bg-background/50"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <FileText className="h-3 w-3 text-muted-foreground" /> Observações
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes ou anotações sobre este negócio..."
              className="text-xs min-h-[60px] rounded-xl border-border/50 bg-background/50 resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !selectedPipelineId || !selectedStageId}
              className="h-8 text-xs rounded-xl font-bold bg-primary hover:bg-primary/90 gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span>Criar Negócio</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
