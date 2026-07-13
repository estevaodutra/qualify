import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PipelineGroup } from "@/types/crm.types";

interface CreatePipelineGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (group: PipelineGroup) => void;
}

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#eab308", // yellow
  "#f97316", // orange
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#64748b", // slate
];

export function CreatePipelineGroupDialog({ open, onOpenChange, onSuccess }: CreatePipelineGroupDialogProps) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!activeCompany?.id) throw new Error("Nenhuma empresa selecionada");
      if (!name.trim()) throw new Error("O nome é obrigatório");

      const { data, error } = await supabase
        .from("pipeline_groups")
        .insert({
          company_id: activeCompany.id,
          name: name.trim(),
          color,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PipelineGroup;
    },
    onSuccess: (data) => {
      toast.success("Grupo criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pipeline-groups"] });
      onOpenChange(false);
      setName("");
      setColor(PRESET_COLORS[0]);
      onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar grupo");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Grupo de Pipelines</DialogTitle>
          <DialogDescription>
            Organize suas pipelines por setor, projeto ou produto.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Grupo</Label>
            <Input
              id="name"
              placeholder="Ex: AmigoTech"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Cor de Destaque</Label>
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
            {mutation.isPending ? "Criando..." : "Criar Grupo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
