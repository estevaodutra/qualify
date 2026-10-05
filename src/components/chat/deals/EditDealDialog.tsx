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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Deal, Pipeline, PipelineStage } from "@/types/crm.types";
import { Edit3, Loader2, Save, Calendar, DollarSign, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";

interface EditDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal & { pipeline?: (Pipeline & { stages?: PipelineStage[] }) | null } | null;
  stages?: PipelineStage[];
}

export function EditDealDialog({
  open,
  onOpenChange,
  deal,
  stages = [],
}: EditDealDialogProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [value, setValue] = useState("0");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [status, setStatus] = useState<"open" | "won" | "lost">("open");
  const [probability, setProbability] = useState("0");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available stages from deal's pipeline or fallback to props
  const availableStages = (deal?.pipeline?.stages && deal.pipeline.stages.length > 0)
    ? deal.pipeline.stages.sort((a, b) => a.order_index - b.order_index)
    : stages;

  useEffect(() => {
    if (deal && open) {
      setTitle(deal.title || "");
      setValue(deal.value?.toString() || "0");
      setSelectedStageId(deal.stage_id || "");
      setStatus(deal.status === "won" ? "won" : deal.status === "lost" ? "lost" : "open");
      setProbability(deal.probability?.toString() || "0");
      setExpectedCloseDate(
        deal.expected_close_date ? deal.expected_close_date.split("T")[0] : ""
      );
      setDescription(deal.description || "");
    }
  }, [deal, open]);

  if (!deal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal.id) return;

    setIsSubmitting(true);
    try {
      const numValue = parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0;
      const numProb = Math.min(100, Math.max(0, parseInt(probability, 10) || 0));

      const updates: Record<string, any> = {
        title: title.trim() || "Negócio sem título",
        value: numValue,
        stage_id: selectedStageId || null,
        status,
        probability: numProb,
        expected_close_date: expectedCloseDate ? new Date(expectedCloseDate).toISOString() : null,
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (status === "won" && deal.status !== "won") {
        updates.won_at = new Date().toISOString();
      } else if (status !== "won") {
        updates.won_at = null;
      }

      if (status === "lost" && deal.status !== "lost") {
        updates.lost_at = new Date().toISOString();
      } else if (status !== "lost") {
        updates.lost_at = null;
      }

      const { error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", deal.id);

      if (error) throw error;

      toast.success("Negócio atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["lead-active-deals"] });
      queryClient.invalidateQueries({ queryKey: ["lead-deals"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });

      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating deal:", err);
      toast.error(`Erro ao atualizar negócio: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-[9999]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-primary" /> Editar Negócio
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Altere os dados, valor ou etapa do negócio deste lead.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          {/* Título */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Título do Negócio *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-xs rounded-xl border-border/50 bg-background/50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Etapa */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Etapa</Label>
              <Select
                value={selectedStageId}
                onValueChange={(val) => {
                  setSelectedStageId(val);
                  const st = availableStages.find((s) => s.id === val);
                  if (st?.stage_type === "won") setStatus("won");
                  else if (st?.stage_type === "lost") setStatus("lost");
                  else if (status !== "open") setStatus("open");
                }}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/50 bg-background/50">
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  {availableStages.map((s) => (
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

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Status do Negócio</Label>
              <Select
                value={status}
                onValueChange={(val: "open" | "won" | "lost") => setStatus(val)}
              >
                <SelectTrigger className="h-8 text-xs rounded-xl border-border/50 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[10000]">
                  <SelectItem value="open" className="text-xs text-blue-600 font-semibold">
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Em Andamento</span>
                  </SelectItem>
                  <SelectItem value="won" className="text-xs text-emerald-600 font-semibold">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Ganho (Fechado)</span>
                  </SelectItem>
                  <SelectItem value="lost" className="text-xs text-rose-600 font-semibold">
                    <span className="flex items-center gap-1.5"><XCircle className="h-3 w-3" /> Perdido</span>
                  </SelectItem>
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
                className="h-8 text-xs rounded-xl border-border/50 bg-background/50"
              />
            </div>

            {/* Data Prevista */}
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

          {/* Probabilidade */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold">Probabilidade</Label>
              <span className="text-xs font-bold text-muted-foreground">{probability}%</span>
            </div>
            <Input
              type="number"
              min="0"
              max="100"
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
              className="h-8 text-xs rounded-xl border-border/50 bg-background/50"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold flex items-center gap-1">
              <FileText className="h-3 w-3 text-muted-foreground" /> Observações
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes ou anotações..."
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
              disabled={isSubmitting}
              className="h-8 text-xs rounded-xl font-bold bg-primary hover:bg-primary/90 gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>Salvar Alterações</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
