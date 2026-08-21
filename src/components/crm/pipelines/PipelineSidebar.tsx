import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Pipeline, PipelineGroup } from "@/types/crm.types";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, MoreHorizontal, Kanban } from "lucide-react";
import { CreatePipelineGroupDialog } from "./CreatePipelineGroupDialog";
import { EditPipelineGroupDialog } from "./EditPipelineGroupDialog";
import { CreatePipelineDialog } from "./CreatePipelineDialog";
import { EditPipelineDialog } from "./EditPipelineDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PipelineSidebarProps {
  activePipelineId: string | null;
  onSelectPipeline: (id: string) => void;
}

export function PipelineSidebar({ activePipelineId, onSelectPipeline }: PipelineSidebarProps) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<PipelineGroup | null>(null);
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false);
  const [editPipeline, setEditPipeline] = useState<Pipeline | null>(null);
  const [selectedGroupIdForNewPipeline, setSelectedGroupIdForNewPipeline] = useState<string | null>(null);

  const { data: groups, isLoading: loadingGroups } = useQuery({
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
    enabled: !!activeCompany?.id,
  });

  const { data: pipelines, isLoading: loadingPipelines } = useQuery({
    queryKey: ["pipelines", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .eq("company_id", activeCompany.id)
        .eq("status", "active")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Pipeline[];
    },
    enabled: !!activeCompany?.id,
  });

  // Delete Group Mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("pipeline_groups")
        .delete()
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grupo excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pipeline-groups"] });
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir grupo");
    }
  });

  // Archive Pipeline Mutation
  const archivePipelineMutation = useMutation({
    mutationFn: async (pipelineId: string) => {
      const { error } = await supabase
        .from("pipelines")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", pipelineId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pipeline arquivada!");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao arquivar pipeline");
    }
  });

  // Duplicate Pipeline Mutation
  const duplicatePipelineMutation = useMutation({
    mutationFn: async (pipeline: Pipeline) => {
      if (!activeCompany?.id) return;

      // 1. Fetch source stages
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipeline.id)
        .order("order_index", { ascending: true });

      // 2. Insert new pipeline
      const { data: newPipeline, error: pipeErr } = await supabase
        .from("pipelines")
        .insert({
          company_id: activeCompany.id,
          group_id: pipeline.group_id,
          name: `${pipeline.name} (Cópia)`,
          description: pipeline.description,
          color: pipeline.color,
          status: "active",
        })
        .select()
        .single();

      if (pipeErr) throw pipeErr;

      // 3. Duplicate stages
      if (stages && stages.length > 0) {
        const newStages = stages.map(s => ({
          pipeline_id: newPipeline.id,
          company_id: activeCompany.id,
          name: s.name,
          color: s.color,
          order_index: s.order_index,
          stage_type: s.stage_type,
        }));
        await supabase.from("pipeline_stages").insert(newStages);
      }

      return newPipeline;
    },
    onSuccess: (newPipeline) => {
      toast.success("Pipeline duplicada!");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      if (newPipeline) onSelectPipeline(newPipeline.id);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao duplicar pipeline");
    }
  });

  const handleCreatePipelineInGroup = (groupId?: string) => {
    setSelectedGroupIdForNewPipeline(groupId || null);
    setCreatePipelineOpen(true);
  };

  const renderPipelineItem = (pipeline: Pipeline) => {
    const isActive = activePipelineId === pipeline.id;
    return (
      <div 
        key={pipeline.id}
        onClick={() => onSelectPipeline(pipeline.id)}
        className={cn(
          "group flex items-center justify-between px-3 py-1.5 mx-2 rounded-md cursor-pointer text-sm transition-colors",
          isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0" 
            style={{ backgroundColor: pipeline.color || "#3b82f6" }}
          />
          <span className="truncate">{pipeline.name}</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setEditPipeline(pipeline)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicatePipelineMutation.mutate(pipeline)}>
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => archivePipelineMutation.mutate(pipeline.id)}
              className="text-destructive"
            >
              Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const unassignedPipelines = pipelines?.filter(p => !p.group_id) || [];

  return (
    <div className="w-64 border-r bg-muted/20 flex flex-col h-full flex-shrink-0">
      <div className="p-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2 font-semibold">
          <Kanban className="w-5 h-5 text-primary" />
          <span>Pipelines</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleCreatePipelineInGroup()}>
              Nova Pipeline
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCreateGroupOpen(true)}>
              Novo Grupo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        {loadingGroups || loadingPipelines ? (
          <div className="px-4 text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-6">
            {/* Groups */}
            {groups?.map(group => {
              const groupPipelines = pipelines?.filter(p => p.group_id === group.id) || [];
              
              return (
                <div key={group.id} className="space-y-1">
                  <div className="px-4 flex items-center justify-between group/header cursor-pointer hover:text-foreground text-muted-foreground transition-colors">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                      <ChevronDown className="w-3 h-3 shrink-0" />
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: group.color || "#3b82f6" }} />
                      <span className="truncate">{group.name}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover/header:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleCreatePipelineInGroup(group.id)}>
                          Nova Pipeline aqui
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditGroup(group)}>
                          Editar Grupo
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteGroupMutation.mutate(group.id)}
                          className="text-destructive"
                        >
                          Excluir Grupo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-0.5">
                    {groupPipelines.length > 0 ? (
                      groupPipelines.map(renderPipelineItem)
                    ) : (
                      <div className="px-7 py-1 text-xs text-muted-foreground/60 italic">Nenhuma pipeline</div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Unassigned Pipelines */}
            {unassignedPipelines.length > 0 && (
              <div className="space-y-1">
                <div className="px-4 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <ChevronDown className="w-3 h-3" />
                  Outras Pipelines
                </div>
                <div className="space-y-0.5">
                  {unassignedPipelines.map(renderPipelineItem)}
                </div>
              </div>
            )}
            
            {groups?.length === 0 && pipelines?.length === 0 && (
              <div className="px-4 py-8 text-center space-y-3">
                <p className="text-sm text-muted-foreground">Nenhuma pipeline criada.</p>
                <Button variant="outline" size="sm" onClick={() => handleCreatePipelineInGroup()}>
                  Criar Primeira Pipeline
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <CreatePipelineGroupDialog 
        open={createGroupOpen} 
        onOpenChange={setCreateGroupOpen} 
      />
      <EditPipelineGroupDialog
        open={!!editGroup}
        onOpenChange={(open) => {
          if (!open) setEditGroup(null);
        }}
        group={editGroup}
      />
      <CreatePipelineDialog 
        open={createPipelineOpen} 
        onOpenChange={setCreatePipelineOpen} 
        groupId={selectedGroupIdForNewPipeline}
        onSuccess={(pipe) => {
          if (!activePipelineId) onSelectPipeline(pipe.id);
        }}
      />
      <EditPipelineDialog
        open={!!editPipeline}
        onOpenChange={(open) => {
          if (!open) setEditPipeline(null);
        }}
        pipeline={editPipeline}
      />
    </div>
  );
}
