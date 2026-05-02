import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Lead } from "@/hooks/useLeads";

interface LeadHistoryDialogProps {
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
}

export function LeadHistoryDialog({ lead, onOpenChange }: LeadHistoryDialogProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["lead-history", lead?.id],
    enabled: !!lead,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_campaign_history")
        .select("*")
        .eq("lead_id", lead!.id)
        .order("started_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={!!lead} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Histórico de Campanhas</DialogTitle>
          <DialogDescription>{lead?.name || lead?.phone}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : !history?.length ? (
            <p className="text-sm text-muted-foreground">Nenhum histórico encontrado.</p>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{entry.campaign_name || "Campanha"}</span>
                  <Badge variant="secondary">{entry.campaign_type}</Badge>
                </div>
                {entry.result_action && <p className="text-xs text-muted-foreground">Resultado: {entry.result_action}</p>}
                {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(entry.started_at), "dd/MM/yyyy HH:mm")}
                  {entry.completed_at && ` — ${format(new Date(entry.completed_at), "dd/MM/yyyy HH:mm")}`}
                </p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
