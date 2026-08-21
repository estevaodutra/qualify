import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pipeline, PipelineStage } from "@/types/crm.types";
import { Plus, Loader2, GitBranch } from "lucide-react";

interface AddLeadToPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName?: string | null;
}

export default function AddLeadToPipelineDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
}: AddLeadToPipelineDialogProps) {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch company pipelines with stages
  const { data: pipelines = [], isLoading: isLoadingPipelines } = useQuery({
    queryKey: ["company-pipelines-dialog", activeCompanyId],
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

  // Auto-select first pipeline when loaded
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedPipelineId]);

  // Selected pipeline object & stages sorted by order_index
  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
  const stages = (selectedPipeline?.stages || []).sort((a, b) => a.order_index - b.order_index);

  // Auto-select first stage when pipeline changes
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
      toast.error("Por favor, selecione a pipeline e a etapa.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedStage = stages.find(s => s.id === selectedStageId);
      const stageType = selectedStage?.stage_type || "open";

      const { error } = await supabase.from("deals").insert({
        company_id: activeCompanyId,
        lead_id: leadId,
        pipeline_id: selectedPipelineId,
        stage_id: selectedStageId,
        title: leadName ? `Negócio - ${leadName}` : "Novo Negócio",
        value: 0,
        currency: "BRL",
        status: stageType === "won" ? "won" : stageType === "lost" ? "lost" : "open",
      });

      if (error) throw error;

      toast.success("Negócio adicionado à pipeline com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["lead-deals", leadId] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error creating deal:", err);
      toast.error(`Erro ao adicionar à pipeline: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" /> Adicionar à Pipeline
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Crie uma oportunidade no CRM para acompanhar este lead comercialmente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {/* Select Pipeline */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Pipeline</Label>
            <Select
              value={selectedPipelineId}
              onValueChange={(val) => setSelectedPipelineId(val)}
              disabled={isLoadingPipelines || isSubmitting}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Selecione a pipeline..." />
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

          {/* Select Stage */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Etapa Inicial</Label>
            <Select
              value={selectedStageId}
              onValueChange={(val) => setSelectedStageId(val)}
              disabled={isLoadingPipelines || isSubmitting || stages.length === 0}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl">
                <SelectValue placeholder="Selecione a etapa..." />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || "#3b82f6" }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedPipelineId || !selectedStageId}
              className="rounded-xl text-xs font-bold h-8 bg-primary text-primary-foreground shadow-sm"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
