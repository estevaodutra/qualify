import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PipelineStage } from "@/types/crm.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string | null;
  currentStagesCount?: number;
}

const PRESET_COLORS = [
  "#64748b", "#3b82f6", "#eab308", "#22c55e", "#ef4444", 
  "#f97316", "#8b5cf6", "#ec4899", "#94a3b8"
];

export function CreateStageDialog({ open, onOpenChange, pipelineId, currentStagesCount = 0 }: CreateStageDialogProps) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [stageType, setStageType] = useState<"open" | "won" | "lost">("open");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!activeCompany?.id || !pipelineId) throw new Error("Pipeline não selecionada");
      if (!name.trim()) throw new Error("O nome da etapa é obrigatório");

      const { data, error } = await supabase
        .from("pipeline_stages")
        .insert({
          company_id: activeCompany.id,
          pipeline_id: pipelineId,
          name: name.trim(),
          color,
          order_index: currentStagesCount,
          stage_type: stageType,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: () => {
      toast.success("Etapa criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pipeline", pipelineId] });
      queryClient.invalidateQueries({ queryKey: ["lead-deals"] });
      onOpenChange(false);
      setName("");
      setColor(PRESET_COLORS[0]);
      setStageType("open");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar etapa");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Etapa</DialogTitle>
          <DialogDescription>
            Adicione uma nova coluna ao seu funil de vendas.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="stage-name">Nome da Etapa</Label>
            <Input
              id="stage-name"
              placeholder="Ex: Proposta Enviada"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stage-type">Tipo / Propósito da Etapa</Label>
            <Select value={stageType} onValueChange={(val: any) => setStageType(val)}>
              <SelectTrigger id="stage-type">
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto (Negócios em andamento)</SelectItem>
                <SelectItem value="won">Ganho (Negócios fechados)</SelectItem>
                <SelectItem value="lost">Perdido (Negócios perdidos)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Etapas do tipo Ganho ou Perdido finalizam automaticamente o negócio no funil.
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label>Cor da Coluna</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? "scale-125 ring-2 ring-offset-2 ring-primary" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending ? "Criando..." : "Criar Etapa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
