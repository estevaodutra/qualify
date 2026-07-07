import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Deal, Pipeline } from "@/types/crm.types";
import { DealKanbanCard } from "@/components/crm/kanban/DealKanbanCard";
import { DealDrawer } from "@/components/crm/deals/DealDrawer";
import { LeadDrawer } from "@/components/crm/leads/LeadDrawer";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Kanban() {
  const { user } = useAuth();
  
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  
  const [dealDrawerOpen, setDealDrawerOpen] = useState(false);
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);

  const { data: pipelines, isLoading: loadingPipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pipelines').select('*, stages:pipeline_stages(*)');
      if (error) throw error;
      return data as Pipeline[];
    }
  });

  const activePipeline = pipelines?.[0]; // Get the first pipeline for now

  const { data: deals, isLoading: loadingDeals } = useQuery({
    queryKey: ['deals', activePipeline?.id],
    queryFn: async () => {
      if (!activePipeline?.id) return [];
      const { data, error } = await supabase
        .from('deals')
        .select('*, lead:leads(*)')
        .eq('pipeline_id', activePipeline.id)
        .eq('status', 'open');
      if (error) throw error;
      return data;
    },
    enabled: !!activePipeline?.id
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
        if (acc[deal.stage_id]) {
          acc[deal.stage_id].push(deal);
        }
      });
    }
    return acc;
  }, [deals, stages]);

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

  if (loadingPipelines || loadingDeals) {
    return <div className="p-8 text-center text-muted-foreground">Carregando Kanban...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-border/40 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-['Sora']">Kanban</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seus negócios e funil de vendas</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Buscar negócio..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-[250px] bg-secondary/50 border-transparent focus-visible:ring-1 focus-visible:border-border"
            />
          </div>
          <Button variant="outline" className="h-9 gap-2 shadow-none">
            <Filter className="w-4 h-4" /> Filtros
          </Button>
          <Button className="h-9 gap-2 shadow-none bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Novo Negócio
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 pb-8">
        <div className="flex h-full items-start gap-4" style={{ minWidth: "max-content" }}>
          {stages.map(stage => (
            <div key={stage.id} className="flex flex-col h-full w-[300px] shrink-0 bg-muted/20 rounded-xl border border-border/40">
              {/* Stage Header */}
              <div className="p-3.5 border-b border-border/40 flex items-center justify-between sticky top-0 bg-background/50 backdrop-blur-sm z-10 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color || "#94a3b8" }} />
                  <span className="font-semibold text-sm text-foreground">{stage.name}</span>
                  <span className="bg-secondary text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {dealsByStage[stage.id]?.length || 0}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-secondary">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Deals List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-6 custom-scrollbar">
                {dealsByStage[stage.id]?.map(deal => (
                  <DealKanbanCard 
                    key={deal.id}
                    deal={deal as any}
                    onClick={() => handleOpenDeal(deal)}
                    onOpenLead={() => handleOpenLead(deal.lead_id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DealDrawer 
        open={dealDrawerOpen} 
        onOpenChange={setDealDrawerOpen} 
        deal={selectedDeal} 
        lead={selectedLead} 
      />
      <LeadDrawer 
        open={leadDrawerOpen} 
        onOpenChange={setLeadDrawerOpen} 
        lead={selectedLead} 
      />
    </div>
  );
}
