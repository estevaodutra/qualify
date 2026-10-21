/**
 * Visão Kanban do Sprint OS (Camada A / Seção 16 e 23).
 * Três colunas canônicas principais:
 * - 🔴 PENDENTE (Não iniciada)
 * - 🟡 FAZENDO (Em execução)
 * - 🟢 FEITO (Concluída)
 * Aplica regras estritas de transição (ex: impede conclusão com subtarefas obrigatórias pendentes).
 */

import React from "react";
import {
  Clock,
  User,
  AlertTriangle,
  DollarSign,
  CheckCircle2,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { sprintTasks, subtasksOf } from "../../domain/ops";
import { PRIORITY_LABEL, IMPACT_FLAG_CONFIG, type TaskStatus, type Task } from "../../domain/types";
import { fmtDateTime, fmtMinutes } from "../../scheduler/time";

const COLUMNS: { id: TaskStatus; title: string; color: string; bg: string; icon: string }[] = [
  { id: "pending", title: "Pendente", color: "text-rose-600 dark:text-rose-400", bg: "border-rose-500/20 bg-rose-500/5", icon: "🔴" },
  { id: "doing", title: "Fazendo", color: "text-amber-600 dark:text-amber-400", bg: "border-amber-500/20 bg-amber-500/5", icon: "🟡" },
  { id: "done", title: "Feito", color: "text-emerald-600 dark:text-emerald-400", bg: "border-emerald-500/20 bg-emerald-500/5", icon: "🟢" },
];

export const KanbanView: React.FC = () => {
  const {
    workspace,
    activeSprintId,
    searchQuery,
    filterAssigneeId,
    filterPriority,
    filterStatus,
    filterImpact,
    setSelectedTaskId,
    setIsTaskModalOpen,
    setTaskStatusAction,
  } = useSprintOSStore();

  if (!workspace || !activeSprintId) return null;

  let tasks = sprintTasks(workspace, activeSprintId);

  // Filtros
  if (searchQuery) {
    tasks = tasks.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }
  if (filterAssigneeId) {
    tasks = tasks.filter((t) => t.assigneeId === filterAssigneeId);
  }
  if (filterPriority) {
    tasks = tasks.filter((t) => t.priority === filterPriority);
  }
  if (filterStatus) {
    tasks = tasks.filter((t) => t.status === filterStatus);
  }
  if (filterImpact) {
    tasks = tasks.filter((t) => t.impactFlags?.includes(filterImpact));
  }

  const handleCardClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[600px]">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);

        return (
          <div
            key={col.id}
            className={`rounded-2xl border ${col.bg} p-4 flex flex-col backdrop-blur-md shadow-xs`}
          >
            {/* Cabeçalho da Coluna */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span>{col.icon}</span>
                <span className={`text-sm font-black uppercase tracking-wider ${col.color}`}>
                  {col.title}
                </span>
              </div>
              <Badge variant="outline" className="text-xs font-bold border-border text-muted-foreground bg-muted">
                {colTasks.length}
              </Badge>
            </div>

            {/* Lista de Cards */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {colTasks.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-muted-foreground/40 border border-dashed border-border rounded-xl">
                  Nenhuma tarefa nesta coluna
                </div>
              ) : (
                colTasks.map((task) => {
                  const subtasks = subtasksOf(workspace, task.id);
                  const assignee = task.assigneeId ? workspace.members[task.assigneeId] : null;
                  const stage = workspace.stages[task.stageId];

                  return (
                    <div
                      key={task.id}
                      onClick={() => handleCardClick(task.id)}
                      className="p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all cursor-pointer shadow-sm group relative text-card-foreground"
                    >
                      {/* Topo do Card: Etapa & Prioridade */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-black truncate">
                          {stage?.title || "Etapa"}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {task.financialImpact && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-[9px] py-0 px-1 gap-0.5">
                              <DollarSign className="h-2 w-2" />
                              <span>$</span>
                            </Badge>
                          )}

                          <Badge
                            className={`text-[9px] font-black py-0 px-1.5 ${
                              task.priority === "P0"
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30"
                                : task.priority === "P1"
                                ? "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30"
                            }`}
                          >
                            {task.priority}
                          </Badge>

                          {/* Flags de Impacto (Seção 7) */}
                          {task.impactFlags && task.impactFlags.length > 0 && (
                            <div className="flex items-center gap-0.5">
                              {task.impactFlags.slice(0, 3).map((f) => (
                                <span key={f} className="text-xs" title={IMPACT_FLAG_CONFIG[f]?.label}>
                                  {IMPACT_FLAG_CONFIG[f]?.icon}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Título da Tarefa */}
                      <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2.5">
                        {task.title}
                      </h4>

                      {/* Bloqueio se houver */}
                      {task.blockedReason && (
                        <div className="mb-2 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-600 dark:text-rose-300 flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span className="truncate">{task.blockedReason}</span>
                        </div>
                      )}

                      {/* Rodapé do Card: Responsável, Horas e Checklists */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                        <span className="flex items-center gap-1 truncate max-w-[120px]">
                          <User className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span className="truncate text-foreground/80">{assignee?.name || "Sem atribuição"}</span>
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          {subtasks.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                              <span>
                                {subtasks.filter((s) => s.done).length}/{subtasks.length}
                              </span>
                            </span>
                          )}

                          {task.durationMinutes && (
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {fmtMinutes(task.durationMinutes)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botões rápidos de transição no hover */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-popover text-popover-foreground p-1 rounded-lg border border-border shadow-md"
                      >
                        {col.id !== "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTaskStatusAction(task.id, "pending")}
                            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            Pendente
                          </Button>
                        )}
                        {col.id !== "doing" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTaskStatusAction(task.id, "doing")}
                            className="h-5 px-1.5 text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-500"
                          >
                            Fazendo
                          </Button>
                        )}
                        {col.id !== "done" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTaskStatusAction(task.id, "done")}
                            className="h-5 px-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold"
                          >
                            Concluir
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
