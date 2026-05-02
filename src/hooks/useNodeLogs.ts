import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface NodeLog {
  id: string;
  sentAt: string;
  status: string;
  errorMessage: string | null;
  groupName: string | null;
  groupJid: string | null;
  recipientPhone: string | null;
  instanceName: string | null;
  responseTimeMs: number | null;
  externalMessageId: string | null;
  zaapId: string | null;
  payload: Record<string, unknown> | null;
  providerResponse: Record<string, unknown> | null;
  campaignId: string;
  sequenceId: string | null;
  nodeOrder: number;
  nodeType: string | null;
}

interface RawLog {
  id: string;
  sent_at: string;
  status: string | null;
  group_campaign_id: string;
  sequence_id: string | null;
  node_order: number | null;
  node_type: string | null;
  group_name: string | null;
  group_jid: string | null;
  recipient_phone: string | null;
  instance_name: string | null;
  response_time_ms: number | null;
  external_message_id: string | null;
  zaap_id: string | null;
  error_message: string | null;
  payload: Record<string, unknown> | null;
  provider_response: Record<string, unknown> | null;
}

export function useNodeLogs(
  sequenceId: string | undefined,
  nodeOrder: number | undefined,
  enabled = true,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ["node-logs", sequenceId, nodeOrder];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<NodeLog[]> => {
      if (!sequenceId || nodeOrder === undefined) return [];
      const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("group_message_logs")
        .select("*")
        .eq("sequence_id", sequenceId)
        .eq("node_order", nodeOrder)
        .gte("sent_at", cutoff)
        .order("sent_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      return ((data || []) as unknown as RawLog[]).map((l) => ({
        id: l.id,
        sentAt: l.sent_at,
        status: l.status || "sent",
        errorMessage: l.error_message,
        groupName: l.group_name,
        groupJid: l.group_jid,
        recipientPhone: l.recipient_phone,
        instanceName: l.instance_name,
        responseTimeMs: l.response_time_ms,
        externalMessageId: l.external_message_id,
        zaapId: l.zaap_id,
        payload: l.payload,
        providerResponse: l.provider_response,
        campaignId: l.group_campaign_id,
        sequenceId: l.sequence_id,
        nodeOrder: l.node_order ?? 0,
        nodeType: l.node_type,
      }));
    },
    enabled: enabled && !!user && !!sequenceId && nodeOrder !== undefined,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!user || !sequenceId || nodeOrder === undefined || !enabled) return;
    const channel = supabase
      .channel(`node-logs-${sequenceId}-${nodeOrder}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_message_logs" },
        () => {
          queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sequenceId, nodeOrder, enabled]);

  return {
    logs: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useReprocessLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      log: NodeLog;
      sequenceId: string;
      nodeOrder: number;
    }) => {
      const { log, sequenceId, nodeOrder } = params;
      const body: Record<string, unknown> = {
        campaignId: log.campaignId,
        sequenceId,
        manualNodeIndex: nodeOrder,
      };
      if (log.recipientPhone) {
        body.targetPhones = [log.recipientPhone];
      }
      const { data, error } = await supabase.functions.invoke("execute-message", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const failed = data?.nodesFailed || 0;
      if (failed > 0) toast.warning(`Reprocessado com ${failed} falha(s)`);
      else toast.success("Reprocessado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["node-logs"] });
      queryClient.invalidateQueries({ queryKey: ["sequence-logs"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao reprocessar";
      toast.error(msg);
    },
  });
}
