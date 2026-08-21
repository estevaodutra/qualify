import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PipelineGroup } from "@/types/crm.types";

interface EditPipelineGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: PipelineGroup | null;
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

export function EditPipelineGroupDialog({ open, onOpenChange, group }: EditPipelineGroupDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (group && open) {
      setName(group.name || "");
      setColor(group.color || PRESET_COLORS[0]);
    }
  }, [group, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!group?.id) throw new Error("Grupo não selecionado");
      if (!name.trim()) throw new Error("O nome é obrigatório");

      const { data, error } = await supabase
        .from("pipeline_groups")
        .update({
          name: name.trim(),
          color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", group.id)
        .select()
        .single();

      if (error) throw error;
      return data as PipelineGroup;
    },
    onSuccess: () => {
      toast.success("Grupo atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pipeline-groups"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar grupo");
    },
  });

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Grupo de Pipelines</DialogTitle>
          <DialogDescription>
            Altere o nome e a cor do grupo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-group-name">Nome do Grupo</Label>
            <Input
              id="edit-group-name"
              placeholder="Ex: Comercial"
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
            {mutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
