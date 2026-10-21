/**
 * Visão Gantt e Cronograma do Sprint OS (Camada A / Seção 11 e 23).
 * - Exibe a linha do tempo das atividades com início e término planejados
 * - Destaca dependências e tarefas no Caminho Crítico
 * - Sinaliza tarefas "impossíveis de agendar" (sem duração ou sem responsável)
 * - Permite reagendamento manual direto
 */

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  ArrowRight,
  User,
  AlertTriangle,
  Lock,
  Pin,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { sprintTasks } from "../../domain/ops";
import { runSchedule } from "../../scheduler/planning";
import { nowInSaoPaulo, fmtDateTime, fmtMinutes, dateOf } from "../../scheduler/time";
import { PRIORITY_LABEL, IMPACT_FLAG_CONFIG } from "../../domain/types";

export const GanttView: React.FC = () => {
  const {
    workspace,
    activeSprintId,
    searchQuery,
    filterAssigneeId,
    filterPriority,
    filterStatus,
    filterImpact,
    rescheduleTaskAction,
    setSelectedTaskId,
    setIsTaskModalOpen,
    openDeadlineUpdatePreview,
  } = useSprintOSStore();

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newDateInput, setNewDateInput] = useState("");

  if (!workspace || !activeSprintId) return null;

  const sprint = workspace.sprints[activeSprintId];
  const now = nowInSaoPaulo();
  const tasks = sprintTasks(workspace, activeSprintId);

  let displayedTasks = tasks;
  if (searchQuery) displayedTasks = displayedTasks.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  if (filterAssigneeId) displayedTasks = displayedTasks.filter((t) => t.assigneeId === filterAssigneeId);
  if (filterPriority) displayedTasks = displayedTasks.filter((t) => t.priority === filterPriority);
  if (filterStatus) displayedTasks = displayedTasks.filter((t) => t.status === filterStatus);
  if (filterImpact) displayedTasks = displayedTasks.filter((t) => t.impactFlags?.includes(filterImpact));

  // Executa o motor em modo leitura para obter caminho crítico e tarefas não agendadas
  const scheduleResult = runSchedule(workspace, activeSprintId, now);
  const criticalSet = new Set(scheduleResult.criticalPath);
  const unschedulableMap = new Map(scheduleResult.unschedulable.map((u) => [u.taskId, u.reason]));

  const handleStartReschedule = (taskId: string, currentStart: string | null) => {
    setEditingTaskId(taskId);
    setNewDateInput(currentStart ? currentStart.slice(0, 16) : `${dateOf(now)}T09:00`);
  };

  const handleConfirmReschedule = (taskId: string) => {
    if (newDateInput) {
      rescheduleTaskAction(taskId, newDateInput, true);
    }
    setEditingTaskId(null);
  };

  return (
    <div className="space-y-4">
      {/* Barra Informativa do Motor */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-indigo-400" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Planejamento Temporal & Motor de Dependências
            </h4>
            <span className="text-[11px] text-white/50">
              Previsão final calculada: <strong className="text-emerald-400">{scheduleResult.forecastEnd ? fmtDateTime(scheduleResult.forecastEnd) : "—"}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {scheduleResult.unschedulable.length > 0 && (
            <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{scheduleResult.unschedulable.length} com pendência de agendamento</span>
            </Badge>
          )}

          <Button
            onClick={openDeadlineUpdatePreview}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Recalcular Agendamento Automático</span>
          </Button>
        </div>
      </div>

      {/* Tabela Gantt / Cronograma */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 overflow-hidden backdrop-blur-md">
        <div className="p-3 bg-white/5 border-b border-white/5 grid grid-cols-12 text-[11px] font-black uppercase tracking-wider text-white/40">
          <div className="col-span-5">Tarefa / Atividade</div>
          <div className="col-span-2">Responsável</div>
          <div className="col-span-2">Duração</div>
          <div className="col-span-3 text-right">Início & Término Projetado</div>
        </div>

        <div className="divide-y divide-white/5">
          {displayedTasks.map((task) => {
            const isCritical = criticalSet.has(task.id);
            const unscheduledReason = unschedulableMap.get(task.id);
            const assignee = task.assigneeId ? workspace.members[task.assigneeId] : null;

            return (
              <div
                key={task.id}
                className={`p-3 grid grid-cols-12 items-center gap-2 text-xs transition-colors hover:bg-white/[0.02] ${
                  isCritical ? "bg-amber-500/[0.02]" : ""
                }`}
              >
                {/* Coluna 1: Tarefa & Badges */}
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  {isCritical && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[9px] py-0 px-1 font-black shrink-0">
                      CRÍTICO
                    </Badge>
                  )}

                  <Badge
                    className={`text-[9px] font-black py-0 px-1 shrink-0 ${
                      task.priority === "P0"
                        ? "bg-rose-500/20 text-rose-300"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {task.priority}
                  </Badge>

                  {/* Flags de Impacto (Seção 7) */}
                  {task.impactFlags && task.impactFlags.length > 0 && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {task.impactFlags.slice(0, 3).map((f) => (
                        <span key={f} className="text-[11px]" title={IMPACT_FLAG_CONFIG[f]?.label}>
                          {IMPACT_FLAG_CONFIG[f]?.icon}
                        </span>
                      ))}
                    </div>
                  )}

                  <span
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setIsTaskModalOpen(true);
                    }}
                    className="truncate font-semibold text-white cursor-pointer hover:text-primary transition-colors"
                  >
                    {task.title}
                  </span>

                  {task.pinned && (
                    <Pin className="h-3 w-3 text-cyan-400 shrink-0" title="Horário fixado manualmente" />
                  )}
                </div>

                {/* Coluna 2: Responsável */}
                <div className="col-span-2 flex items-center gap-1.5 text-white/60 truncate">
                  <User className="h-3.5 w-3.5 text-white/30 shrink-0" />
                  <span className="truncate">{assignee?.name || "Não atribuído"}</span>
                </div>

                {/* Coluna 3: Duração */}
                <div className="col-span-2 text-white/60 font-mono text-[11px]">
                  {task.durationMinutes ? fmtMinutes(task.durationMinutes) : (
                    <span className="text-amber-400/80 italic text-[10px]">Sem estimativa</span>
                  )}
                </div>

                {/* Coluna 4: Datas & Reagendamento */}
                <div className="col-span-3 text-right">
                  {editingTaskId === task.id ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <Input
                        type="datetime-local"
                        value={newDateInput}
                        onChange={(e) => setNewDateInput(e.target.value)}
                        className="h-7 w-44 text-[11px] bg-black border-primary text-white"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleConfirmReschedule(task.id)}
                        className="h-7 px-2 text-xs bg-primary font-bold"
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingTaskId(null)}
                        className="h-7 px-2 text-xs text-white/50"
                      >
                        ✕
                      </Button>
                    </div>
                  ) : task.plannedStart ? (
                    <div
                      onDoubleClick={() => handleStartReschedule(task.id, task.plannedStart)}
                      className="cursor-pointer hover:text-primary transition-colors font-mono text-[11px]"
                      title="Clique duas vezes para reagendar manualmente"
                    >
                      <span className="text-white/90">{fmtDateTime(task.plannedStart)}</span>
                      <span className="text-white/40 mx-1">→</span>
                      <span className="text-white/70">{fmtDateTime(task.plannedEnd)}</span>
                    </div>
                  ) : unscheduledReason ? (
                    <span
                      onClick={() => handleStartReschedule(task.id, null)}
                      className="text-amber-400 text-[11px] italic cursor-pointer hover:underline"
                      title={unscheduledReason}
                    >
                      {unscheduledReason} (Definir)
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartReschedule(task.id, null)}
                      className="h-6 text-[10px] text-white/40 hover:text-white"
                    >
                      Agendar Data
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
