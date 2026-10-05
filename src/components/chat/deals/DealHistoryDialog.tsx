import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Deal, Activity } from "@/types/crm.types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  History,
  Award,
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  GitBranch,
  ListTodo,
} from "lucide-react";

interface DealHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: (Deal & { pipeline?: any }) | null;
  leadId?: string;
}

export function DealHistoryDialog({
  open,
  onOpenChange,
  deal,
  leadId,
}: DealHistoryDialogProps) {
  // Fetch activities for this lead/deal
  const { data: activities = [], isLoading: isLoadingActivities } = useQuery<Activity[]>({
    queryKey: ["deal-activities-history", deal?.id, leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data || []) as Activity[];
    },
    enabled: !!leadId && open,
  });

  if (!deal) return null;

  const currentStage = (deal.pipeline?.stages || []).find((s: any) => s.id === deal.stage_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl z-[9999] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Histórico da Oportunidade
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-1 pr-1 scrollbar-thin">
          {/* Card Resumo do Negócio */}
          <div className="p-3 rounded-xl border border-border/50 bg-background/60 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-sm text-foreground">{deal.title || "Negócio"}</h4>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  <GitBranch className="h-3 w-3 text-primary" />
                  <span>{deal.pipeline?.name || "Pipeline"}</span>
                  {currentStage && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-foreground">{currentStage.name}</span>
                    </>
                  )}
                </div>
              </div>

              <Badge
                variant="secondary"
                className="text-[10px] font-bold px-2 py-0.5"
                style={{
                  backgroundColor: `${currentStage?.color || "#3b82f6"}1F`,
                  borderColor: `${currentStage?.color || "#3b82f6"}59`,
                  color: currentStage?.color || "#3b82f6",
                }}
              >
                {deal.status === "won" ? "Ganho" : deal.status === "lost" ? "Perdido" : "Em Andamento"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: deal.currency || "BRL" }).format(deal.value || 0)}
                </span>
              </div>

              {deal.expected_close_date && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  <span>Previsto: {format(new Date(deal.expected_close_date), "dd/MM/yyyy")}</span>
                </div>
              )}
            </div>

            {deal.description && (
              <p className="text-[11px] text-muted-foreground whitespace-pre-wrap bg-muted/30 p-2 rounded-lg border border-border/20">
                {deal.description}
              </p>
            )}
          </div>

          {/* Timeline de Eventos */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Linha do Tempo
            </h5>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
              {/* Evento de Criação */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-primary/20 text-primary border-2 border-background flex items-center justify-center">
                  <Award className="h-2.5 w-2.5" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-foreground">Negócio Criado</span>
                  <p className="text-[10px] text-muted-foreground">
                    {deal.created_at ? format(new Date(deal.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) : "Data não disponível"}
                  </p>
                </div>
              </div>

              {/* Evento de Ganho / Fechado */}
              {deal.won_at && (
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-600 border-2 border-background flex items-center justify-center">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-emerald-600">Negócio Marcado como Ganho</span>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(deal.won_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>
              )}

              {/* Evento de Perdido */}
              {deal.lost_at && (
                <div className="relative">
                  <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-rose-500/20 text-rose-600 border-2 border-background flex items-center justify-center">
                    <XCircle className="h-2.5 w-2.5" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-rose-600">Negócio Perdido</span>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(deal.lost_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>
              )}

              {/* Atividades vinculadas ao lead */}
              {activities.map((act) => (
                <div key={act.id} className="relative">
                  <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-blue-500/20 text-blue-500 border-2 border-background flex items-center justify-center">
                    <ListTodo className="h-2.5 w-2.5" />
                  </div>
                  <div className="text-xs">
                    <span className="font-semibold text-foreground">{act.title}</span>
                    <p className="text-[10px] text-muted-foreground">
                      {act.type.toUpperCase()} • {act.created_at ? format(new Date(act.created_at), "dd/MM/yyyy HH:mm") : ""}
                    </p>
                    {act.description && (
                      <p className="text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-2">
                        {act.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs rounded-xl w-full"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
