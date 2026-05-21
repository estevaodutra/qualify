import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface URALog {
  id: string;
  campaignId: string | null;
  leadId: string | null;
  phone: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  statusId: number | null;
  statusName: string | null;
  causeId: number | null;
  causeName: string | null;
  dtmfPressed: string | null;
  costValue: number | null;
  createdAt: string;
}

interface DbURALog {
  id: string;
  campaign_id: string | null;
  lead_id: string | null;
  phone: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  status_id: number | null;
  status_name: string | null;
  cause_id: number | null;
  cause_name: string | null;
  dtmf_pressed: string | null;
  cost_value: number | null;
  created_at: string | null;
}

const transformDbToFrontend = (db: DbURALog): URALog => ({
  id: db.id,
  campaignId: db.campaign_id,
  leadId: db.lead_id,
  phone: db.phone,
  startedAt: db.started_at,
  endedAt: db.ended_at,
  durationSeconds: db.duration_seconds,
  statusId: db.status_id,
  statusName: db.status_name,
  causeId: db.cause_id,
  causeName: db.cause_name,
  dtmfPressed: db.dtmf_pressed,
  costValue: db.cost_value,
  createdAt: db.created_at || new Date().toISOString(),
});

export function useURALogs(campaignId: string) {
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["ura_logs", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ura_logs")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as DbURALog[]).map(transformDbToFrontend);
    },
    enabled: !!campaignId,
  });

  const { data: stats } = useQuery({
    queryKey: ["ura_logs_stats", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ura_logs")
        .select("duration_seconds, cause_name, dtmf_pressed, cost_value")
        .eq("campaign_id", campaignId);

      if (error) throw error;

      const logData = data as Array<{
        duration_seconds: number | null;
        cause_name: string | null;
        dtmf_pressed: string | null;
        cost_value: number | null;
      }>;

      const totalCalls = logData.length;
      const durations = logData.filter((l) => l.duration_seconds).map((l) => l.duration_seconds!);
      const avgDuration = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

      const totalCost = logData.reduce((acc, curr) => acc + Number(curr.cost_value || 0), 0);

      // Cause distribution
      const causeDistribution: Record<string, number> = {};
      // DTMF distribution
      const dtmfDistribution: Record<string, number> = {};

      logData.forEach((log) => {
        const cause = log.cause_name || "Sem causa";
        causeDistribution[cause] = (causeDistribution[cause] || 0) + 1;

        const key = log.dtmf_pressed ? `Tecla ${log.dtmf_pressed}` : "Sem Resposta (DTMF)";
        dtmfDistribution[key] = (dtmfDistribution[key] || 0) + 1;
      });

      return {
        totalCalls,
        avgDuration,
        totalCost,
        causeDistribution,
        dtmfDistribution,
      };
    },
    enabled: !!campaignId,
  });

  return {
    logs,
    stats: stats || {
      totalCalls: 0,
      avgDuration: 0,
      totalCost: 0,
      causeDistribution: {},
      dtmfDistribution: {},
    },
    isLoading,
    refetch,
  };
}
