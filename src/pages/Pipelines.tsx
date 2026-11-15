import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Deal, Pipeline, PipelineGroup, PipelineStage } from "@/types/crm.types";
import { DealDrawer } from "@/components/crm/deals/DealDrawer";
import { LeadDrawer } from "@/components/crm/leads/LeadDrawer";
import { PipelineSidebar } from "@/components/crm/pipelines/PipelineSidebar";
import { PipelineHeader } from "@/components/crm/pipelines/PipelineHeader";
import { PipelineStageColumn } from "@/components/crm/pipelines/PipelineStageColumn";
import { CreateStageDialog } from "@/components/crm/pipelines/CreateStageDialog";
import { EditStageDialog } from "@/components/crm/pipelines/EditStageDialog";
import { EditPipelineDialog } from "@/components/crm/pipelines/EditPipelineDialog";
import { toast } from "sonner";
import { dispatchWorkflowForDealMove } from "@/lib/workflow-dispatcher";
import { useChatExpressStore } from "@/stores/chatExpress.store";
import { Button } from "@/components/ui/button";
import { PanelLeft, Route } from "lucide-react";
import { JourneyNetworkSettings } from "@/components/crm/journey/JourneyNetworkSettings";

export default function Pipelines() {
  const isMobile = useIsMobile();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [activePipelineId, setActivePipelineId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPipelineId = urlParams.get("pipelineId");
      if (urlPipelineId) return urlPipelineId;

      const compId = localStorage.getItem("qualify_active_company_v2");
      if (compId) {
        const stored = localStorage.getItem(`qualify-active-pipeline:${compId}`);
        if (stored) return stored;
      }
    }
    return null;
  });
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  
  const [dealDrawerOpen, setDealDrawerOpen] = useState(false);
  const [journeySettingsOpen, setJourneySettingsOpen] = useState(false);
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);
  
  const [createStageOpen, setCreateStageOpen] = useState(false);
  const [editStageOpen, setEditStageOpen] = useState(false);
  const [selectedStageToEdit, setSelectedStageToEdit] = useState<any>(null);
  
  const [editPipelineOpen, setEditPipelineOpen] = useState(false);
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) return true;
      const saved = localStorage.getItem("qualify-pipeline-sidebar-collapsed");
      if (saved !== null) return saved === "true";
      return window.innerWidth < 1024;
    }
    return false;
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("qualify-pipeline-sidebar-collapsed", String(next));
      return next;
    });
  };

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
    enabled: !!activeCompany?.id,
  });

  // Fetch pipelines
  const { data: pipelines } = useQuery({
    queryKey: ["pipelines", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase
        .from("pipelines")
        .select("*")
        .eq("company_id", activeCompany.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Pipeline[];
    },
    enabled: !!activeCompany?.id
  });

  // Helper to find the first pipeline in the entire list (respecting groups and order)
  const getFirstPipelineId = (groupsList?: PipelineGroup[], pipelinesList?: Pipeline[]): string | null => {
    if (!pipelinesList || pipelinesList.length === 0) return null;
    const active = pipelinesList.filter(p => p.status !== "archived");
    if (active.length === 0) return pipelinesList[0]?.id || null;

    if (groupsList && groupsList.length > 0) {
      const sortedGroups = [...groupsList].sort((a, b) => a.order_index - b.order_index);
      for (const g of sortedGroups) {
        const inGroup = active
          .filter(p => p.group_id === g.id)
          .sort((a, b) => a.order_index - b.order_index);
        if (inGroup.length > 0) {
          return inGroup[0].id;
        }
      }
    }

    const unassigned = active
      .filter(p => !p.group_id)
      .sort((a, b) => a.order_index - b.order_index);
    if (unassigned.length > 0) {
      return unassigned[0].id;
    }

    return active[0]?.id || null;
  };

  // Restore last pipeline from URL or localStorage when entering or switching companies
  useEffect(() => {
    if (!activeCompany?.id) return;

    const urlParams = new URLSearchParams(window.location.search);
    const urlPipelineId = urlParams.get("pipelineId");
    const stored = localStorage.getItem(`qualify-active-pipeline:${activeCompany.id}`);

    if (urlPipelineId) {
      setActivePipelineId(urlPipelineId);
    } else if (stored) {
      setActivePipelineId(stored);
    }
  }, [activeCompany?.id]);

  // Persist current active pipeline in localStorage and sync with URL
  useEffect(() => {
    if (activeCompany?.id && activePipelineId) {
      localStorage.setItem(`qualify-active-pipeline:${activeCompany.id}`, activePipelineId);

      const url = new URL(window.location.href);
      if (url.searchParams.get("pipelineId") !== activePipelineId) {
        url.searchParams.set("pipelineId", activePipelineId);
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [activePipelineId, activeCompany?.id]);

  // When pipelines/groups load: validate activePipelineId, fallback to localStorage or first pipeline
  useEffect(() => {
    if (!pipelines || pipelines.length === 0 || groups === undefined) return;

    // 1. If currently selected pipeline is valid, keep it
    const currentExists = activePipelineId && pipelines.some(p => p.id === activePipelineId);
    if (currentExists) return;

    // 2. Otherwise try to restore from localStorage
    const stored = activeCompany?.id ? localStorage.getItem(`qualify-active-pipeline:${activeCompany.id}`) : null;
    if (stored && pipelines.some(p => p.id === stored)) {
      setActivePipelineId(stored);
      return;
    }

    // 3. Fallback to first pipeline of the list
    const firstId = getFirstPipelineId(groups, pipelines);
    if (firstId) {
      setActivePipelineId(firstId);
    }
  }, [pipelines, groups, activeCompany?.id, activePipelineId]);

  // Fetch active pipeline with stages
  const { data: activePipeline } = useQuery({
    queryKey: ["pipeline", activePipelineId],
    queryFn: async () => {
      if (!activePipelineId) return null;
      const { data, error } = await supabase
        .from("pipelines")
        .select("*, stages:pipeline_stages(*)")
        .eq("id", activePipelineId)
        .single();
      if (error) throw error;
      return data as Pipeline;
    },
    enabled: !!activePipelineId
  });

  // Derive active pipeline's group from cached groups
  const activeGroup = useMemo(() => {
    if (!activePipeline?.group_id || !groups) return undefined;
    return groups.find(g => g.id === activePipeline.group_id);
  }, [groups, activePipeline?.group_id]);

  // Fetch deals for active pipeline
  const { data: deals, isLoading: loadingDeals } = useQuery({
    queryKey: ['deals', activePipelineId],
    queryFn: async () => {
      if (!activePipelineId) return [];
      const { data, error } = await supabase
        .from('deals')
        .select('*, lead:leads(*)')
        .eq('pipeline_id', activePipelineId)
        .eq('status', 'open');
      if (error) throw error;
      return data;
    },
    enabled: !!activePipelineId
  });

  const stages = useMemo(() => {
    if (!activePipeline?.stages) return [];
    return [...activePipeline.stages].sort((a, b) => a.order_index - b.order_index);
  }, [activePipeline]);

  const [orderedStages, setOrderedStages] = useState<PipelineStage[]>(stages);

  useEffect(() => {
    setOrderedStages(stages);
  }, [stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const reorderStagesMutation = useMutation({
    mutationFn: async (newStages: PipelineStage[]) => {
      const updates = newStages.map((stage, index) => ({
        id: stage.id,
        order_index: index,
      }));
      
      for (const update of updates) {
        await supabase.from("pipeline_stages").update({ order_index: update.order_index }).eq("id", update.id);
      }
    },
    onMutate: async (newStages) => {
      await queryClient.cancelQueries({ queryKey: ["pipeline", activePipelineId] });
      const previousPipeline = queryClient.getQueryData(["pipeline", activePipelineId]);
      queryClient.setQueryData(["pipeline", activePipelineId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          stages: newStages.map((s, idx) => ({ ...s, order_index: idx })),
        };
      });
      return { previousPipeline };
    },
    onError: (_err: any, _vars, context) => {
      if (context?.previousPipeline) {
        queryClient.setQueryData(["pipeline", activePipelineId], context.previousPipeline);
      }
      toast.error("Erro ao reordenar etapas.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline", activePipelineId] });
    }
  });

  // Move deal to new stage mutation
  const moveDealMutation = useMutation({
    mutationFn: async ({ dealId, targetStageId }: { dealId: string; targetStageId: string }) => {
      const targetStage = stages.find(s => s.id === targetStageId);
      const newStatus = targetStage?.stage_type === 'won' ? 'won' : targetStage?.stage_type === 'lost' ? 'lost' : 'open';

      const { error } = await supabase
        .from('deals')
        .update({
          stage_id: targetStageId,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId);

      if (error) throw error;
      return { dealId, targetStageId, targetStageName: targetStage?.name };
    },
    onMutate: async ({ dealId, targetStageId }) => {
      await queryClient.cancelQueries({ queryKey: ['deals', activePipelineId] });
      const previousDeals = queryClient.getQueryData(['deals', activePipelineId]);

      queryClient.setQueryData(['deals', activePipelineId], (old: any[]) => {
        if (!old) return [];
        return old.map(d => d.id === dealId ? { ...d, stage_id: targetStageId } : d);
      });

      return { previousDeals };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(['deals', activePipelineId], context.previousDeals);
      }
      toast.error(`Erro ao mover negócio: ${err.message}`);
    },
    onSuccess: async (data, variables) => {
      toast.success(`Negócio movido para "${data.targetStageName || "nova etapa"}"!`);
      queryClient.invalidateQueries({ queryKey: ['deals', activePipelineId] });
      queryClient.invalidateQueries({ queryKey: ['lead-deals'] });

      // Trigger workflows
      await dispatchWorkflowForDealMove(data.dealId, activePipelineId, data.targetStageId);
    },
  });

  // Delete stage mutation
  const deleteStageMutation = useMutation({
    mutationFn: async (stage: PipelineStage) => {
      const stageDeals = (deals || []).filter(d => d.stage_id === stage.id);
      if (stageDeals.length > 0) {
        throw new Error(`Esta etapa possui ${stageDeals.length} negócio(s). Mova ou exclua os negócios antes de excluir a etapa.`);
      }

      const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stage.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etapa excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['pipeline', activePipelineId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir etapa");
    }
  });

  // Delete deal mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Negócio excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['deals', activePipelineId] });
      queryClient.invalidateQueries({ queryKey: ['lead-deals'] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir negócio");
    }
  });

  // Unarchive pipeline mutation
  const unarchivePipelineMutation = useMutation({
    mutationFn: async (pipelineId: string) => {
      const { error } = await supabase
        .from("pipelines")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", pipelineId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pipeline desarquivada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline", activePipelineId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao desarquivar pipeline");
    }
  });

  // Delete pipeline permanently mutation
  const deletePipelinePermanentlyMutation = useMutation({
    mutationFn: async (pipelineId: string) => {
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("pipeline_id", pipelineId);

      if (stages && stages.length > 0) {
        const stageIds = stages.map(s => s.id);
        await supabase.from("deals").delete().in("stage_id", stageIds);
        await supabase.from("pipeline_stages").delete().eq("pipeline_id", pipelineId);
      }

      const { error } = await supabase
        .from("pipelines")
        .delete()
        .eq("id", pipelineId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pipeline excluída definitivamente!");
      queryClient.invalidateQueries({ queryKey: ["pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      const remaining = (pipelines || []).filter(p => p.id !== activePipelineId && p.status !== "archived");
      setActivePipelineId(remaining[0]?.id || "");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir pipeline definitivamente");
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = orderedStages.findIndex((s) => s.id === active.id);
      const newIndex = orderedStages.findIndex((s) => s.id === over.id);
      
      const newOrdered = arrayMove(orderedStages, oldIndex, newIndex);
      setOrderedStages(newOrdered);
      reorderStagesMutation.mutate(newOrdered);
    }
  };

  const dealsByStage = useMemo(() => {
    const acc: Record<string, any[]> = {};
    stages.forEach(s => acc[s.id] = []);
    if (deals) {
      deals.forEach(deal => {
        if (search) {
          const s = search.toLowerCase();
          const matchTitle = deal.title?.toLowerCase().includes(s);
          const matchLead = deal.lead?.name?.toLowerCase().includes(s) || deal.lead?.phone?.includes(s);
          if (!matchTitle && !matchLead) return;
        }

        if (acc[deal.stage_id]) {
          acc[deal.stage_id].push(deal);
        }
      });
    }
    Object.keys(acc).forEach(key => {
      acc[key].sort((a, b) => (a.position || 0) - (b.position || 0));
    });
    return acc;
  }, [deals, stages, search]);

  const handleOpenDeal = (deal: any) => {
    setSelectedDeal(deal as Deal);
    setSelectedLead(deal.lead || null);
    setDealDrawerOpen(true);
  };

  return (
    <div className="flex h-full bg-background overflow-hidden relative">
      <PipelineSidebar 
        activePipelineId={activePipelineId} 
        onSelectPipeline={setActivePipelineId} 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {activePipeline ? (
          <>
            <div className="flex justify-end px-4 pt-2 bg-background"><Button size="sm" variant="outline" onClick={() => setJourneySettingsOpen(true)}><Route className="h-4 w-4 mr-2" /> Configurar jornadas</Button></div>
            <PipelineHeader 
              pipeline={activePipeline} 
              group={activeGroup || undefined}
              search={search}
              setSearch={setSearch}
              onOpenSettings={() => setEditPipelineOpen(true)}
              onUnarchive={() => activePipeline && unarchivePipelineMutation.mutate(activePipeline.id)}
              onDeletePermanently={() => {
                if (!activePipeline) return;
                const confirm = window.confirm(
                  `Tem certeza que deseja excluir a pipeline "${activePipeline.name}" definitivamente? Esta ação não pode ser desfeita.`
                );
                if (confirm) {
                  deletePipelinePermanentlyMutation.mutate(activePipeline.id);
                }
              }}
              isSidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={toggleSidebar}
            />
            
            <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden md:overflow-x-auto p-3 md:p-6 pb-8 bg-muted/10 overscroll-x-contain">
              <div className="flex w-full flex-col md:w-max md:flex-row items-start gap-4 md:h-full">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={orderedStages.map(s => s.id)}
                    strategy={isMobile ? verticalListSortingStrategy : horizontalListSortingStrategy}
                  >
                    {orderedStages.map(stage => (
                      <PipelineStageColumn 
                        key={stage.id}
                        stage={stage}
                        deals={dealsByStage[stage.id] || []}
                        onOpenDeal={handleOpenDeal}
                        onEditStage={(s) => {
                          setSelectedStageToEdit(s);
                          setEditStageOpen(true);
                        }}
                        onDeleteStage={(s) => deleteStageMutation.mutate(s)}
                        onDeleteDeal={(dealId) => deleteDealMutation.mutate(dealId)}
                        onDropDeal={(dealId, targetStageId) => {
                          moveDealMutation.mutate({ dealId, targetStageId });
                        }}
                        onOpenChat={(leadId) => {
                          const matchedDeal = deals?.find(d => d.lead_id === leadId);
                          const lead = matchedDeal?.lead;
                          useChatExpressStore.getState().openLeadSession({
                            leadId,
                            leadName: lead?.name || lead?.phone || "Lead",
                            phone: lead?.phone || null,
                          });
                        }}
                        onOpenLead={(leadId) => {
                          const matchedDeal = deals?.find(d => d.lead_id === leadId);
                          setSelectedLead(matchedDeal?.lead || { id: leadId });
                          setLeadDrawerOpen(true);
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
                
                {orderedStages.length === 0 && (
                  <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-xl text-center p-8 space-y-4 text-muted-foreground max-w-md mx-auto mt-20">
                    <p>Esta pipeline ainda não possui etapas.</p>
                    <button 
                      type="button"
                      onClick={() => setCreateStageOpen(true)}
                      className="text-primary font-medium hover:underline"
                    >
                      Adicionar Primeira Etapa
                    </button>
                  </div>
                )}
                
                {orderedStages.length > 0 && (
                  <button 
                    type="button"
                    onClick={() => setCreateStageOpen(true)}
                    className="flex-shrink-0 w-full md:w-[300px] h-[48px] rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground flex items-center justify-center text-sm font-medium transition-colors cursor-pointer"
                  >
                    + Nova Etapa
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col h-full">
            <div className="p-4 border-b h-16 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                onClick={toggleSidebar}
                title={sidebarCollapsed ? "Expandir listagem de pipelines" : "Recolher listagem de pipelines"}
              >
                <PanelLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-lg font-bold">Pipelines</h1>
            </div>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center space-y-4 max-w-md text-muted-foreground">
                <h2 className="text-xl font-semibold text-foreground">Bem-vindo aos Pipelines</h2>
                <p>Selecione uma pipeline no menu lateral ou crie uma nova para começar a organizar seus negócios.</p>
                {sidebarCollapsed && (
                  <Button variant="outline" size="sm" onClick={toggleSidebar} className="mt-2">
                    <PanelLeft className="w-4 h-4 mr-2" />
                    Abrir Lista de Pipelines
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {activeCompany?.id && <JourneyNetworkSettings open={journeySettingsOpen} onOpenChange={setJourneySettingsOpen} companyId={activeCompany.id} />}
      <DealDrawer 
        open={dealDrawerOpen} 
        onOpenChange={setDealDrawerOpen}
        deal={selectedDeal}
        lead={selectedLead}
        onOpenLead={() => {
          setDealDrawerOpen(false);
          setLeadDrawerOpen(true);
        }}
      />
      
      <LeadDrawer 
        open={leadDrawerOpen} 
        onOpenChange={setLeadDrawerOpen}
        leadId={selectedLead?.id}
      />

      <CreateStageDialog
        open={createStageOpen}
        onOpenChange={setCreateStageOpen}
        pipelineId={activePipelineId}
        currentStagesCount={orderedStages.length}
      />
      
      <EditStageDialog
        open={editStageOpen}
        onOpenChange={setEditStageOpen}
        stage={selectedStageToEdit}
      />
      
      <EditPipelineDialog
        open={editPipelineOpen}
        onOpenChange={setEditPipelineOpen}
        pipeline={activePipeline || null}
      />
    </div>
  );
}
