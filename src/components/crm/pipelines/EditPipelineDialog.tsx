import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pipeline, PipelineGroup } from "@/types/crm.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditPipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline | null;
}

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#eab308", 
  "#f97316", "#8b5cf6", "#ec4899", "#64748b"
];

export function EditPipelineDialog({ open, onOpenChange, pipeline }: EditPipelineDialogProps) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("unassigned");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (pipeline && open) {
      setName(pipeline.name || "");
      setDescription(pipeline.description || "");
      setSelectedGroupId(pipeline.group_id || "unassigned");
      setColor(pipeline.color || PRESET_COLORS[0]);
    }
  }, [pipeline, open]);

  // Fetch groups
  const { data: groups } = useQuery({
    queryKey: ["pipeline-groups", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from("pipeline_groups")
        .select("*")
        .eq("company_id", activeCompany.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as PipelineGroup[];
    },
    enabled: !!activeCompany?.id && open
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!pipeline?.id) throw new Error("Pipeline não selecionada");
      if (!name.trim()) throw new Error("O nome é obrigatório");

      const finalGroupId = selectedGroupId === "unassigned" ? null : selectedGroupId;

      const { data, error } = await supabase
        .from("pipelines")
        .update({
          group_id: finalGroupId,
          name: name.trim(),
          description: description.trim() || null,
          color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pipeline.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Pipeline atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline", pipeline?.id] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar pipeline");
    },
  });

  if (!pipeline) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Pipeline</DialogTitle>
          <DialogDescription>
            Altere as configurações desta pipeline.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-pipe-name">Nome da Pipeline</Label>
            <Input
              id="edit-pipe-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-pipe-group">Grupo</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger id="edit-pipe-group">
                <SelectValue placeholder="Selecione um grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Sem grupo</SelectItem>
                {groups?.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="edit-pipe-desc">Descrição (Opcional)</Label>
            <Input
              id="edit-pipe-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
