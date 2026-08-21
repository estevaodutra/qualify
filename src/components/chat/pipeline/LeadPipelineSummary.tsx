import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Deal, Pipeline, PipelineStage } from "@/types/crm.types";
import AddLeadToPipelineDialog from "./AddLeadToPipelineDialog";
import MoveDealConfirmPopover from "./MoveDealConfirmPopover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Check, X as XIcon, GitBranch, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface LeadPipelineSummaryProps {
  leadId?: string;
  leadName?: string | null;
  className?: string;
}

interface DealWithPipeline extends Deal {
  pipeline?: (Pipeline & { stages?: PipelineStage[] }) | null;
}

export default function LeadPipelineSummary({
  leadId,
  leadName,
  className,
}: LeadPipelineSummaryProps) {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // State for stage movement confirmation
  const [targetMove, setTargetMove] = useState<{
    deal: DealWithPipeline;
    currentStage: PipelineStage | null;
    targetStage: PipelineStage;
  } | null>(null);

  // Fetch Deals for this lead
  const { data: deals = [], isLoading } = useQuery<DealWithPipeline[]>({
    queryKey: ["lead-deals", activeCompanyId, leadId],
    queryFn: async () => {
      if (!activeCompanyId || !leadId) return [];

      const { data, error } = await supabase
        .from("deals")
        .select(`
          *,
          pipeline:pipelines(
            id, name, company_id, color,
            stages:pipeline_stages(*)
          )
        `)
        .eq("company_id", activeCompanyId)
        .eq("lead_id", leadId)
        .neq("status", "archived")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading lead deals:", error);
        return [];
      }

      return (data || []) as unknown as DealWithPipeline[];
    },
    enabled: !!activeCompanyId && !!leadId,
    staleTime: 30000,
  });

  // Realtime subscription for deals
  useEffect(() => {
    if (!activeCompanyId || !leadId) return;

    const channel = supabase
      .channel(`lead-deals-realtime-${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deals",
          filter: `company_id=eq.${activeCompanyId}`,
        },
        (payload) => {
          const newDeal = payload.new as Deal;
          if (newDeal && newDeal.lead_id === leadId) {
            queryClient.invalidateQueries({ queryKey: ["lead-deals", activeCompanyId, leadId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCompanyId, leadId, queryClient]);

  // Move deal stage mutation with optimistic update
  const moveDealMutation = useMutation({
    mutationFn: async ({ dealId, targetStage }: { dealId: string; targetStage: PipelineStage }) => {
      const stageType = targetStage.stage_type || "open";
      const updates: Record<string, any> = {
        stage_id: targetStage.id,
        status: stageType === "won" ? "won" : stageType === "lost" ? "lost" : "open",
        updated_at: new Date().toISOString(),
      };
      if (stageType === "won") updates.won_at = new Date().toISOString();
      if (stageType === "lost") updates.lost_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("deals")
        .update(updates)
        .eq("id", dealId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ dealId, targetStage }) => {
      await queryClient.cancelQueries({ queryKey: ["lead-deals", activeCompanyId, leadId] });
      const previousDeals = queryClient.getQueryData<DealWithPipeline[]>(["lead-deals", activeCompanyId, leadId]);

      if (previousDeals) {
        queryClient.setQueryData<DealWithPipeline[]>(["lead-deals", activeCompanyId, leadId], old => {
          if (!old) return [];
          return old.map(d => {
            if (d.id === dealId) {
              const stageType = targetStage.stage_type || "open";
              return {
                ...d,
                stage_id: targetStage.id,
                status: stageType === "won" ? "won" : stageType === "lost" ? "lost" : "open",
              };
            }
            return d;
          });
        });
      }

      return { previousDeals };
    },
    onError: (err, variables, context) => {
      if (context?.previousDeals) {
        queryClient.setQueryData(["lead-deals", activeCompanyId, leadId], context.previousDeals);
      }
      toast.error(`Não foi possível mover o negócio: ${err.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-deals", activeCompanyId, leadId] });
      toast.success("Etapa do negócio atualizada!");
    },
  });

  const visibleDeals = useMemo(() => {
    if (isExpanded) return deals;
    return deals.slice(0, 2);
  }, [deals, isExpanded]);

  if (!leadId) return null;

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col gap-1.5 pt-1", className)}>
        {isLoading ? (
          <div className="h-5 w-32 bg-muted/40 animate-pulse rounded-lg" />
        ) : deals.length === 0 ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="h-6 px-2 text-[11px] font-bold text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 rounded-lg shadow-none gap-1"
            >
              <Plus className="h-3 w-3" />
              Pipeline
            </Button>
            <span className="text-[10px] text-muted-foreground italic">Nenhuma pipeline associada</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleDeals.map((deal) => {
              const stages = (deal.pipeline?.stages || []).sort((a, b) => a.order_index - b.order_index);
              const currentStage = stages.find(s => s.id === deal.stage_id) || null;
              const currentOrderIndex = currentStage?.order_index ?? 0;

              return (
                <div key={deal.id} className="flex flex-col gap-1 bg-background/40 border border-border/30 p-1.5 px-2 rounded-xl">
                  {/* Pipeline Header */}
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: deal.pipeline?.color || "#3b82f6" }} />
                      <span className="font-bold text-[11px] text-card-foreground truncate">
                        {deal.pipeline?.name || "Pipeline"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">•</span>
                      <span className="text-[11px] text-muted-foreground font-semibold truncate">
                        {currentStage?.name || "Sem etapa"}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {deal.status === "won" && (
                      <Badge className="h-4 px-1.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0 gap-0.5">
                        <Check className="h-2.5 w-2.5" /> Ganho
                      </Badge>
                    )}
                    {deal.status === "lost" && (
                      <Badge className="h-4 px-1.5 text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shrink-0 gap-0.5">
                        <XIcon className="h-2.5 w-2.5" /> Perdido
                      </Badge>
                    )}
                  </div>

                  {/* Visual Step Track (●━━━━●━━━━●────○) */}
                  {stages.length > 0 && (
                    <div className="flex items-center gap-1 py-0.5 overflow-x-auto scrollbar-none">
                      {stages.map((stage, idx) => {
                        const isPassed = stage.order_index < currentOrderIndex;
                        const isCurrent = stage.id === deal.stage_id;
                        const isFuture = stage.order_index > currentOrderIndex;

                        return (
                          <div key={stage.id} className="flex items-center">
                            {idx > 0 && (
                              <div
                                className={cn(
                                  "h-0.5 w-3 sm:w-4 transition-colors duration-300",
                                  isPassed || isCurrent ? "bg-emerald-500" : "bg-border/60"
                                )}
                              />
                            )}

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (stage.id !== deal.stage_id) {
                                      setTargetMove({ deal, currentStage, targetStage: stage });
                                    }
                                  }}
                                  className={cn(
                                    "h-3 w-3 rounded-full transition-all duration-300 shrink-0 cursor-pointer flex items-center justify-center",
                                    isCurrent && "ring-2 ring-emerald-500/40 scale-125 bg-emerald-500 shadow-sm shadow-emerald-500/50",
                                    isPassed && "bg-emerald-600 dark:bg-emerald-500 hover:scale-110",
                                    isFuture && "bg-muted-foreground/30 hover:bg-muted-foreground/60 hover:scale-110"
                                  )}
                                >
                                  {isCurrent && <span className="h-1 w-1 rounded-full bg-white animate-ping" />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="text-[10px] font-semibold py-1 px-2 z-[10000]">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color || "#3b82f6" }} />
                                  <span>{stage.name}</span>
                                  {isCurrent && <span className="text-emerald-500 font-bold">(Atual)</span>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom Actions: + Pipeline & Expansion toggle */}
            <div className="flex items-center justify-between pt-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                className="h-5 px-1.5 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-md shadow-none gap-1"
              >
                <Plus className="h-3 w-3" />
                Pipeline
              </Button>

              {deals.length > 2 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 px-1"
                >
                  {isExpanded ? (
                    <>Recolher <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>+ {deals.length - 2} pipelines <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Add Lead to Pipeline Dialog */}
        <AddLeadToPipelineDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          leadId={leadId}
          leadName={leadName}
        />

        {/* Move Stage Confirmation Popover */}
        <MoveDealConfirmPopover
          open={!!targetMove}
          onOpenChange={(open) => {
            if (!open) setTargetMove(null);
          }}
          pipelineName={targetMove?.deal.pipeline?.name || "Pipeline"}
          currentStage={targetMove?.currentStage || null}
          targetStage={targetMove?.targetStage || null}
          isSubmitting={moveDealMutation.isPending}
          onConfirm={async () => {
            if (targetMove) {
              await moveDealMutation.mutateAsync({
                dealId: targetMove.deal.id,
                targetStage: targetMove.targetStage,
              });
            }
          }}
        />
      </div>
    </TooltipProvider>
  );
}
