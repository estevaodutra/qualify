import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ApiLog {
  id: string;
  timestamp: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  apiKeyName: string;
  requestBody?: object;
  responseBody?: object;
  errorMessage?: string;
}

interface DbApiLog {
  id: string;
  created_at: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms: number | null;
  ip_address: string | null;
  api_key_id: string | null;
  request_body: object | null;
  response_body: object | null;
  error_message: string | null;
  user_id: string | null;
}

function transformDbToFrontend(dbLog: DbApiLog): ApiLog {
  return {
    id: dbLog.id,
    timestamp: new Date(dbLog.created_at).toLocaleString("pt-BR"),
    method: dbLog.method as ApiLog["method"],
    endpoint: dbLog.endpoint,
    statusCode: dbLog.status_code,
    responseTime: dbLog.response_time_ms || 0,
    ipAddress: dbLog.ip_address || "Unknown",
    apiKeyName: "API Key", // Would need to join with api_keys table for actual name
    requestBody: dbLog.request_body || undefined,
    responseBody: dbLog.response_body || undefined,
    errorMessage: dbLog.error_message || undefined,
  };
}

export function useApiLogs() {
  const { user } = useAuth();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["api-logs"],
    queryFn: async () => {
      // 72-hour retention filter
      const cutoffDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("api_logs")
        .select("*")
        .gte("created_at", cutoffDate)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      return (data as DbApiLog[]).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  return { logs, isLoading, refetch };
}

export function useCompanyApiLogs(companyId: string | undefined) {
  const { user } = useAuth();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["api-logs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      // Get all user ids belonging to the company
      const { data: members, error: membersError } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("company_id", companyId);

      if (membersError) throw membersError;
      const userIds = (members || []).map(m => m.user_id);
      if (userIds.length === 0) return [];

      // 72-hour retention filter
      const cutoffDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("api_logs")
        .select("*")
        .in("user_id", userIds)
        .gte("created_at", cutoffDate)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      return (data as DbApiLog[]).map(transformDbToFrontend);
    },
    enabled: !!user && !!companyId,
  });

  return { logs, isLoading, refetch };
}
