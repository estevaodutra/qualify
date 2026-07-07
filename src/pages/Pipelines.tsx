import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Deal, Pipeline } from "@/types/crm.types";
import { DealKanbanCard } from "@/components/crm/kanban/DealKanbanCard";
import { DealDrawer } from "@/components/crm/deals/DealDrawer";
import { LeadDrawer } from "@/components/crm/leads/LeadDrawer";
import { Plus, Search, Filter, Kanban, Settings, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Pipelines() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  
  const [dealDrawerOpen, setDealDrawerOpen] = useState(false);
  const [leadDrawerOpen, setLeadDrawerOpen] = useState(false);
  
  const [newPipelineOpen, setNewPipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");

  const createPipelineMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!activeCompany?.id) throw new Error("Empresa não selecionada");
      
      // 1. Criar a pipeline
      const { data: pipeline, error: pipeError } = await supabase
        .from('pipelines')
        .insert({ company_id: activeCompany.id, name })
        .select()
        .single();
        
      if (pipeError) throw pipeError;
      
      // 2. Criar etapas padrões para não ficar vazia
      const defaultStages = [
        { pipeline_id: pipeline.id, company_id: activeCompany.id, name: "Novo Lead", color: "#3b82f6", order_index: 0 },
        { pipeline_id: pipeline.id, company_id: activeCompany.id, name: "Contato Feito", color: "#eab308", order_index: 1 },
        { pipeline_id: pipeline.id, company_id: activeCompany.id, name: "Ganha", color: "#22c55e", order_index: 2 },
        { pipeline_id: pipeline.id, company_id: activeCompany.id, name: "Perdida", color: "#ef4444", order_index: 3 },
      ];
      
      const { error: stagesError } = await supabase
        .from('pipeline_stages')
        .insert(defaultStages);
        
      if (stagesError) throw stagesError;
      
      return pipeline;
    },
    onSuccess: () => {
      toast.success("Pipeline criada com sucesso!");
      setNewPipelineOpen(false);
      setNewPipelineName("");
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao criar pipeline.");
    }
  });

  const handleCreatePipeline = () => {
    if (!newPipelineName.trim()) return;
    createPipelineMutation.mutate(newPipelineName);
  };

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
    return <div className="p-8 text-center text-muted-foreground">Carregando Pipelines...</div>;
  }

  if (!loadingPipelines && (!pipelines || pipelines.length === 0)) {
    return (
      <div className="flex flex-col h-full bg-background overflow-hidden items-center justify-center p-8">
        <div className="flex flex-col items-center justify-center max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Kanban className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold font-['Sora'] text-foreground">Nenhuma Pipeline Encontrada</h2>
          <p className="text-muted-foreground">
            Você ainda não possui um funil de vendas configurado. Crie sua primeira pipeline para começar a gerenciar seus negócios.
          </p>

          <Dialog open={newPipelineOpen} onOpenChange={setNewPipelineOpen}>
            <DialogTrigger asChild>
              <Button className="mt-4 gap-2 shadow-none bg-primary text-primary-foreground hover:bg-primary/90" size="lg">
                <Plus className="w-4 h-4" /> Nova Pipeline
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Pipeline</DialogTitle>
                <DialogDescription>
                  Dê um nome para o seu novo funil de vendas. Depois você poderá configurar as etapas.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome da Pipeline</Label>
                  <Input 
                    id="name" 
                    placeholder="Ex: Vendas B2B, Captação..." 
                    value={newPipelineName}
                    onChange={(e) => setNewPipelineName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewPipelineOpen(false)}>Cancelar</Button>
                <Button 
                  onClick={handleCreatePipeline}
                  disabled={!newPipelineName.trim() || createPipelineMutation.isPending}
                >
                  {createPipelineMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Continuar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-border/40 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-['Sora']">Pipelines</h1>
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
