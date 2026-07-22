import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QuizSubmissionDetail } from "@/types/quiz/tracking";

interface FetchLeadsParams {
  funnelId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dateRange?: { from?: Date; to?: Date };
  utmSource?: string;
  utmCampaign?: string;
  deviceType?: string;
}

export function useQuizLeads({
  funnelId,
  page = 1,
  pageSize = 20,
  search = "",
  status = "all",
  dateRange,
  utmSource,
  utmCampaign,
  deviceType
}: FetchLeadsParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["quiz_leads_paginated", funnelId, page, pageSize, search, status, dateRange, utmSource, utmCampaign, deviceType],
    queryFn: async () => {
      let query = (supabase as any)
        .from("quiz_submissions")
        .select(`
          id, public_id, funnel_id, company_id, session_id, lead_id, status, current_step_id,
          steps_viewed, steps_completed, progress_percentage, first_seen_at, started_at,
          last_seen_at, completed_at, abandoned_at, total_duration_seconds,
          entry_url, referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
          device_type, browser, operating_system, user_agent, score, result_data,
          leads (id, name, email, phone)
        `, { count: "exact" })
        .eq("funnel_id", funnelId);

      // Status filtering
      if (status !== "all") {
        query = query.eq("status", status);
      }

      // Date range filtering
      if (dateRange?.from) {
        query = query.gte("first_seen_at", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte("first_seen_at", dateRange.to.toISOString());
      }

      // UTM / metadata filtering
      if (utmSource) {
        query = query.eq("utm_source", utmSource);
      }
      if (utmCampaign) {
        query = query.eq("utm_campaign", utmCampaign);
      }
      if (deviceType && deviceType !== "all") {
        query = query.eq("device_type", deviceType);
      }

      // Search query (combining ILIKE searches on lead name/email/phone/public_id)
      if (search.trim()) {
        const cleanSearch = search.trim();
        if (cleanSearch.startsWith("QZ-")) {
          query = query.ilike("public_id", `%${cleanSearch}%`);
        } else {
          // If searching name, email or phone, we filter by joining leads or raw info
          // Supabase supports filtering joined tables
          query = query.or(`public_id.ilike.%${cleanSearch}%,utm_source.ilike.%${cleanSearch}%,utm_campaign.ilike.%${cleanSearch}%`);
          // Note: Full search will filter leads dynamically inside client mapping or via joins
        }
      }

      // Order by started/first seen at descending
      query = query.order("first_seen_at", { ascending: false });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      // Map response to typings
      let leads = (data as any[]).map((row) => ({
        id: row.id,
        publicId: row.public_id,
        funnelId: row.funnel_id,
        companyId: row.company_id,
        sessionId: row.session_id,
        leadId: row.lead_id,
        status: row.status,
        currentStepId: row.current_step_id,
        stepsViewed: row.steps_viewed || 0,
        stepsCompleted: row.steps_completed || 0,
        progressPercentage: Number(row.progress_percentage || 0),
        firstSeenAt: row.first_seen_at,
        startedAt: row.started_at,
        lastSeenAt: row.last_seen_at,
        completedAt: row.completed_at,
        abandonedAt: row.abandoned_at,
        totalDurationSeconds: row.total_duration_seconds,
        entryUrl: row.entry_url,
        referrer: row.referrer,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
        utmContent: row.utm_content,
        utmTerm: row.utm_term,
        deviceType: row.device_type,
        browser: row.browser,
        operatingSystem: row.operating_system,
        userAgent: row.user_agent,
        score: row.score || 0,
        resultData: row.result_data || {},
        leadName: row.leads?.name ?? null,
        leadEmail: row.leads?.email ?? null,
        leadPhone: row.leads?.phone ?? null,
      })) as QuizSubmissionDetail[];

      // Client-side search for lead name/phone if search string is present and not public_id
      if (search.trim() && !search.trim().startsWith("QZ-")) {
        const needle = search.toLowerCase();
        leads = leads.filter(l => 
          (l.leadName?.toLowerCase().includes(needle)) || 
          (l.leadEmail?.toLowerCase().includes(needle)) || 
          (l.leadPhone?.includes(needle))
        );
      }

      return {
        leads,
        totalCount: count || 0
      };
    },
    enabled: !!funnelId && !!user,
  });
}
