import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CallLog {
  id: string;
  campaignId: string | null;
  leadId: string | null;
  operatorId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  actionId: string | null;
  actionName: string | null;
  actionColor: string | null;
  notes: string | null;
  scriptPath: unknown[];
  createdAt: string;
  externalCallId: string | null;
  callStatus: string | null;
}

interface DbCallLog {
  id: string;
  campaign_id: string | null;
  lead_id: string | null;
  operator_id: string | null;
  user_id: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  action_id: string | null;
  notes: string | null;
  script_path: unknown[] | null;
  created_at: string | null;
  external_call_id: string | null;
  call_status: string | null;
  call_script_actions?: { name: string; color: string } | null;
}

const transformDbToFrontend = (db: DbCallLog): CallLog => ({
  id: db.id,
  campaignId: db.campaign_id,
  leadId: db.lead_id,
  operatorId: db.operator_id,
  startedAt: db.started_at,
  endedAt: db.ended_at,
  durationSeconds: db.duration_seconds,
  actionId: db.action_id,
  actionName: db.call_script_actions?.name || null,
  actionColor: db.call_script_actions?.color || null,
  notes: db.notes,
  scriptPath: db.script_path || [],
  createdAt: db.created_at || new Date().toISOString(),
  externalCallId: db.external_call_id,
  callStatus: db.call_status,
});

export interface CallLogStats {
  totalCalls: number;
  avgDuration: number;
  completedToday: number;
}

export function useCallLogs(campaignId: string, filters?: {
  startDate?: string;
  endDate?: string;
  actionId?: string;
}) {
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["call_logs", campaignId, filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_logs")
        .select("*, call_script_actions!call_logs_action_id_fkey(name, color)")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate);
      }
      if (filters?.actionId) {
        query = query.eq("action_id", filters.actionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as DbCallLog[]).map(transformDbToFrontend);
    },
    enabled: !!campaignId,
  });

  const { data: stats } = useQuery({
    queryKey: ["call_logs_stats", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("call_logs")
        .select("duration_seconds, created_at")
        .eq("campaign_id", campaignId);

      if (error) throw error;

      const logData = data as Array<{ duration_seconds: number | null; created_at: string | null }>;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalCalls = logData.length;
      const durations = logData.filter((l) => l.duration_seconds).map((l) => l.duration_seconds!);
      const avgDuration = durations.length > 0 
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
      const completedToday = logData.filter((l) => 
        l.created_at && new Date(l.created_at) >= today
      ).length;

      return { totalCalls, avgDuration, completedToday };
    },
    enabled: !!campaignId,
  });

  return {
    logs,
    stats: stats || { totalCalls: 0, avgDuration: 0, completedToday: 0 },
    isLoading,
    refetch,
  };
}
