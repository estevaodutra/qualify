/**
 * Visão Kanban do Sprint OS (Camada A / Seção 16 e 23).
 * Três colunas canônicas principais:
 * - 🔴 PENDENTE (Não iniciada)
 * - 🟡 FAZENDO (Em execução)
 * - 🟢 FEITO (Concluída)
 * Aplica regras estritas de transição (ex: impede conclusão com subtarefas obrigatórias pendentes).
 */

import React, { useState, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { sprintTasks, subtasksOf, updateTask } from "../../domain/ops";
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
    filterExpertDemands,
    filterOrigin,
    setSelectedTaskId,
    setIsTaskModalOpen,
    setTaskStatusAction,
    mutate,
  } = useSprintOSStore();

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");
  const clickTimeoutRef = useRef<any>(null);

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
  if (filterExpertDemands) {
    tasks = tasks.filter((t) => t.expertDemand?.isExpertDemand);
  }
  if (filterOrigin) {
    tasks = tasks.filter((t) => (t.origin || "defined") === filterOrigin);
  }

  const handleCardClick = (taskId: string) => {
    if (editingTaskId === taskId) return;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }
    clickTimeoutRef.current = setTimeout(() => {
      setSelectedTaskId(taskId);
      setIsTaskModalOpen(true);
      clickTimeoutRef.current = null;
    }, 240);
  };

  const handleTitleDoubleClick = (taskId: string, title: string) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setIsTaskModalOpen(false);
    setEditingTaskId(taskId);
    setEditingTitleText(title);
  };

  const handleCommitTitle = (taskId: string) => {
    if (editingTitleText.trim()) {
      mutate((ws, ctx) => {
        updateTask(ws, ctx, taskId, { title: editingTitleText.trim() });
      });
    }
    setEditingTaskId(null);
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
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-sm group relative text-card-foreground ${
                        filterAssigneeId && task.assigneeId === filterAssigneeId
                          ? "ring-2 ring-primary/60 border-primary bg-primary/[0.04] shadow-md"
                          : "border-border bg-card hover:border-primary/40 hover:shadow-md"
                      }`}
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

                          {/* 7D Badges */}
                          {task.expertDemand?.isExpertDemand && (
                            <span className="text-xs cursor-help" title={`Demanda do Expert: ${task.expertDemand.category}`}>
                              👔
                            </span>
                          )}
                          {task.origin === "proposed" && (
                            <Badge variant="outline" className="text-[8px] font-mono py-0 px-1 border-dashed border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                              PROPOSTO
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Título da Tarefa com Edição Inline no Duplo Clique */}
                      {editingTaskId === task.id ? (
                        <div onClick={(e) => e.stopPropagation()} className="mb-2.5">
                          <Input
                            value={editingTitleText}
                            onChange={(e) => setEditingTitleText(e.target.value)}
                            onBlur={() => handleCommitTitle(task.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCommitTitle(task.id);
                              if (e.key === "Escape") setEditingTaskId(null);
                            }}
                            autoFocus
                            className="h-7 text-xs font-bold bg-background border-primary text-foreground"
                          />
                        </div>
                      ) : (
                        <h4
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            handleTitleDoubleClick(task.id, task.title);
                          }}
                          className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2.5 cursor-pointer"
                          title="Clique duas vezes para renomear"
                        >
                          {task.title}
                        </h4>
                      )}

                      {/* Bloqueio se houver */}
                      {(task.blockInfo?.active || task.blockedReason) && (
                        <div className="mb-2 p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-600 dark:text-rose-300 flex items-center gap-1.5 font-medium">
                          <span className="text-xs shrink-0">🚧</span>
                          <span className="truncate">
                            {task.blockInfo?.active
                              ? `BLOQUEIO: ${task.blockInfo.reason || "Pendente"}`
                              : task.blockedReason}
                          </span>
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
