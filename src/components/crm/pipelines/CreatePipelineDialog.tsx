import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";

interface CreatePipelineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: string | null;
  onSuccess?: (pipeline: Pipeline) => void;
}

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#eab308", 
  "#f97316", "#8b5cf6", "#ec4899", "#64748b"
];

export function CreatePipelineDialog({ open, onOpenChange, groupId, onSuccess }: CreatePipelineDialogProps) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupId || "unassigned");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [useTemplate, setUseTemplate] = useState(true);

  // Fetch groups to populate the dropdown
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
      if (!activeCompany?.id) throw new Error("Nenhuma empresa selecionada");
      if (!name.trim()) throw new Error("O nome é obrigatório");

      const finalGroupId = selectedGroupId === "unassigned" ? null : selectedGroupId;

      // 1. Create pipeline
      const { data: pipeline, error } = await supabase
        .from("pipelines")
        .insert({
          company_id: activeCompany.id,
          group_id: finalGroupId,
          name: name.trim(),
          description: description.trim() || null,
          color,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Create default stages if requested
      if (useTemplate) {
        const defaultStages = [
          { pipeline_id: pipeline.id, company_id: activeCompany.id, name: "Fila", color: "#64748b", order_index: 0, stage_type: "open" },
          { pipeline_id: pipeline.id, company_id: activeCompany.id, name: "Contato", color: "#3b82f6", order_index: 1, stage_type: "open" },
          { pipeline_id: pipeline.id, company_id: activeCompany.id, name: "Proposta", color: "#eab308", order_index: 2, stage_type: "open" },
          { pipeline_id: pipeline.id, company_id: activeCompany.id, name: "Ganho", color: "#22c55e", order_index: 3, stage_type: "won" },
          { pipeline_id: pipeline.id, company_id: activeCompany.id, name: "Perdido", color: "#ef4444", order_index: 4, stage_type: "lost" },
        ];
        
        const { error: stagesError } = await supabase
          .from("pipeline_stages")
          .insert(defaultStages);
          
        if (stagesError) throw stagesError;
      }

      return pipeline as Pipeline;
    },
    onSuccess: (data) => {
      toast.success("Pipeline criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      onOpenChange(false);
      setName("");
      setDescription("");
      setColor(PRESET_COLORS[0]);
      onSuccess?.(data);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar pipeline");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Pipeline</DialogTitle>
          <DialogDescription>
            Crie um novo funil de vendas ou fluxo de trabalho.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="pipe-name">Nome da Pipeline</Label>
            <Input
              id="pipe-name"
              placeholder="Ex: Disparos → Triagem"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pipe-group">Grupo</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger id="pipe-group">
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
            <Label htmlFor="pipe-desc">Descrição (Opcional)</Label>
            <Input
              id="pipe-desc"
              placeholder="Ex: Funil principal de vendas"
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

          <div className="flex items-center space-x-2 mt-2">
            <Checkbox 
              id="use-template" 
              checked={useTemplate} 
              onCheckedChange={(checked) => setUseTemplate(checked as boolean)} 
            />
            <Label htmlFor="use-template" className="font-normal">
              Usar etapas padrão (Fila, Contato, Proposta...)
            </Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending ? "Criando..." : "Criar Pipeline"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
