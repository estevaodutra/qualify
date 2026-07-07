import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Deal, Lead } from "@/types/crm.types";
import { LeadAvatar, DealPipelineStage, DealValue, LeadOwner } from "../shared";
import { format } from "date-fns";
import { Info, FileText, CheckSquare, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DealDrawerProps {
  deal: Deal | null;
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DealDrawer({ deal, lead, open, onOpenChange }: DealDrawerProps) {
  if (!deal) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[500px] p-0 flex flex-col h-full bg-background/95 backdrop-blur-sm border-l border-border/40">
        
        {/* Header Section */}
        <div className="p-6 pb-4 border-b border-border/40 bg-card/30">
          <SheetHeader className="flex flex-col items-start gap-4 space-y-0">
            <div className="flex items-start justify-between w-full">
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider bg-background">
                    #{deal.id.split('-')[0]}
                  </Badge>
                  <DealPipelineStage stageName="Em Andamento" stageColor="#3b82f6" />
                </div>
                <SheetTitle className="text-xl font-bold mt-1 text-foreground leading-tight">
                  {deal.title || "Negócio sem título"}
                </SheetTitle>
                <DealValue value={deal.value} currency={deal.currency} className="text-lg mt-1" />
              </div>
            </div>

            {lead && (
              <div className="w-full flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2.5">
                  <LeadAvatar name={lead.name} className="w-7 h-7 text-xs" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{lead.name || "Sem nome"}</span>
                    <span className="text-[10px] text-muted-foreground">{lead.company_name || lead.phone || "—"}</span>
                  </div>
                </div>
                <LeadOwner ownerName={deal.owner_id ? "Responsável" : null} />
              </div>
            )}
          </SheetHeader>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="detalhes" className="flex-1 flex flex-col">
            <div className="px-6 border-b border-border/40 bg-card/20">
              <TabsList className="bg-transparent p-0 h-12 gap-6 w-full justify-start rounded-none">
                <TabsTrigger 
                  value="detalhes" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12 text-[13px] font-semibold gap-2"
                >
                  <Info className="w-4 h-4" /> Detalhes
                </TabsTrigger>
                <TabsTrigger 
                  value="tarefas" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12 text-[13px] font-semibold gap-2"
                >
                  <CheckSquare className="w-4 h-4" /> Tarefas
                </TabsTrigger>
                <TabsTrigger 
                  value="notas" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12 text-[13px] font-semibold gap-2"
                >
                  <FileText className="w-4 h-4" /> Notas
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="detalhes" className="mt-0 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" /> Informações
                  </h4>
                  <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/40">
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">Fechamento Esperado</span>
                      <p className="text-[13px] font-medium mt-1">
                        {deal.expected_close_date ? format(new Date(deal.expected_close_date), 'dd/MM/yyyy') : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">Probabilidade</span>
                      <p className="text-[13px] font-medium mt-1">{deal.probability || 0}%</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">Status</span>
                      <p className="text-[13px] font-medium mt-1 capitalize">{deal.status}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">Prioridade</span>
                      <p className="text-[13px] font-medium mt-1 capitalize">{deal.priority || "Normal"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Descrição
                  </h4>
                  <div className="bg-muted/20 p-4 rounded-xl border border-border/40 min-h-[100px]">
                    <p className="text-[13px] text-muted-foreground whitespace-pre-wrap">
                      {deal.description || "Nenhuma descrição informada."}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tarefas" className="mt-0">
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/50 rounded-xl bg-muted/10">
                  <CheckSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <h3 className="text-sm font-semibold mb-1">Sem Tarefas</h3>
                  <p className="text-xs text-muted-foreground mb-4 max-w-[250px]">
                    Adicione tarefas e próximos passos para avançar este negócio.
                  </p>
                  <button className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                    + Adicionar Tarefa
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="notas" className="mt-0">
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/50 rounded-xl bg-muted/10">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <h3 className="text-sm font-semibold mb-1">Nenhuma Nota</h3>
                  <p className="text-xs text-muted-foreground mb-4 max-w-[250px]">
                    Registre anotações, reuniões e informações relevantes ao negócio.
                  </p>
                  <button className="bg-secondary text-secondary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors">
                    + Escrever Nota
                  </button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

      </SheetContent>
    </Sheet>
  );
}
