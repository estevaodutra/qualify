import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type EnrichmentLayerType = "google_maps" | "website" | "instagram" | "cnpj" | "corporate_structure";
export type EnrichmentJobStatus = "pending" | "processing" | "completed" | "not_found" | "failed" | "skipped";

export interface ProspectingEnrichmentJob {
  id: string;
  leadId: string;
  layerType: EnrichmentLayerType;
  status: EnrichmentJobStatus;
  resultData: Record<string, unknown>;
  lastError: string | null;
  completedAt: string | null;
}

const mapJob = (row: any): ProspectingEnrichmentJob => ({
  id: row.id,
  leadId: row.lead_id,
  layerType: row.layer_type,
  status: row.status,
  resultData: row.result_data || {},
  lastError: row.last_error,
  completedAt: row.completed_at,
});

// Fetches every enrichment job for a campaign and groups it by lead so the
// monitoring table's "camadas concluídas" column is a single lookup.
export function useProspectingEnrichmentJobs(campaignId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["prospecting_enrichment_jobs", campaignId],
    queryFn: async () => {
      if (!campaignId) return {} as Record<string, ProspectingEnrichmentJob[]>;
      const { data, error } = await supabase
        .from("prospecting_enrichment_jobs" as any)
        .select("*")
        .eq("prospecting_campaign_id", campaignId);
      if (error) throw error;

      const grouped: Record<string, ProspectingEnrichmentJob[]> = {};
      for (const row of (data || []) as any[]) {
        const job = mapJob(row);
        if (!grouped[job.leadId]) grouped[job.leadId] = [];
        grouped[job.leadId].push(job);
      }
      return grouped;
    },
    enabled: !!user && !!campaignId,
  });

  useEffect(() => {
    if (!user || !campaignId) return;
    const channel = supabase
      .channel(`prospecting-enrichment-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prospecting_enrichment_jobs", filter: `prospecting_campaign_id=eq.${campaignId}` },
        () => queryClient.invalidateQueries({ queryKey: ["prospecting_enrichment_jobs", campaignId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, campaignId, queryClient]);

  return {
    jobsByLead: query.data || {},
    isLoading: query.isLoading,
  };
}
