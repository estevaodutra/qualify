import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Phone, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ProspectingLeadsDialogProps {
  campaignId: string | null;
  campaignName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProspectingLeadsDialog({ campaignId, campaignName, open, onOpenChange }: ProspectingLeadsDialogProps) {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["prospecting_leads", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("active_campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Leads extraídos: {campaignName}
            <Badge variant="secondary" className="ml-2 font-mono">
              {isLoading ? "..." : leads.length} contatos
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col mt-4">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">Nenhum lead encontrado para esta busca.</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 h-full rounded-xl border border-border/30 bg-card/30">
              <div className="divide-y divide-border/30">
                {leads.map((lead) => (
                  <div key={lead.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{lead.name}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{lead.phone}</span>
                        </div>
                        {lead.custom_fields && typeof lead.custom_fields === 'object' && (lead.custom_fields as any).address && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{(lead.custom_fields as any).address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
