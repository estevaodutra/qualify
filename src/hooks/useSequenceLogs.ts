import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface SequenceLog {
  id: string;
  sentAt: string;
  campaignName: string | null;
  groupName: string | null;
  groupJid: string | null;
  nodeType: string | null;
  nodeOrder: number;
  status: string;
  errorMessage: string | null;
  instanceName: string | null;
  responseTimeMs: number | null;
  sequenceId: string | null;
  groupCampaignId: string;
  payload: Record<string, unknown> | null;
}

// Type for raw database record with new columns
interface RawLogRecord {
  id: string;
  sent_at: string;
  status: string | null;
  group_campaign_id: string;
  user_id: string;
  message_id: string | null;
  recipient_phone: string | null;
  // New columns added via migration
  campaign_name?: string | null;
  group_name?: string | null;
  group_jid?: string | null;
  node_type?: string | null;
  node_order?: number | null;
  error_message?: string | null;
  instance_name?: string | null;
  response_time_ms?: number | null;
  sequence_id?: string | null;
  payload?: Record<string, unknown> | null;
  instance_id?: string | null;
}

export function useSequenceLogs(campaignId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sequence-logs", campaignId],
    queryFn: async () => {
      // 72-hour retention filter
      const cutoffDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      
      let queryBuilder = supabase
        .from("group_message_logs")
        .select("*")
        .gte("sent_at", cutoffDate)
        .order("sent_at", { ascending: false })
        .limit(1000);

      if (campaignId) {
        queryBuilder = queryBuilder.eq("group_campaign_id", campaignId);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      return ((data || []) as unknown as RawLogRecord[]).map((log): SequenceLog => ({
        id: log.id,
        sentAt: log.sent_at,
        campaignName: log.campaign_name || null,
        groupName: log.group_name || null,
        groupJid: log.group_jid || null,
        nodeType: log.node_type || null,
        nodeOrder: log.node_order || 0,
        status: log.status || "sent",
        errorMessage: log.error_message || null,
        instanceName: log.instance_name || null,
        responseTimeMs: log.response_time_ms || null,
        sequenceId: log.sequence_id || null,
        groupCampaignId: log.group_campaign_id,
        payload: log.payload || null,
      }));
    },
    enabled: !!user,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("sequence-logs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_message_logs" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sequence-logs"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    logs: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
