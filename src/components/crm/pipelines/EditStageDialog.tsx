import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PipelineStage } from "@/types/crm.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: PipelineStage | null;
}

const PRESET_COLORS = [
  "#64748b", "#3b82f6", "#eab308", "#22c55e", "#ef4444", 
  "#f97316", "#8b5cf6", "#ec4899", "#94a3b8"
];

export function EditStageDialog({ open, onOpenChange, stage }: EditStageDialogProps) {
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [stageType, setStageType] = useState<"open" | "won" | "lost">("open");

  useEffect(() => {
    if (stage && open) {
      setName(stage.name || "");
      setColor(stage.color || PRESET_COLORS[0]);
      setStageType(stage.stage_type || "open");
    }
  }, [stage, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!stage?.id) throw new Error("Etapa não selecionada");
      if (!name.trim()) throw new Error("O nome é obrigatório");

      const { data, error } = await supabase
        .from("pipeline_stages")
        .update({
          name: name.trim(),
          color,
          stage_type: stageType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", stage.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Etapa atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pipeline", stage?.pipeline_id] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar etapa");
    },
  });

  if (!stage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Etapa</DialogTitle>
          <DialogDescription>
            Configure o nome, cor e tipo desta coluna do funil.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-stage-name">Nome da Etapa</Label>
            <Input
              id="edit-stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-stage-type">Tipo / Propósito da Etapa</Label>
            <Select value={stageType} onValueChange={(val: any) => setStageType(val)}>
              <SelectTrigger id="edit-stage-type">
                <SelectValue placeholder="Selecione um tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto (Negócios em andamento)</SelectItem>
                <SelectItem value="won">Ganho (Negócios fechados)</SelectItem>
                <SelectItem value="lost">Perdido (Negócios perdidos)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              O tipo da etapa ajuda o Qualify a calcular estatísticas de vendas.
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
            {mutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
