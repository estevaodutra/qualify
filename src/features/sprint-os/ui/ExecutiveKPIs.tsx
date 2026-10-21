/**
 * Cockpit Executivo 80/20 — Progresso e Execução (Região 2).
 * Especificação: Master Prompt v9.0 — Seção 6 (Região 2).
 *
 * Contém somente 4 cards limpos:
 * - CARD A: Progresso Geral (percentual grande, barra horizontal única, X de Y tarefas concluídas)
 * - CARD B: Missão Agora (próxima tarefa executável, prioridade, responsável, próxima subtarefa, botão Abrir)
 * - CARD C: Situação (linha compacta: 🔴 Pendentes, 🟡 Fazendo, 🟢 Feitas, 🚧 Bloqueadas)
 * - CARD D: Gasto com Anúncios (ou Próximo Marco se mídia não estiver configurada)
 */

import React from "react";
import {
  Activity,
  Compass,
  ArrowRight,
  User,
  Flag,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Play,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSprintOSStore } from "../state/sprintOsStore";
import {
  computeProgressMetrics,
  computeMissionNow,
} from "../metrics/calculations";
import { sprintTasks } from "../domain/ops";
import { PRIORITY_LABEL } from "../domain/types";

export const ExecutiveKPIs: React.FC = () => {
  const {
    workspace,
    activeSprintId,
    filterAssigneeId,
    setSelectedTaskId,
    setIsTaskModalOpen,
  } = useSprintOSStore();

  if (!workspace || !activeSprintId) return null;

  const sprint = workspace.sprints[activeSprintId];
  if (!sprint) return null;

  const progress = computeProgressMetrics(workspace, activeSprintId);
  const mission = computeMissionNow(workspace, activeSprintId, filterAssigneeId);
  const tasks = sprintTasks(workspace, activeSprintId);

  // Contagens para o CARD C (Situação)
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const doingCount = tasks.filter((t) => t.status === "doing").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const blockedCount = tasks.filter((t) => !!t.blockedReason).length;

  // Próximo Marco ou Gasto com Anúncios para o CARD D
  const pinnedIndicator = Object.values(workspace.indicators || {}).find((i) => i.pinnedToCockpit);
  const adSpend = workspace.contentMetrics?.adSpend ?? workspace.adsCalculator?.totalSpent ?? null;
  const showAdSpend = adSpend !== null && adSpend > 0;

  const nextMilestone = Object.values(workspace.milestones || {})
    .filter((m) => !m.archivedAt && !m.validatedAt)
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))[0];

  return (
    <section className="px-6 pt-5 pb-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5">
        {/* CARD A — PROGRESSO DO PROJETO (3 colunas) */}
        <div className="lg:col-span-3 p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between text-card-foreground">
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-medium">
              <span className="uppercase tracking-wider text-[11px] font-bold">Progresso Geral</span>
              <Activity className="h-3.5 w-3.5 text-primary" />
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                {progress.taskProgressPct}%
              </span>
            </div>

            <Progress value={progress.taskProgressPct} className="h-2 bg-muted" />
          </div>

          <div className="pt-2 text-[11px] text-muted-foreground font-medium">
            {progress.tasksDone} de {progress.tasksTotal} tarefas concluídas
          </div>
        </div>

        {/* CARD B — MISSÃO AGORA (5 colunas - Destaque Visual) */}
        <div className="lg:col-span-5 p-4 rounded-2xl bg-card border border-primary/30 shadow-sm relative overflow-hidden flex flex-col justify-between text-card-foreground">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-primary">
                <Compass className="h-3.5 w-3.5 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider">Missão Agora</span>
              </div>
              {mission.task && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 border-border text-muted-foreground bg-muted font-mono"
                >
                  {PRIORITY_LABEL[mission.task.priority]}
                </Badge>
              )}
            </div>

            {mission.task ? (
              <div>
                <h4 className="text-sm font-bold text-foreground line-clamp-1 mb-1">
                  {mission.task.title}
                </h4>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {mission.assigneeName || "Sem responsável"}
                  </span>
                  <span>•</span>
                  <span className="truncate max-w-[180px]">{mission.stageTitle}</span>
                </div>

                {mission.nextSubtask && (
                  <div className="text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg border border-border line-clamp-1 flex items-center gap-1.5">
                    <span className="text-primary font-bold">Próxima ação:</span>
                    <span className="text-foreground">{mission.nextSubtask.title}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Nenhuma tarefa pendente desbloqueada no momento!</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            {mission.task && (
              <Button
                onClick={() => {
                  setSelectedTaskId(mission.task!.id);
                  setIsTaskModalOpen(true);
                }}
                size="sm"
                className="h-7 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-3 rounded-lg flex items-center gap-1 shadow-sm"
              >
                <span>Abrir</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* CARD C — SITUAÇÃO (2 colunas - Compacto em Linha) */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between text-card-foreground">
          <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">
            Situação
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-1.5 rounded-xl bg-muted/40 border border-border flex flex-col">
              <span className="text-[10px] text-muted-foreground">🔴 Pendentes</span>
              <span className="text-sm font-bold text-foreground font-mono">{pendingCount}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-muted/40 border border-border flex flex-col">
              <span className="text-[10px] text-muted-foreground">🟡 Fazendo</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">{doingCount}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-muted/40 border border-border flex flex-col">
              <span className="text-[10px] text-muted-foreground">🟢 Feitas</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{doneCount}</span>
            </div>
            <div className="p-1.5 rounded-xl bg-muted/40 border border-border flex flex-col">
              <span className="text-[10px] text-muted-foreground">🚧 Bloqueadas</span>
              <span className={`text-sm font-bold font-mono ${blockedCount > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {blockedCount}
              </span>
            </div>
          </div>
        </div>

        {/* CARD D — GASTO COM ANÚNCIOS / PRÓXIMO MARCO / KPI FIXADO (2 colunas) */}
        <div className="lg:col-span-2 p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between text-card-foreground">
          {pinnedIndicator ? (
            <>
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-medium">
                  <span className="uppercase tracking-wider text-[11px] font-bold truncate">
                    {pinnedIndicator.name}
                  </span>
                  <Activity className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="text-2xl font-extrabold text-foreground font-mono">
                  {pinnedIndicator.unit} {pinnedIndicator.currentValue}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Meta: {pinnedIndicator.targetValue ? `${pinnedIndicator.unit} ${pinnedIndicator.targetValue}` : "N/A"}
              </div>
            </>
          ) : showAdSpend ? (
            <>
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-medium">
                  <span className="uppercase tracking-wider text-[11px] font-bold">Gasto com Anúncios</span>
                  <DollarSign className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="text-2xl font-extrabold text-foreground font-mono">
                  R$ {Number(adSpend).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Período da Sprint ativa
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 font-medium">
                  <span className="uppercase tracking-wider text-[11px] font-bold">Próximo Marco</span>
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="text-sm font-bold text-foreground line-clamp-2">
                  {nextMilestone ? nextMilestone.title : "Sem marcos pendentes"}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {nextMilestone?.dueDate ? `Prazo: ${nextMilestone.dueDate}` : "Planejamento em dia"}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
