/**
 * Página de Visualização Compartilhada Somente-Leitura para Externos.
 * Rota: /sprint-os/shared/:token
 */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Flag,
  Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SprintOSRepository } from "../persistence/repository";
import type { Workspace } from "../domain/types";
import { computeProgressMetrics } from "../metrics/calculations";
import { stagesOf, tasksOf, subtasksOf } from "../domain/ops";
import { fmtDateTime, fmtMinutes } from "../scheduler/time";

export const SprintOSSharedPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    SprintOSRepository.loadSharedData(token).then((data) => {
      setWorkspace(data);
      setIsLoading(false);
    });
  }, [token]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0B0E14] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-white/50">Carregando visualização compartilhada...</span>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0B0E14] text-white p-4">
        <div className="max-w-md text-center space-y-2">
          <h2 className="text-lg font-bold">Link de Compartilhamento Expirado ou Inválido</h2>
          <p className="text-xs text-white/50">
            Este link pode ter sido revogado pelo administrador ou não existe mais.
          </p>
        </div>
      </div>
    );
  }

  const sprintId = Object.keys(workspace.sprints)[0];
  const sprint = workspace.sprints[sprintId];
  const progress = computeProgressMetrics(workspace, sprintId);
  const stages = stagesOf(workspace, sprintId);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-white/10 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-widest font-black text-white/40">
              {workspace.project.name} · {workspace.project.client}
            </span>
            <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30">
              Somente Leitura
            </Badge>
          </div>
          <h1 className="text-xl font-black text-white">{sprint?.name || "Cronograma de Implementação"}</h1>
          <p className="text-xs text-white/60 mt-1">{sprint?.objective}</p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-primary">{progress.taskProgressPct}%</div>
          <div className="text-xs text-white/40">Progresso Geral</div>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="text-[11px] text-white/40 uppercase font-bold">Tarefas Concluídas</div>
          <div className="text-lg font-bold text-white mt-1">
            {progress.tasksDone} / {progress.tasksTotal}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="text-[11px] text-white/40 uppercase font-bold">Dias Úteis</div>
          <div className="text-lg font-bold text-white mt-1">
            Dia {progress.currentWorkDayIndex} de {progress.businessDaysTotal}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="text-[11px] text-white/40 uppercase font-bold">Horas Entregues</div>
          <div className="text-lg font-bold text-amber-400 mt-1">
            {fmtMinutes(progress.effortDoneMinutes)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
          <div className="text-[11px] text-white/40 uppercase font-bold">Marcos Validados</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {progress.milestonesDone} / {progress.milestonesTotal}
          </div>
        </div>
      </div>

      {/* Lista de Entregas por Etapa */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Etapas da Implementação
        </h3>

        {stages.map((stage) => {
          const tasks = tasksOf(workspace, stage.id);
          return (
            <div key={stage.id} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                <span className="text-xs font-black uppercase text-white/80">{stage.title}</span>
                <span className="text-xs text-white/40">{tasks.length} entregas</span>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => {
                  const subtasks = subtasksOf(workspace, task.id);
                  const isDone = task.status === "done";
                  return (
                    <div
                      key={task.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                        isDone
                          ? "bg-emerald-500/5 border-emerald-500/20 text-white/60"
                          : "bg-white/[0.02] border-white/5 text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-white/30 shrink-0" />
                        )}
                        <span className={`font-semibold ${isDone ? "line-through text-white/50" : "text-white"}`}>
                          {task.title}
                        </span>
                      </div>

                      {subtasks.length > 0 && (
                        <span className="text-[11px] text-white/40 font-mono">
                          {subtasks.filter((s) => s.done).length}/{subtasks.length}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SprintOSSharedPage;
