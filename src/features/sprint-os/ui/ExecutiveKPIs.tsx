/**
 * Cockpit Executivo de KPIs (Camada A / Seção 12).
 * Exibe no topo da dashboard:
 * - 3 Medidas distintas de progresso (Tarefas, Esforço, Marcos)
 * - Prazos e Dias Úteis (Original vs Nova Previsão)
 * - Horas Operacionais (Planejadas, Realizadas, Restantes)
 * - Risco Operacional (P0 Abertas, Bloqueios)
 * - Rentabilidade da Empreitada (Custo Final e Margem Bruta Projetada)
 */

import React from "react";
import {
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Flag,
  Activity,
  Layers,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useSprintOSStore } from "../state/sprintOsStore";
import {
  computeProgressMetrics,
  computeSprintFinancials,
} from "../metrics/calculations";
import { fmtDateTime, fmtMinutes } from "../scheduler/time";
import { currentForecast } from "../scheduler/planning";
import { sprintTasks } from "../domain/ops";

export const ExecutiveKPIs: React.FC = () => {
  const { workspace, activeSprintId } = useSprintOSStore();

  if (!workspace || !activeSprintId) return null;

  const sprint = workspace.sprints[activeSprintId];
  if (!sprint) return null;

  const progress = computeProgressMetrics(workspace, activeSprintId);
  const financials = computeSprintFinancials(workspace, activeSprintId);
  const tasks = sprintTasks(workspace, activeSprintId);
  const forecastEnd = currentForecast(tasks);
  const originalEnd = sprint.baseline?.contractEnd || null;

  const isOverdue = !!(originalEnd && forecastEnd && forecastEnd > originalEnd);

  return (
    <section className="px-6 pt-6 pb-2">
      {/* Grid Principal de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
        {/* KPI 1: 3 Medidas de Progresso (Seção 12) */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-white/50 font-bold flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Progresso Operacional
            </span>
            <span className="text-xs font-black text-primary">
              {progress.taskProgressPct}%
            </span>
          </div>

          <div className="space-y-2.5">
            {/* 1. Tarefas */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-white/70">Por Tarefas ({progress.tasksDone}/{progress.tasksTotal})</span>
                <span className="font-bold text-white">{progress.taskProgressPct}%</span>
              </div>
              <Progress value={progress.taskProgressPct} className="h-1.5 bg-white/10" />
            </div>

            {/* 2. Esforço */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-white/70">Por Esforço ({fmtMinutes(progress.effortDoneMinutes)}/{fmtMinutes(progress.effortTotalMinutes)})</span>
                <span className="font-bold text-indigo-400">{progress.effortProgressPct}%</span>
              </div>
              <Progress value={progress.effortProgressPct} className="h-1.5 bg-white/10 [&>div]:bg-indigo-500" />
            </div>

            {/* 3. Marcos */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-white/70">Por Marcos ({progress.milestonesDone}/{progress.milestonesTotal})</span>
                <span className="font-bold text-emerald-400">{progress.milestoneProgressPct}%</span>
              </div>
              <Progress value={progress.milestoneProgressPct} className="h-1.5 bg-white/10 [&>div]:bg-emerald-500" />
            </div>
          </div>
        </div>

        {/* KPI 2: Prazo & Dias Úteis */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider text-white/50 font-bold flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              Prazo Contratual
            </span>
            {isOverdue && (
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Risco de Atraso
              </span>
            )}
          </div>

          <div className="space-y-1 my-auto">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-white/60">Original:</span>
              <span className="text-xs font-semibold text-white/90">
                {originalEnd ? fmtDateTime(originalEnd) : "Não ativada"}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-xs text-white/60">Nova Previsão:</span>
              <span className={`text-sm font-black ${isOverdue ? "text-rose-400" : "text-emerald-400"}`}>
                {forecastEnd ? fmtDateTime(forecastEnd) : "A calcular"}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/50">Dias Úteis:</span>
            <span className="font-bold text-white">
              Dia {progress.currentWorkDayIndex} de {progress.businessDaysTotal} ({progress.businessDaysRemaining} restantes)
            </span>
          </div>
        </div>

        {/* KPI 3: Horas & Alocação */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider text-white/50 font-bold flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              Balanço de Horas
            </span>
            <span className="text-xs text-white/40 font-mono">
              {progress.activeMembersCount} membro(s)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 my-auto text-center py-1">
            <div className="p-2 rounded-xl bg-white/5">
              <div className="text-[10px] text-white/50 uppercase font-semibold">Planejadas</div>
              <div className="text-sm font-black text-white">{fmtMinutes(progress.effortTotalMinutes)}</div>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <div className="text-[10px] text-white/50 uppercase font-semibold">Realizadas</div>
              <div className="text-sm font-black text-amber-400">{fmtMinutes(progress.effortLoggedMinutes)}</div>
            </div>
            <div className="p-2 rounded-xl bg-white/5">
              <div className="text-[10px] text-white/50 uppercase font-semibold">Restantes</div>
              <div className="text-sm font-black text-indigo-400">{fmtMinutes(progress.effortRemainingMinutes)}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-white/50">Tarefas em Execução:</span>
            <span className="font-bold text-amber-400">{progress.tasksDoing} ativas</span>
          </div>
        </div>

        {/* KPI 4: Rentabilidade da Empreitada (Seção 33) */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 backdrop-blur-md flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider text-white/50 font-bold flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              Rentabilidade Prevista
            </span>
            <span className="text-xs font-black text-emerald-400">
              {financials.projectedGrossMarginPct}% Margem
            </span>
          </div>

          <div className="space-y-1 my-auto">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-white/60">Contratado:</span>
              <span className="text-sm font-bold text-white">
                R$ {financials.contractValue.toLocaleString("pt-BR")}
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-white/60">Custo Projetado:</span>
              <span className="text-xs font-semibold text-rose-300">
                R$ {financials.projectedFinalCost.toLocaleString("pt-BR")}
              </span>
            </div>

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-white/60">Resultado Bruto:</span>
              <span className="text-xs font-bold text-emerald-400">
                R$ {financials.projectedGrossProfit.toLocaleString("pt-BR")}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
            <span className="text-white/50">P0 Abertas / Bloqueios:</span>
            <span className="font-bold flex items-center gap-1.5">
              <span className={progress.tasksP0Open > 0 ? "text-rose-400 font-black" : "text-white/60"}>
                {progress.tasksP0Open} P0
              </span>
              <span className="text-white/20">·</span>
              <span className={progress.blockedTasksCount > 0 ? "text-amber-400 font-black" : "text-white/60"}>
                {progress.blockedTasksCount} travada(s)
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
