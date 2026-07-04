import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProspectingEvent {
  id: string;
  leadId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

const mapEvent = (row: any): ProspectingEvent => ({
  id: row.id,
  leadId: row.lead_id,
  eventType: row.event_type,
  payload: row.payload || {},
  createdAt: row.created_at,
});

// Timeline of lifecycle events for a campaign -- feeds the monitoring
// table's "última ação" column and could back a future activity feed.
export function useProspectingEvents(campaignId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["prospecting_events", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("prospecting_events" as any)
        .select("*")
        .eq("prospecting_campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data || []) as any[]).map(mapEvent);
    },
    enabled: !!user && !!campaignId,
  });

  useEffect(() => {
    if (!user || !campaignId) return;
    const channel = supabase
      .channel(`prospecting-events-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "prospecting_events", filter: `prospecting_campaign_id=eq.${campaignId}` },
        () => queryClient.invalidateQueries({ queryKey: ["prospecting_events", campaignId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, campaignId, queryClient]);

  const latestByLead = (leadId: string): ProspectingEvent | undefined =>
    (query.data || []).find((e) => e.leadId === leadId);

  return {
    events: query.data || [],
    isLoading: query.isLoading,
    latestByLead,
  };
}
