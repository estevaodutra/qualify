import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, MapPin, ArrowLeft, Send, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TriggerSequenceDialog } from "@/components/prospecting-campaigns/TriggerSequenceDialog";

export default function ProspectingCampaignLeads() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<{ id: string, name: string, phone: string } | null>(null);

  // Fetch campaign details
  const { data: campaign, isLoading: loadingCampaign } = useQuery({
    queryKey: ["prospecting_campaign", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospecting_campaigns")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch leads
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["prospecting_leads", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("active_campaign_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleOpenDialog = (leadId: string, leadName: string | null, leadPhone: string | null) => {
    setSelectedLead({ id: leadId, name: leadName || "", phone: leadPhone || "" });
    setDialogOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/prospeccao")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">Leads da Prospecção</h2>
          </div>
          <p className="text-muted-foreground ml-12">
            {loadingCampaign ? "Carregando..." : campaign?.name}
          </p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Resultados Encontrados</CardTitle>
              <CardDescription>
                Visualize os contatos extraídos e inicie o disparo de mensagens para cada um.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono text-base px-3 py-1">
              {loadingLeads ? "..." : leads.length} contatos
            </Badge>
          </div>
        </CardHeader>
        
        <div className="flex-1 overflow-hidden">
          {loadingLeads ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
              <User className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum lead encontrado</h3>
              <p className="text-muted-foreground max-w-sm">
                Esta campanha ainda não possui resultados ou a busca não retornou nenhum contato válido.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="divide-y divide-border">
                {leads.map((lead) => {
                  const custom = (lead.custom_fields || {}) as any;
                  return (
                    <div key={lead.id} className="p-4 sm:p-6 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <h4 className="text-lg font-semibold text-foreground truncate">{lead.name}</h4>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            {lead.phone && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
                                <Phone className="h-4 w-4 shrink-0" />
                                <span>{lead.phone}</span>
                              </div>
                            )}
                            
                            {custom.categoryName && (
                              <Badge variant="outline" className="text-xs h-6 px-2 font-normal whitespace-nowrap">
                                {custom.categoryName}
                              </Badge>
                            )}
 
                            {custom.totalScore != null && (
                              <div className="flex items-center gap-1.5 text-sm text-amber-500 font-medium whitespace-nowrap">
                                <span>★</span>
                                <span>{custom.totalScore}</span>
                                {custom.reviewsCount != null && (
                                  <span className="text-muted-foreground text-xs font-normal">({custom.reviewsCount} avaliações)</span>
                                )}
                              </div>
                            )}
                          </div>
 
                          {custom.address && (
                            <div className="flex items-start gap-1.5 text-sm text-muted-foreground pt-1">
                              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                              <span className="line-clamp-2 leading-snug">{custom.address}</span>
                            </div>
                          )}
 
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-auto mt-2 sm:mt-0 flex flex-col sm:flex-row gap-2">
                        {custom.website && (
                          <Button 
                            variant="outline"
                            className="w-full sm:w-auto shadow-sm gap-2"
                            onClick={() => window.open(custom.website, "_blank")}
                          >
                            <Globe className="h-4 w-4" />
                            Ver site
                          </Button>
                        )}
                        <Button 
                          className="w-full sm:w-auto shadow-sm gap-2" 
                          onClick={() => handleOpenDialog(lead.id, lead.name, lead.phone)}
                        >
                          <Send className="h-4 w-4" />
                          Disparar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </Card>
 
      {selectedLead && (
        <TriggerSequenceDialog
          leadName={selectedLead.name}
          leadPhone={selectedLead.phone}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}
