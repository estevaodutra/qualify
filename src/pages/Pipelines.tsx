import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Deal, Pipeline, PipelineGroup } from "@/types/crm.types";
import { DealDrawer } from "@/components/crm/deals/DealDrawer";
import { LeadDrawer } from "@/components/crm/leads/LeadDrawer";
import { PipelineSidebar } from "@/components/crm/pipelines/PipelineSidebar";
import { PipelineHeader } from "@/components/crm/pipelines/PipelineHeader";
import { PipelineStageColumn } from "@/components/crm/pipelines/PipelineStageColumn";

export default function Pipelines() {
  const { activeCompany } = useCompany();
  
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  
  const [dealDrawerOpen, setDealDrawerOpen] = useState(false);
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);

  // Initialize active pipeline from localStorage
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

  // Persist active pipeline
  useEffect(() => {
    if (activeCompany?.id && activePipelineId) {
      localStorage.setItem(`qualify-active-pipeline:${activeCompany.id}`, activePipelineId);
      
      const url = new URL(window.location.href);
      url.searchParams.set("pipelineId", activePipelineId);
      window.history.replaceState({}, "", url.toString());
    }
  }, [activePipelineId, activeCompany?.id]);

  // Fallback to first pipeline if none selected
  const { data: pipelines } = useQuery({
    queryKey: ["pipelines", activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { data, error } = await supabase.from("pipelines").select("*").eq("company_id", activeCompany.id).eq("status", "active").order("order_index", { ascending: true });
      if (error) throw error;
      return data as Pipeline[];
    },
    enabled: !!activeCompany?.id
  });

  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !activePipelineId) {
      setActivePipelineId(pipelines[0].id);
    }
  }, [pipelines, activePipelineId]);

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

  // Fetch active pipeline's group
  const { data: activeGroup } = useQuery({
    queryKey: ["pipeline-groups", activeCompany?.id, activePipeline?.group_id],
    queryFn: async () => {
      if (!activePipeline?.group_id) return null;
      const { data, error } = await supabase
        .from("pipeline_groups")
        .select("*")
        .eq("id", activePipeline.group_id)
        .single();
      if (error) throw error;
      return data as PipelineGroup;
    },
    enabled: !!activePipeline?.group_id
  });

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

  const dealsByStage = useMemo(() => {
    const acc: Record<string, any[]> = {};
    stages.forEach(s => acc[s.id] = []);
    if (deals) {
      deals.forEach(deal => {
        // Simple search filter
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
    // Sort deals by position
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

  const handleOpenLead = (leadId: string) => {
    const deal = deals?.find(d => d.lead_id === leadId);
    if (deal?.lead) {
      setSelectedLead(deal.lead);
      setLeadDrawerOpen(true);
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden">
      <PipelineSidebar 
        activePipelineId={activePipelineId} 
        onSelectPipeline={setActivePipelineId} 
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activePipeline ? (
          <>
            <PipelineHeader 
              pipeline={activePipeline} 
              group={activeGroup || undefined}
              search={search}
              setSearch={setSearch}
              onOpenSettings={() => console.log("Open pipeline settings")}
            />
            
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 pb-8 bg-muted/10">
              <div className="flex h-full items-start gap-4" style={{ minWidth: "max-content" }}>
                {stages.map(stage => (
                  <PipelineStageColumn 
                    key={stage.id}
                    stage={stage}
                    deals={dealsByStage[stage.id] || []}
                    onOpenDeal={handleOpenDeal}
                    onEditStage={(s) => console.log("Edit stage", s)}
                  />
                ))}
                
                {stages.length === 0 && (
                  <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-xl text-center p-8 space-y-4 text-muted-foreground max-w-md mx-auto mt-20">
                    <p>Esta pipeline ainda não possui etapas.</p>
                    <button className="text-primary font-medium hover:underline">Adicionar Primeira Etapa</button>
                  </div>
                )}
                
                {stages.length > 0 && (
                  <button className="flex-shrink-0 w-[300px] h-[48px] rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground flex items-center justify-center text-sm font-medium transition-colors">
                    + Nova Etapa
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-4 max-w-md text-muted-foreground">
              <h2 className="text-xl font-semibold text-foreground">Bem-vindo aos Pipelines</h2>
              <p>Selecione uma pipeline no menu lateral ou crie uma nova para começar a organizar seus negócios.</p>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
}
