import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Pipeline, PipelineGroup } from "@/types/crm.types";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, MoreHorizontal, Kanban, GripVertical } from "lucide-react";
import { CreatePipelineGroupDialog } from "./CreatePipelineGroupDialog";
import { EditPipelineGroupDialog } from "./EditPipelineGroupDialog";
import { CreatePipelineDialog } from "./CreatePipelineDialog";
import { EditPipelineDialog } from "./EditPipelineDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PipelineSidebarProps {
  activePipelineId: string | null;
  onSelectPipeline: (id: string) => void;
}

interface SortablePipelineItemProps {
  pipeline: Pipeline;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
}

function SortablePipelineItem({
  pipeline,
  isActive,
  onSelect,
  onEdit,
  onDuplicate,
  onArchive,
}: SortablePipelineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: pipeline.id,
    data: {
      type: "Pipeline",
      pipeline,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "group flex items-center justify-between px-2 py-1.5 mx-2 rounded-md cursor-pointer text-sm transition-all select-none",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted text-muted-foreground hover:text-foreground",
        isDragging && "opacity-30 ring-1 ring-primary/40 bg-muted/60"
      )}
    >
      <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-muted-foreground/40 hover:text-foreground transition-colors rounded hover:bg-muted/80 shrink-0"
          title="Arrastar para reordenar"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: pipeline.color || "#3b82f6" }}
        />
        <span className="truncate">{pipeline.name}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>Duplicar</DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive} className="text-destructive">
            Arquivar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GroupDroppableContainer({
  groupId,
  children,
}: {
  groupId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `group-droppable-${groupId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg transition-colors space-y-0.5",
        isOver && "bg-primary/5 ring-1 ring-primary/20"
      )}
    >
      {children}
    </div>
  );
}

export function PipelineSidebar({ activePipelineId, onSelectPipeline }: PipelineSidebarProps) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<PipelineGroup | null>(null);
  const [createPipelineOpen, setCreatePipelineOpen] = useState(false);
  const [editPipeline, setEditPipeline] = useState<Pipeline | null>(null);
  const [selectedGroupIdForNewPipeline, setSelectedGroupIdForNewPipeline] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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

  const [localPipelines, setLocalPipelines] = useState<Pipeline[]>([]);

  useEffect(() => {
    if (pipelines) {
      setLocalPipelines(pipelines);
    }
  }, [pipelines]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const reorderPipelinesMutation = useMutation({
    mutationFn: async (updates: { id: string; group_id: string | null; order_index: number }[]) => {
      for (const item of updates) {
        const { error } = await supabase
          .from("pipelines")
          .update({
            group_id: item.group_id,
            order_index: item.order_index,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-groups"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar ordenação da pipeline");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
    },
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

      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipeline.id)
        .order("order_index", { ascending: true });

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

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;

    const activePipe = localPipelines.find(p => p.id === active.id);
    if (!activePipe) return;

    // Case 1: Dropped over another pipeline
    const overPipe = localPipelines.find(p => p.id === over.id);
    if (overPipe) {
      const targetGroupId = overPipe.group_id;

      if (activePipe.group_id === targetGroupId) {
        // Reordering within the same folder/group
        const currentGroupItems = localPipelines
          .filter(p => p.group_id === targetGroupId)
          .sort((a, b) => a.order_index - b.order_index);

        const oldIndex = currentGroupItems.findIndex(p => p.id === activePipe.id);
        const newIndex = currentGroupItems.findIndex(p => p.id === overPipe.id);

        if (oldIndex === newIndex || oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(currentGroupItems, oldIndex, newIndex);
        const updated = localPipelines.map(p => {
          const idx = reordered.findIndex(r => r.id === p.id);
          if (idx !== -1) {
            return { ...p, order_index: idx };
          }
          return p;
        });

        setLocalPipelines(updated);

        const toPersist = reordered.map((p, idx) => ({
          id: p.id,
          group_id: targetGroupId,
          order_index: idx,
        }));
        reorderPipelinesMutation.mutate(toPersist);
      } else {
        // Moving to another folder/group at the specific pipeline position
        const sourceGroupItems = localPipelines
          .filter(p => p.group_id === activePipe.group_id && p.id !== activePipe.id)
          .sort((a, b) => a.order_index - b.order_index);

        const targetGroupItems = localPipelines
          .filter(p => p.group_id === targetGroupId && p.id !== activePipe.id)
          .sort((a, b) => a.order_index - b.order_index);

        const insertIndex = targetGroupItems.findIndex(p => p.id === overPipe.id);
        const newTargetGroupItems = [...targetGroupItems];
        newTargetGroupItems.splice(insertIndex === -1 ? targetGroupItems.length : insertIndex, 0, {
          ...activePipe,
          group_id: targetGroupId,
        });

        const updated = localPipelines.map(p => {
          if (p.id === activePipe.id) {
            return {
              ...p,
              group_id: targetGroupId,
              order_index: insertIndex === -1 ? targetGroupItems.length : insertIndex,
            };
          }
          const tIdx = newTargetGroupItems.findIndex(r => r.id === p.id);
          if (tIdx !== -1) {
            return { ...p, order_index: tIdx };
          }
          const sIdx = sourceGroupItems.findIndex(r => r.id === p.id);
          if (sIdx !== -1) {
            return { ...p, order_index: sIdx };
          }
          return p;
        });

        setLocalPipelines(updated);

        const toPersist = [
          ...newTargetGroupItems.map((p, idx) => ({ id: p.id, group_id: targetGroupId, order_index: idx })),
          ...sourceGroupItems.map((p, idx) => ({ id: p.id, group_id: activePipe.group_id, order_index: idx })),
        ];
        reorderPipelinesMutation.mutate(toPersist);
      }
      return;
    }

    // Case 2: Dropped over a group container directly
    if (typeof over.id === "string" && over.id.startsWith("group-droppable-")) {
      const rawGroup = over.id.replace("group-droppable-", "");
      const targetGroupId = rawGroup === "unassigned" ? null : rawGroup;

      if (activePipe.group_id === targetGroupId) return;

      const sourceGroupItems = localPipelines
        .filter(p => p.group_id === activePipe.group_id && p.id !== activePipe.id)
        .sort((a, b) => a.order_index - b.order_index);

      const targetGroupItems = localPipelines
        .filter(p => p.group_id === targetGroupId && p.id !== activePipe.id)
        .sort((a, b) => a.order_index - b.order_index);

      const newTargetGroupItems = [...targetGroupItems, { ...activePipe, group_id: targetGroupId }];

      const updated = localPipelines.map(p => {
        if (p.id === activePipe.id) {
          return { ...p, group_id: targetGroupId, order_index: targetGroupItems.length };
        }
        const sIdx = sourceGroupItems.findIndex(r => r.id === p.id);
        if (sIdx !== -1) {
          return { ...p, order_index: sIdx };
        }
        return p;
      });

      setLocalPipelines(updated);

      const toPersist = [
        ...newTargetGroupItems.map((p, idx) => ({ id: p.id, group_id: targetGroupId, order_index: idx })),
        ...sourceGroupItems.map((p, idx) => ({ id: p.id, group_id: activePipe.group_id, order_index: idx })),
      ];
      reorderPipelinesMutation.mutate(toPersist);
    }
  };

  const unassignedPipelines = localPipelines
    .filter(p => !p.group_id)
    .sort((a, b) => a.order_index - b.order_index);

  const activeDragPipeline = activeDragId ? localPipelines.find(p => p.id === activeDragId) : null;

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              {/* Groups */}
              {groups?.map(group => {
                const groupPipelines = localPipelines
                  .filter(p => p.group_id === group.id)
                  .sort((a, b) => a.order_index - b.order_index);
                const isCollapsed = !!collapsedGroups[group.id];

                return (
                  <div key={group.id} className="space-y-1">
                    <div 
                      onClick={() => toggleGroupCollapse(group.id)}
                      className="px-4 flex items-center justify-between group/header cursor-pointer hover:text-foreground text-muted-foreground transition-colors select-none"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                        {isCollapsed ? (
                          <ChevronRight className="w-3 h-3 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3 h-3 shrink-0" />
                        )}
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

                    {!isCollapsed && (
                      <GroupDroppableContainer groupId={group.id}>
                        <SortableContext
                          items={groupPipelines.map(p => p.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-0.5 min-h-[8px]">
                            {groupPipelines.length > 0 ? (
                              groupPipelines.map(pipeline => (
                                <SortablePipelineItem
                                  key={pipeline.id}
                                  pipeline={pipeline}
                                  isActive={activePipelineId === pipeline.id}
                                  onSelect={() => onSelectPipeline(pipeline.id)}
                                  onEdit={() => setEditPipeline(pipeline)}
                                  onDuplicate={() => duplicatePipelineMutation.mutate(pipeline)}
                                  onArchive={() => archivePipelineMutation.mutate(pipeline.id)}
                                />
                              ))
                            ) : (
                              <div className="px-7 py-1 text-xs text-muted-foreground/60 italic">Nenhuma pipeline</div>
                            )}
                          </div>
                        </SortableContext>
                      </GroupDroppableContainer>
                    )}
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
                  <GroupDroppableContainer groupId="unassigned">
                    <SortableContext
                      items={unassignedPipelines.map(p => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-0.5 min-h-[8px]">
                        {unassignedPipelines.map(pipeline => (
                          <SortablePipelineItem
                            key={pipeline.id}
                            pipeline={pipeline}
                            isActive={activePipelineId === pipeline.id}
                            onSelect={() => onSelectPipeline(pipeline.id)}
                            onEdit={() => setEditPipeline(pipeline)}
                            onDuplicate={() => duplicatePipelineMutation.mutate(pipeline)}
                            onArchive={() => archivePipelineMutation.mutate(pipeline.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </GroupDroppableContainer>
                </div>
              )}
              
              {groups?.length === 0 && localPipelines.length === 0 && (
                <div className="px-4 py-8 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">Nenhuma pipeline criada.</p>
                  <Button variant="outline" size="sm" onClick={() => handleCreatePipelineInGroup()}>
                    Criar Primeira Pipeline
                  </Button>
                </div>
              )}
            </div>

            <DragOverlay>
              {activeDragPipeline ? (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-md text-sm bg-card border border-primary/40 shadow-xl font-medium text-foreground w-56">
                  <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                    <GripVertical className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: activeDragPipeline.color || "#3b82f6" }}
                    />
                    <span className="truncate">{activeDragPipeline.name}</span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
