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
