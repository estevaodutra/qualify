import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DispatchLog {
  id: string;
  timestamp: string;
  campaign: string;
  number: string;
  provider: string;
  recipient: string;
  status: "sent" | "pending" | "failed" | "retrying";
  errorMessage?: string;
  channel: "whatsapp" | "voice";
}

interface DbDispatchLog {
  id: string;
  created_at: string;
  campaign_id: string | null;
  instance_id: string | null;
  recipient: string;
  status: string;
  channel: string;
  error_message: string | null;
  user_id: string | null;
}

function transformDbToFrontend(dbLog: DbDispatchLog): DispatchLog {
  return {
    id: dbLog.id,
    timestamp: new Date(dbLog.created_at).toLocaleString("pt-BR"),
    campaign: dbLog.campaign_id || "Direct Message",
    number: "Instance", // Would need to join with instances table
    provider: "Provider",
    recipient: dbLog.recipient,
    status: dbLog.status as DispatchLog["status"],
    channel: dbLog.channel as DispatchLog["channel"],
    errorMessage: dbLog.error_message || undefined,
  };
}

export function useDispatchLogs() {
  const { user } = useAuth();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["dispatch-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data as DbDispatchLog[]).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  return { logs, isLoading, refetch };
}
