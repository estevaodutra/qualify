import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type QueueItemStatus =
  | "pending" | "scheduled" | "processing" | "paused"
  | "completed" | "failed" | "cancelled" | "skipped" | "replied";

export interface ProspectingQueueItem {
  id: string;
  prospectingCampaignId: string;
  leadId: string;
  leadName: string | null;
  leadPhone: string | null;
  automationCampaignId: string;
  automationSequenceId: string;
  instanceId: string | null;
  status: QueueItemStatus;
  priority: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  repliedAt: string | null;
  createdAt: string;
}

const mapQueueItem = (row: any): ProspectingQueueItem => ({
  id: row.id,
  prospectingCampaignId: row.prospecting_campaign_id,
  leadId: row.lead_id,
  leadName: row.leads?.name ?? null,
  leadPhone: row.leads?.phone ?? null,
  automationCampaignId: row.automation_campaign_id,
  automationSequenceId: row.automation_sequence_id,
  instanceId: row.instance_id,
  status: row.status,
  priority: row.priority,
  scheduledAt: row.scheduled_at,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  attempts: row.attempts,
  maxAttempts: row.max_attempts,
  lastError: row.last_error,
  repliedAt: row.replied_at,
  createdAt: row.created_at,
});

export function useProspectingQueue(campaignId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["prospecting_queue", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("prospecting_queue" as any)
        .select("*, leads(name, phone)")
        .eq("prospecting_campaign_id", campaignId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data || []) as any[]).map(mapQueueItem);
    },
    enabled: !!user && !!campaignId,
  });

  useEffect(() => {
    if (!user || !campaignId) return;
    const channel = supabase
      .channel(`prospecting-queue-${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prospecting_queue", filter: `prospecting_campaign_id=eq.${campaignId}` },
        () => queryClient.invalidateQueries({ queryKey: ["prospecting_queue", campaignId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, campaignId, queryClient]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["prospecting_queue", campaignId] });

  const removeFromQueue = useMutation({
    mutationFn: async (queueItemId: string) => {
      const { error } = await supabase.from("prospecting_queue" as any).delete().eq("id", queueItemId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Lead removido da fila"); },
    onError: (error: Error) => toast.error("Erro", { description: error.message }),
  });

  const pauseItem = useMutation({
    mutationFn: async (queueItemId: string) => {
      const { error } = await supabase.from("prospecting_queue" as any).update({ status: "paused" }).eq("id", queueItemId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Item pausado"); },
    onError: (error: Error) => toast.error("Erro", { description: error.message }),
  });

  const cancelItem = useMutation({
    mutationFn: async (queueItemId: string) => {
      const { error } = await supabase.from("prospecting_queue" as any).update({ status: "cancelled" }).eq("id", queueItemId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Item cancelado"); },
    onError: (error: Error) => toast.error("Erro", { description: error.message }),
  });

  const reprocessItem = useMutation({
    mutationFn: async (queueItemId: string) => {
      const { error } = await supabase
        .from("prospecting_queue" as any)
        .update({ status: "pending", attempts: 0, scheduled_at: new Date().toISOString(), last_error: null })
        .eq("id", queueItemId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success("Item reprocessado"); },
    onError: (error: Error) => toast.error("Erro", { description: error.message }),
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    removeFromQueue: removeFromQueue.mutateAsync,
    pauseItem: pauseItem.mutateAsync,
    cancelItem: cancelItem.mutateAsync,
    reprocessItem: reprocessItem.mutateAsync,
  };
}
