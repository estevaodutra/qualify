import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { useProspectingCampaigns } from "@/hooks/useProspectingCampaigns";
import { useProspectingQueue } from "@/hooks/useProspectingQueue";
import { useProspectingEnrichmentJobs } from "@/hooks/useProspectingEnrichmentJobs";
import { useProspectingEvents } from "@/hooks/useProspectingEvents";
import { useProspectingApproval } from "@/hooks/useProspectingApproval";
import { useDispatchCampaigns } from "@/hooks/useDispatchCampaigns";
import { useAllSequences } from "@/hooks/useSequences";
import { usePipelines } from "@/hooks/usePipelines";
import { useInstances } from "@/hooks/useInstances";

import { MonitoringHeader } from "@/components/prospecting-campaigns/monitoring/MonitoringHeader";
import { IndicatorTiles } from "@/components/prospecting-campaigns/monitoring/IndicatorTiles";
import { StageProgressBar } from "@/components/prospecting-campaigns/monitoring/StageProgressBar";
import { MonitoringLeadsTable, type LeadRow } from "@/components/prospecting-campaigns/monitoring/MonitoringLeadsTable";

export default function ProspectingCampaignLeads() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { campaigns, pauseProspecting, resumeProspecting, cancelPendingLeads, reprocessErrors } = useProspectingCampaigns();
  const campaign = campaigns.find((c) => c.id === id);

  const { data: leads = [], isLoading: loadingLeads } = useQuery<LeadRow[]>({
    queryKey: ["prospecting_leads", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, phone, telefone_fixo, company_name, website, custom_fields, qualification_label")
        .eq("source_campaign_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LeadRow[];
    },
    enabled: !!id,
  });

  const { items: queueItems, removeFromQueue, pauseItem, cancelItem, reprocessItem } = useProspectingQueue(id);
  const { jobsByLead } = useProspectingEnrichmentJobs(id);
  const { events, latestByLead } = useProspectingEvents(id);
  const { approve, isApproving } = useProspectingApproval();
  const { campaigns: dispatchCampaigns } = useDispatchCampaigns();
  const { sequences } = useAllSequences();
  const { pipelines } = usePipelines();
  const { instances } = useInstances();

  if (!campaign) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const sequenceName = sequences.find((s) => s.id === campaign.automationSequenceId)?.name;
  const legacyCampaignName = dispatchCampaigns.find((c) => c.id === (campaign as any).automationCampaignId)?.name;
  const automationName = sequenceName || legacyCampaignName;
  const instanceName = instances.find((i) => i.id === (campaign as any).instanceId)?.name;
  const pipelineName = pipelines.find((p) => p.id === campaign.pipelineId)?.name;

  const foundCount = events.filter((e) => e.eventType === "prospecting.lead_found").length || leads.length;
  const duplicatesCount = events.filter((e) => e.eventType === "prospecting.lead_deduplicated").length;
  const discardedCount = events.filter((e) => e.eventType === "prospecting.lead_failed").length;
  const enrichedLeadIds = new Set(Object.keys(jobsByLead).filter((leadId) => jobsByLead[leadId].some((j) => j.status === "completed")));
  const qualifiedCount = leads.filter((l) => l.qualification_label === "media" || l.qualification_label === "alta").length;

  const countByQueueStatus = (status: string) => queueItems.filter((q) => q.status === status).length;

  const handleApprove = async () => {
    const seqId = campaign.automationSequenceId || (campaign as any).automationCampaignId;
    if (!seqId) {
      toast.error("Selecione uma automação antes de aprovar.");
      return;
    }
    await approve({
      prospectingCampaignId: campaign.id,
      selectedLeadIds: leads.map((l) => l.id),
      automationSequenceId: seqId,
      automationCampaignId: (campaign as any).automationCampaignId,
      instanceId: (campaign as any).instanceId,
    });
  };

  const handleAddToQueue = async (leadId: string) => {
    const seqId = campaign.automationSequenceId || (campaign as any).automationCampaignId;
    if (!seqId) {
      toast.error("Esta campanha não tem automação configurada.");
      return;
    }
    await approve({
      prospectingCampaignId: campaign.id,
      selectedLeadIds: [leadId],
      automationSequenceId: seqId,
      automationCampaignId: (campaign as any).automationCampaignId,
      instanceId: (campaign as any).instanceId,
    });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["prospecting_campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["prospecting_queue", id] });
  };

  return (
    <div className="flex flex-col gap-6 p-8 overflow-y-auto flex-1 min-h-0 bg-background/50 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <MonitoringHeader
          campaign={campaign}
          automationName={automationName}
          instanceName={instanceName}
          pipelineName={pipelineName}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-xl">
              <Settings2 className="h-4 w-4 mr-2" /> Controles
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {campaign.status === "dispatching" && (
              <DropdownMenuItem onClick={async () => { await pauseProspecting(campaign.id); invalidateAll(); }}>
                Pausar automação
              </DropdownMenuItem>
            )}
            {campaign.status === "paused" && (
              <DropdownMenuItem onClick={async () => { await resumeProspecting(campaign.id); invalidateAll(); }}>
                Retomar automação
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={async () => { await cancelPendingLeads(campaign.id); invalidateAll(); }}>
              Cancelar leads pendentes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => { await reprocessErrors(campaign.id); invalidateAll(); }}>
              Reprocessar erros
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <StageProgressBar status={campaign.status} />

      <IndicatorTiles
        found={foundCount}
        duplicates={duplicatesCount}
        discarded={discardedCount}
        enriched={enrichedLeadIds.size}
        qualified={qualifiedCount}
        pending={countByQueueStatus("pending")}
        scheduled={countByQueueStatus("scheduled")}
        processing={countByQueueStatus("processing")}
        completed={countByQueueStatus("completed")}
        failed={countByQueueStatus("failed")}
        cancelled={countByQueueStatus("cancelled")}
      />

      {campaign.status === "awaiting_approval" && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-semibold text-sm">Esta prospecção aguarda aprovação</div>
            <p className="text-xs text-muted-foreground">
              Revise os leads capturados na tabela abaixo e aprove o envio da automação.
            </p>
          </div>
          <Button
            onClick={handleApprove}
            disabled={isApproving || leads.length === 0}
            className="rounded-xl font-bold"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {isApproving ? "Aprovando..." : `Aprovar e Enviar (${leads.length} leads)`}
          </Button>
        </div>
      )}

      <MonitoringLeadsTable
        leads={leads}
        jobsByLead={jobsByLead}
        queueItems={queueItems}
        latestEventByLead={latestByLead}
        onAddToQueue={handleAddToQueue}
        onRemoveFromQueue={async (qid) => { await removeFromQueue(qid); invalidateAll(); }}
        onReprocess={async (qid) => { await reprocessItem(qid); invalidateAll(); }}
        onPause={async (qid) => { await pauseItem(qid); invalidateAll(); }}
        onCancel={async (qid) => { await cancelItem(qid); invalidateAll(); }}
        hasAutomation={!!(campaign.automationSequenceId || (campaign as any).automationCampaignId)}
      />
    </div>
  );
}
