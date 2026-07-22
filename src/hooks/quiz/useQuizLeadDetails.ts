import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QuizSubmissionDetail } from "@/types/quiz/tracking";

export function useQuizLeadDetails(submissionId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quiz_lead_details", submissionId],
    queryFn: async () => {
      if (!submissionId) return null;

      // 1. Fetch submission details
      const { data: subData, error: subError } = await (supabase as any)
        .from("quiz_submissions")
        .select(`
          id, public_id, funnel_id, company_id, session_id, lead_id, status, current_step_id,
          steps_viewed, steps_completed, progress_percentage, first_seen_at, started_at,
          last_seen_at, completed_at, abandoned_at, total_duration_seconds,
          entry_url, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
          device_type, browser, operating_system, user_agent, score, result_data,
          leads (id, name, email, phone, tags, crm_owner_id)
        `)
        .eq("id", submissionId)
        .single();

      if (subError) throw subError;

      const submission = {
        id: subData.id,
        publicId: subData.public_id,
        funnelId: subData.funnel_id,
        companyId: subData.company_id,
        sessionId: subData.session_id,
        leadId: subData.lead_id,
        status: subData.status,
        currentStepId: subData.current_step_id,
        stepsViewed: subData.steps_viewed || 0,
        stepsCompleted: subData.steps_completed || 0,
        progressPercentage: Number(subData.progress_percentage || 0),
        firstSeenAt: subData.first_seen_at,
        startedAt: subData.started_at,
        lastSeenAt: subData.last_seen_at,
        completedAt: subData.completed_at,
        abandonedAt: subData.abandoned_at,
        totalDurationSeconds: subData.total_duration_seconds,
        entryUrl: subData.entry_url,
        referrer: subData.referrer,
        utmSource: subData.utm_source,
        utmMedium: subData.utm_medium,
        utmCampaign: subData.utm_campaign,
        utmContent: subData.utm_content,
        utmTerm: subData.utm_term,
        deviceType: subData.device_type,
        browser: subData.browser,
        operatingSystem: subData.operating_system,
        userAgent: subData.user_agent,
        score: subData.score || 0,
        resultData: subData.result_data || {},
        leadName: subData.leads?.name ?? null,
        leadEmail: subData.leads?.email ?? null,
        leadPhone: subData.leads?.phone ?? null,
        leadTags: subData.leads?.tags ?? [],
        leadOwnerId: subData.leads?.crm_owner_id ?? null
      };

      // 2. Fetch answers
      const { data: answersData, error: answersError } = await (supabase as any)
        .from("quiz_answers")
        .select(`
          id, step_id, component_id, answer_value, answered_at,
          quiz_steps (name)
        `)
        .eq("submission_id", submissionId)
        .order("answered_at", { ascending: true });

      if (answersError) throw answersError;

      const answers = (answersData as any[]).map(row => ({
        id: row.id,
        stepId: row.step_id,
        stepName: row.quiz_steps?.name || "Etapa",
        componentId: row.component_id,
        value: row.answer_value,
        answeredAt: row.answered_at
      }));

      // 3. Fetch events timeline
      const { data: eventsData, error: eventsError } = await (supabase as any)
        .from("quiz_events")
        .select(`
          id, event_name, step_id, component_id, payload, created_at,
          quiz_steps (name)
        `)
        .eq("submission_id", submissionId)
        .order("created_at", { ascending: true });

      if (eventsError) throw eventsError;

      const timeline = (eventsData as any[]).map(row => ({
        id: row.id,
        eventName: row.event_name,
        stepId: row.step_id,
        stepName: row.quiz_steps?.name || null,
        componentId: row.component_id,
        payload: row.payload || {},
        createdAt: row.created_at
      }));

      return {
        submission,
        answers,
        timeline
      };
    },
    enabled: !!submissionId && !!user,
  });
}
