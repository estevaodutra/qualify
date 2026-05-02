import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface AnalyticsFilters {
  calendarId?: string | null;
  attendantId?: string | null;
  fromDate: string; // YYYY-MM-DD
  toDate: string;
}

function params(companyId: string, f: AnalyticsFilters) {
  return {
    p_company_id: companyId,
    p_calendar_id: f.calendarId || null,
    p_attendant_id: f.attendantId || null,
    p_from_date: f.fromDate,
    p_to_date: f.toDate,
  };
}

export function useSchedulingOverview(filters: AnalyticsFilters) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["scheduling_overview", activeCompanyId, filters],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_scheduling_overview", params(activeCompanyId!, filters));
      if (error) throw error;
      return data as {
        conversion_rate: number; conversion_prev: number;
        appointments_total: number; appointments_prev: number;
        cancellations_total: number; cancellations_prev: number;
        no_shows_total: number; no_shows_prev: number;
      };
    },
  });
}

export function useSchedulingByDay(filters: AnalyticsFilters) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["scheduling_by_day", activeCompanyId, filters],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_scheduling_by_day", params(activeCompanyId!, filters));
      if (error) throw error;
      return (data as Array<{ day: string; total: number }>) || [];
    },
  });
}

export function useSchedulingHeatmap(filters: AnalyticsFilters) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["scheduling_heatmap", activeCompanyId, filters],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_scheduling_heatmap", params(activeCompanyId!, filters));
      if (error) throw error;
      return (data as Array<{ dow: number; hour: number; total: number }>) || [];
    },
  });
}

export function useSchedulingAttendantPerformance(filters: AnalyticsFilters) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["scheduling_attendant_perf", activeCompanyId, filters],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_scheduling_attendant_performance", {
        p_company_id: activeCompanyId,
        p_calendar_id: filters.calendarId || null,
        p_from_date: filters.fromDate,
        p_to_date: filters.toDate,
      });
      if (error) throw error;
      return (data as Array<{ attendant_id: string; name: string; photo_url: string | null; total: number; completed: number; no_shows: number; success_rate: number }>) || [];
    },
  });
}

export function useSchedulingSources(filters: AnalyticsFilters) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["scheduling_sources", activeCompanyId, filters],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_scheduling_sources", params(activeCompanyId!, filters));
      if (error) throw error;
      return (data as Array<{ source: string; total: number; pct: number }>) || [];
    },
  });
}

export function useSchedulingFunnel(filters: AnalyticsFilters) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["scheduling_funnel", activeCompanyId, filters],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_scheduling_funnel", params(activeCompanyId!, filters));
      if (error) throw error;
      return data as { visits: number; slot_selected: number; details_filled: number; confirmed: number };
    },
  });
}

export function useSchedulingCancelReasons(filters: AnalyticsFilters) {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["scheduling_cancel_reasons", activeCompanyId, filters],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_scheduling_cancel_reasons", params(activeCompanyId!, filters));
      if (error) throw error;
      return (data as Array<{ reason: string; total: number; pct: number }>) || [];
    },
  });
}
