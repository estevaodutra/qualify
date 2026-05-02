import { useState } from "react";
import AnalyticsFilters, { FilterState, applyPreset } from "@/components/scheduling/analytics/AnalyticsFilters";
import OverviewCards from "@/components/scheduling/analytics/OverviewCards";
import AppointmentsByDayChart from "@/components/scheduling/analytics/AppointmentsByDayChart";
import HourHeatmap from "@/components/scheduling/analytics/HourHeatmap";
import AttendantPerformanceTable from "@/components/scheduling/analytics/AttendantPerformanceTable";
import SourcesChart from "@/components/scheduling/analytics/SourcesChart";
import ConversionFunnel from "@/components/scheduling/analytics/ConversionFunnel";
import CancelReasonsChart from "@/components/scheduling/analytics/CancelReasonsChart";
import {
  useSchedulingOverview, useSchedulingByDay, useSchedulingHeatmap,
  useSchedulingAttendantPerformance, useSchedulingSources, useSchedulingFunnel, useSchedulingCancelReasons,
} from "@/hooks/useSchedulingAnalytics";

function initial(): FilterState {
  return applyPreset("this_month", { preset: "this_month", from: "", to: "", calendarId: "all", attendantId: "all" });
}

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<FilterState>(initial);

  const af = {
    calendarId: filters.calendarId === "all" ? null : filters.calendarId,
    attendantId: filters.attendantId === "all" ? null : filters.attendantId,
    fromDate: filters.from,
    toDate: filters.to,
  };

  const overview = useSchedulingOverview(af);
  const byDay = useSchedulingByDay(af);
  const heatmap = useSchedulingHeatmap(af);
  const perf = useSchedulingAttendantPerformance(af);
  const sources = useSchedulingSources(af);
  const funnel = useSchedulingFunnel(af);
  const reasons = useSchedulingCancelReasons(af);

  return (
    <div className="space-y-6">
      <AnalyticsFilters value={filters} onChange={setFilters} />
      <OverviewCards data={overview.data} loading={overview.isLoading} />
      <AppointmentsByDayChart data={byDay.data || []} />
      <div className="grid lg:grid-cols-2 gap-4">
        <HourHeatmap data={heatmap.data || []} />
        <ConversionFunnel data={funnel.data} />
      </div>
      <AttendantPerformanceTable data={perf.data || []} />
      <div className="grid lg:grid-cols-2 gap-4">
        <SourcesChart data={sources.data || []} />
        <CancelReasonsChart data={reasons.data || []} />
      </div>
    </div>
  );
}
