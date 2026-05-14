import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface QuizSubmission {
  id: string;
  funnelId: string;
  sessionId: string;
  leadId: string | null;
  status: "started" | "completed";
  stepsCompleted: number;
  startedAt: string;
  completedAt: string | null;
  leadName: string | null;
  leadEmail: string | null;
  leadPhone: string | null;
}

export function useQuizSubmissions(funnelId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quiz_submissions", funnelId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quiz_submissions")
        .select(`
          id, funnel_id, session_id, lead_id, status, steps_completed, started_at, completed_at,
          leads (name, email, phone)
        `)
        .eq("funnel_id", funnelId)
        .order("started_at", { ascending: false });
      if (error) throw error;

      return (data as any[]).map((row) => ({
        id: row.id,
        funnelId: row.funnel_id,
        sessionId: row.session_id,
        leadId: row.lead_id,
        status: row.status,
        stepsCompleted: row.steps_completed,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        leadName: row.leads?.name ?? null,
        leadEmail: row.leads?.email ?? null,
        leadPhone: row.leads?.phone ?? null,
      })) as QuizSubmission[];
    },
    enabled: !!funnelId && !!user,
  });
}
