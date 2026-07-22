import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { QuizFunnel } from "@/hooks/useQuizFunnels";
import { QuizStep } from "@/hooks/useQuizSteps";
import { QuizComponent } from "@/hooks/useQuizComponents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MousePointerClick, Users, CheckSquare, TrendingUp, Clock, Hourglass } from "lucide-react";

interface Props {
  funnel: QuizFunnel;
  steps: QuizStep[];
  components: QuizComponent[];
}

export function QuizPerformanceTab({ funnel, steps, components }: Props) {
  const { user } = useAuth();

  // Load analytics counts from DB
  const { data: stats, isLoading } = useQuery({
    queryKey: ["quiz_performance_stats", funnel.id],
    queryFn: async () => {
      // 1. Fetch submission counts by status
      const { data: subsData, error: subsError } = await supabase
        .from("quiz_submissions")
        .select("status, id, total_duration_seconds")
        .eq("funnel_id", funnel.id);

      if (subsError) throw subsError;

      const totalVisits = funnel.visitsCount || subsData.length || 1;
      const startedSubs = subsData.filter(s => s.status !== "anonymous");
      const identifiedSubs = subsData.filter(s => ["identified", "completed"].includes(s.status));
      const completedSubs = subsData.filter(s => s.status === "completed");
      const abandonedSubs = subsData.filter(s => s.status === "abandoned" || s.status === "anonymous"); // Approximate dropoff

      // 2. Fetch step view counts based on step_viewed events
      const { data: viewsData, error: viewsError } = await supabase
        .from("quiz_events")
        .select("step_id, submission_id")
        .eq("funnel_id", funnel.id)
        .eq("event_name", "step_viewed");

      if (viewsError) throw viewsError;

      const viewsMap: Record<string, Set<string>> = {};
      for (const row of viewsData) {
        if (!row.step_id) continue;
        if (!viewsMap[row.step_id]) viewsMap[row.step_id] = new Set();
        viewsMap[row.step_id].add(row.submission_id);
      }

      // 3. Fetch step session durations and exits
      const { data: stepSessions, error: sessionsError } = await supabase
        .from("quiz_step_sessions")
        .select("step_id, duration_seconds, exit_type")
        .eq("funnel_id", funnel.id);

      if (sessionsError) throw sessionsError;

      const durationMap: Record<string, { sum: number; count: number }> = {};
      const abandonMap: Record<string, number> = {};

      for (const sess of stepSessions) {
        if (!sess.step_id) continue;
        
        // Sum durations
        if (sess.duration_seconds !== null) {
          if (!durationMap[sess.step_id]) durationMap[sess.step_id] = { sum: 0, count: 0 };
          durationMap[sess.step_id].sum += sess.duration_seconds;
          durationMap[sess.step_id].count += 1;
        }

        // Count abandons
        if (sess.exit_type === "abandon") {
          abandonMap[sess.step_id] = (abandonMap[sess.step_id] || 0) + 1;
        }
      }

      return {
        totalVisits,
        startedCount: startedSubs.length,
        identifiedCount: identifiedSubs.length,
        completedCount: completedSubs.length,
        abandonedCount: abandonedSubs.length,
        viewsMap: Object.fromEntries(
          Object.entries(viewsMap).map(([k, v]) => [k, v.size])
        ),
        durationMap,
        abandonMap
      };
    },
    enabled: !!funnel.id && !!user
  });

  if (isLoading || !stats) {
    return <div className="py-8 text-center text-sm text-slate-500">Carregando dados de performance...</div>;
  }

  // Formula calculations
  const startRate = stats.totalVisits > 0 ? Math.round((stats.startedCount / stats.totalVisits) * 100) : 0;
  const leadRate = stats.startedCount > 0 ? Math.round((stats.identifiedCount / stats.startedCount) * 100) : 0;
  const completionRate = stats.startedCount > 0 ? Math.round((stats.completedCount / stats.startedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Cards summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={<MousePointerClick className="w-5 h-5" />} value={stats.totalVisits} label="Visitas Totais" color="text-indigo-600 bg-indigo-50 border-indigo-100" />
        <SummaryCard icon={<Users className="w-5 h-5" />} value={`${startRate}%`} label="Taxa de Início" color="text-blue-600 bg-blue-50 border-blue-100" />
        <SummaryCard icon={<CheckSquare className="w-5 h-5" />} value={`${leadRate}%`} label="Taxa de Lead" color="text-amber-600 bg-amber-50 border-amber-100" />
        <SummaryCard icon={<TrendingUp className="w-5 h-5" />} value={`${completionRate}%`} label="Conclusão Geral" color="text-emerald-600 bg-emerald-50 border-emerald-100" />
      </div>

      {/* Conversion funnel stages */}
      <Card className="bg-white border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wider">Etapas de Conversão do Funil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Visitas -> Iniciados</span>
              <span>{stats.startedCount} de {stats.totalVisits} ({startRate}%)</span>
            </div>
            <Progress value={startRate} className="h-2" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Iniciados -> Leads Identificados</span>
              <span>{stats.identifiedCount} de {stats.startedCount} ({leadRate}%)</span>
            </div>
            <Progress value={leadRate} className="h-2 bg-slate-100 [&>div]:bg-amber-500" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Iniciados -> Conclusões</span>
              <span>{stats.completedCount} de {stats.startedCount} ({completionRate}%)</span>
            </div>
            <Progress value={completionRate} className="h-2 bg-slate-100 [&>div]:bg-emerald-500" />
          </div>
        </CardContent>
      </Card>

      {/* Step by step dropoff */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Passagem e Abandono por Etapa</h3>
        {steps.map((step, idx) => {
          const stepViews = stats.viewsMap[step.id] || 0;
          const nextStep = steps[idx + 1];
          const nextViews = nextStep ? (stats.viewsMap[nextStep.id] || 0) : stats.completedCount;
          
          // Passage rate: views of next step / views of current step
          const passRate = stepViews > 0 ? Math.round((nextViews / stepViews) * 100) : 0;
          
          // Abandons in this step
          const abandons = stats.abandonMap[step.id] || 0;
          const abandonRate = stepViews > 0 ? Math.round((abandons / stepViews) * 100) : 0;

          // Time spent in this step
          const timeData = stats.durationMap[step.id];
          const avgTime = timeData && timeData.count > 0 ? Math.round(timeData.sum / timeData.count) : 0;

          return (
            <Card key={step.id} className="bg-white border-slate-100 shadow-sm">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-bold text-slate-800">{step.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Ordem: {idx + 1}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Visualizações</span>
                    <span className="text-sm font-bold text-slate-700">{stepViews}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Passagem</span>
                    <span className="text-sm font-bold text-indigo-600">{passRate}%</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Abandono</span>
                    <span className="text-sm font-bold text-rose-500">{abandonRate}% ({abandons})</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tempo Médio</span>
                    <span className="text-sm font-bold text-slate-700">{avgTime}s</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <Card className={`bg-white border shadow-sm`}>
      <CardContent className="p-4 flex items-center gap-3.5">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-slate-800">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
