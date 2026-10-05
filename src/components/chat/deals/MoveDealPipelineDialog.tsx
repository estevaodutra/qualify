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
import { Label } from "@/components/ui/label";
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
import { Deal, Pipeline } from "@/types/crm.types";
import { GitBranch, Loader2, ArrowRight } from "lucide-react";

interface MoveDealPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal & { pipeline?: any } | null;
}

export function MoveDealPipelineDialog({
  open,
  onOpenChange,
  deal,
}: MoveDealPipelineDialogProps) {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [targetPipelineId, setTargetPipelineId] = useState<string>("");
  const [targetStageId, setTargetStageId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch company pipelines
  const { data: pipelines = [], isLoading: isLoadingPipelines } = useQuery({
    queryKey: ["company-pipelines-move-deal", activeCompanyId],
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

  useEffect(() => {
    if (deal && open) {
      setTargetPipelineId(deal.pipeline_id || "");
      setTargetStageId(deal.stage_id || "");
    }
  }, [deal, open]);

  const selectedPipeline = pipelines.find((p) => p.id === targetPipelineId);
  const stages = (selectedPipeline?.stages || []).sort(
    (a, b) => a.order_index - b.order_index
  );

  // Auto-select first stage if pipeline changes and current stage doesn't exist
  useEffect(() => {
    if (stages.length > 0 && !stages.some((s) => s.id === targetStageId)) {
      setTargetStageId(stages[0].id);
    }
  }, [targetPipelineId, stages, targetStageId]);

  if (!deal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPipelineId || !targetStageId) {
      toast.error("Selecione a pipeline e a etapa de destino.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedStage = stages.find((s) => s.id === targetStageId);
      const stageType = selectedStage?.stage_type || "open";

      const { error } = await supabase
        .from("deals")
        .update({
          pipeline_id: targetPipelineId,
          stage_id: targetStageId,
          status: stageType === "won" ? "won" : stageType === "lost" ? "lost" : "open",
          updated_at: new Date().toISOString(),
        })
        .eq("id", deal.id);

      if (error) throw error;

      toast.success("Negócio movido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["lead-active-deals"] });
      queryClient.invalidateQueries({ queryKey: ["lead-deals"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });

      onOpenChange(false);
    } catch (err: any) {
      console.error("Error moving deal:", err);
      toast.error(`Erro ao mover negócio: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" /> Mover de Pipeline
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Transfira a oportunidade "{deal.title}" para outra pipeline ou etapa do CRM.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {/* Pipeline de Destino */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Pipeline de Destino *</Label>
            <Select
              value={targetPipelineId}
              onValueChange={(val) => setTargetPipelineId(val)}
              disabled={isLoadingPipelines}
            >
              <SelectTrigger className="h-8 text-xs rounded-xl border-border/50 bg-background/50">
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

          {/* Etapa de Destino */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Etapa de Destino *</Label>
            <Select
              value={targetStageId}
              onValueChange={(val) => setTargetStageId(val)}
              disabled={stages.length === 0}
            >
              <SelectTrigger className="h-8 text-xs rounded-xl border-border/50 bg-background/50">
                <SelectValue placeholder="Selecione a etapa..." />
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
              disabled={isSubmitting || !targetPipelineId || !targetStageId}
              className="h-8 text-xs rounded-xl font-bold bg-primary hover:bg-primary/90 gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
              <span>Mover Negócio</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
