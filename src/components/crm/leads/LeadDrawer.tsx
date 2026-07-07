import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lead } from "@/types/crm.types";
import { LeadAvatar, LeadTags, LeadOwner } from "../shared";
import { formatPhone } from "@/lib/utils";
import { User, Phone, Mail, Award, Clock, Activity, FileText } from "lucide-react";

interface LeadDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeadDrawer({ lead, open, onOpenChange }: LeadDrawerProps) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[500px] p-0 flex flex-col h-full bg-background/95 backdrop-blur-sm border-l border-border/40">
        
        {/* Header Section */}
        <div className="p-6 pb-4 border-b border-border/40 bg-card/30">
          <SheetHeader className="flex flex-row items-start gap-4 space-y-0">
            <LeadAvatar name={lead.name} className="w-16 h-16 shadow-md" fallbackClassName="text-2xl" />
            <div className="flex flex-col gap-1.5 flex-1 pt-1">
              <SheetTitle className="text-xl font-bold">{lead.name || "Sem Nome"}</SheetTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                {lead.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {formatPhone(lead.phone)}
                  </span>
                )}
                {lead.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {lead.email}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <LeadOwner ownerName={lead.owner_id ? "Atendente" : null} />
                <LeadTags tags={lead.tags} maxVisible={5} />
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="resumo" className="flex-1 flex flex-col">
            <div className="px-6 border-b border-border/40 bg-card/20">
              <TabsList className="bg-transparent p-0 h-12 gap-6 w-full justify-start rounded-none">
                <TabsTrigger 
                  value="resumo" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12 text-[13px] font-semibold gap-2"
                >
                  <User className="w-4 h-4" /> Resumo
                </TabsTrigger>
                <TabsTrigger 
                  value="negocios" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12 text-[13px] font-semibold gap-2"
                >
                  <Award className="w-4 h-4" /> Negócios
                  {lead.active_deals_count ? (
                    <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                      {lead.active_deals_count}
                    </span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger 
                  value="historico" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12 text-[13px] font-semibold gap-2"
                >
                  <Clock className="w-4 h-4" /> Histórico
                </TabsTrigger>
                <TabsTrigger 
                  value="atividades" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 h-12 text-[13px] font-semibold gap-2"
                >
                  <Activity className="w-4 h-4" /> Atividades
                  {lead.pending_activities_count ? (
                    <span className="bg-amber-500/10 text-amber-600 text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                      {lead.pending_activities_count}
                    </span>
                  ) : null}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <TabsContent value="resumo" className="mt-0 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Informações Pessoais
                  </h4>
                  <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/40">
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">Empresa</span>
                      <p className="text-[13px] font-medium mt-1">{lead.company_name || "—"}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">Documento</span>
                      <p className="text-[13px] font-medium mt-1">{lead.document || "—"}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">Origem</span>
                      <p className="text-[13px] font-medium mt-1">{lead.source_name || lead.source_type || "—"}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted-foreground uppercase">Site</span>
                      <p className="text-[13px] font-medium mt-1 text-primary">{lead.website || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Notas Rápidas
                  </h4>
                  <div className="bg-muted/20 p-4 rounded-xl border border-border/40 min-h-[100px]">
                    <p className="text-[13px] text-muted-foreground italic">
                      {(lead.custom_fields as any)?.notas || "Nenhuma nota registrada."}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="negocios" className="mt-0">
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/50 rounded-xl bg-muted/10">
                  <Award className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <h3 className="text-sm font-semibold mb-1">Nenhum Negócio</h3>
                  <p className="text-xs text-muted-foreground mb-4 max-w-[250px]">
                    Este lead não possui negócios ativos no momento.
                  </p>
                  <button className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                    + Criar Negócio
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="mt-0">
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/50 rounded-xl bg-muted/10">
                  <Clock className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <h3 className="text-sm font-semibold mb-1">Histórico Vazio</h3>
                  <p className="text-xs text-muted-foreground max-w-[250px]">
                    Nenhuma interação registrada ainda.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="atividades" className="mt-0">
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/50 rounded-xl bg-muted/10">
                  <Activity className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <h3 className="text-sm font-semibold mb-1">Sem Atividades</h3>
                  <p className="text-xs text-muted-foreground mb-4 max-w-[250px]">
                    Não há tarefas ou atividades pendentes.
                  </p>
                  <button className="bg-secondary text-secondary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:bg-secondary/80 transition-colors">
                    + Nova Atividade
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
