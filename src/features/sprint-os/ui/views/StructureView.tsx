/**
 * Visão Estrutura em Blocos do Sprint OS (Camada A / Seção 6 e 7).
 * - Hierarquia: Projeto -> Sprint -> Etapa -> Tarefa -> Subtarefa
 * - Suporta Modos: Organização (Drag&Drop, reordenar), Execução (Checklist, Status), Planejamento (Datas, Prazos)
 * - Controles alternativos acessíveis (↑ / ↓ / Mover etapa / Duplicar / Excluir)
 * - Edição rápida inline
 */

import React, { useState } from "react";
import {
  GripVertical,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Clock,
  User,
  AlertTriangle,
  DollarSign,
  Eye,
  CheckSquare,
  Minus,
  Maximize2,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSprintOSStore } from "../../state/sprintOsStore";
import {
  stagesOf,
  tasksOf,
  subtasksOf,
  createStage,
  createTask,
  createSubtask,
  reorderStages,
  moveTask,
  duplicateStage,
  duplicateTask,
  archiveStage,
  archiveTask,
  renameStage,
  updateTask,
  ackState,
} from "../../domain/ops";
import { PRIORITY_LABEL, PRIORITY_RANK, STATUS_ICON, type TaskStatus, type Priority } from "../../domain/types";
import { fmtDateTime, fmtMinutes } from "../../scheduler/time";

export const StructureView: React.FC = () => {
  const {
    workspace,
    activeSprintId,
    interactionMode,
    searchQuery,
    filterAssigneeId,
    filterPriority,
    filterStatus,
    setSelectedTaskId,
    setIsTaskModalOpen,
    setTaskStatusAction,
    toggleSubtaskAction,
    stepSubtaskCountAction,
    acknowledgeAction,
    mutate,
  } = useSprintOSStore();

  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");

  if (!workspace || !activeSprintId) return null;

  const stages = stagesOf(workspace, activeSprintId);

  const toggleStage = (id: string) => {
    setExpandedStages((prev) => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] }));
  };

  const toggleTask = (id: string) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Reordenação de Etapas
  const moveStageOrder = (stageId: string, direction: "up" | "down") => {
    const list = [...stages];
    const idx = list.findIndex((s) => s.id === stageId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const [moved] = list.splice(idx, 1);
    list.splice(targetIdx, 0, moved);

    mutate((ws, ctx) => {
      reorderStages(ws, ctx, activeSprintId, list.map((s) => s.id));
    });
  };

  // Reordenação de Tarefas
  const moveTaskOrder = (taskId: string, stageId: string, direction: "up" | "down") => {
    const stageTasks = tasksOf(workspace, stageId);
    const idx = stageTasks.findIndex((t) => t.id === taskId);
    if (idx < 0) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= stageTasks.length) return;

    mutate((ws, ctx) => {
      moveTask(ws, ctx, taskId, stageId, targetIdx);
    });
  };

  // Mover tarefa para outra etapa
  const moveTaskToStage = (taskId: string, targetStageId: string) => {
    mutate((ws, ctx) => {
      const targetTasks = tasksOf(ws, targetStageId);
      moveTask(ws, ctx, taskId, targetStageId, targetTasks.length);
    });
  };

  const startEditTitle = (id: string, current: string) => {
    setEditingTitleId(id);
    setEditingTitleText(current);
  };

  const commitEditTitle = (type: "stage" | "task", id: string) => {
    if (!editingTitleText.trim()) {
      setEditingTitleId(null);
      return;
    }
    mutate((ws, ctx) => {
      if (type === "stage") {
        renameStage(ws, ctx, id, editingTitleText.trim());
      } else {
        updateTask(ws, ctx, id, { title: editingTitleText.trim() });
      }
    });
    setEditingTitleId(null);
  };

  return (
    <div className="space-y-4">
      {/* Botão Superior para Adicionar Etapa */}
      <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/10">
        <div className="text-xs text-white/60">
          Modo Atual: <strong className="text-white uppercase">{interactionMode}</strong> · Gerencie a árvore de blocos
        </div>

        <Button
          onClick={() => {
            mutate((ws, ctx) => {
              createStage(ws, ctx, activeSprintId, `NOVA ETAPA ${stages.length + 1}`);
            });
          }}
          size="sm"
          className="bg-white/10 hover:bg-white/15 text-white text-xs gap-1.5 font-bold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Adicionar Etapa</span>
        </Button>
      </div>

      {/* Lista de Etapas */}
      {stages.map((stage, stageIdx) => {
        const isStageExpanded = expandedStages[stage.id] ?? true;
        let tasks = tasksOf(workspace, stage.id);

        // Aplicação de filtros
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

        return (
          <div
            key={stage.id}
            className="rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-md overflow-hidden transition-all"
          >
            {/* Cabeçalho da Etapa */}
            <div className="p-3.5 bg-white/5 border-b border-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <button
                  onClick={() => toggleStage(stage.id)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                >
                  {isStageExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {editingTitleId === stage.id ? (
                  <Input
                    value={editingTitleText}
                    onChange={(e) => setEditingTitleText(e.target.value)}
                    onBlur={() => commitEditTitle("stage", stage.id)}
                    onKeyDown={(e) => e.key === "Enter" && commitEditTitle("stage", stage.id)}
                    autoFocus
                    className="h-7 text-xs font-black uppercase tracking-wider bg-black border-primary"
                  />
                ) : (
                  <span
                    onDoubleClick={() => startEditTitle(stage.id, stage.title)}
                    className="text-xs font-black uppercase tracking-wider text-white truncate cursor-pointer hover:text-primary transition-colors"
                    title="Clique duas vezes para renomear"
                  >
                    {stage.title}
                  </span>
                )}

                <Badge variant="outline" className="text-[10px] text-white/40 border-white/10 py-0 shrink-0">
                  {tasks.length} tarefa(s)
                </Badge>
              </div>

              {/* Ações da Etapa */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  onClick={() => {
                    mutate((ws, ctx) => {
                      createTask(ws, ctx, stage.id, "Nova Tarefa Operacional");
                    });
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-white/70 hover:text-white hover:bg-white/10 gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span className="hidden sm:inline">Adicionar Tarefa</span>
                </Button>

                {/* Menu de Etapa (Acessibilidade) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-7 w-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-zinc-950 border-white/10 text-white text-xs">
                    <DropdownMenuItem
                      disabled={stageIdx === 0}
                      onClick={() => moveStageOrder(stage.id, "up")}
                      className="gap-2 cursor-pointer focus:bg-white/10"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      <span>Mover para cima</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={stageIdx === stages.length - 1}
                      onClick={() => moveStageOrder(stage.id, "down")}
                      className="gap-2 cursor-pointer focus:bg-white/10"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      <span>Mover para baixo</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => startEditTitle(stage.id, stage.title)}
                      className="gap-2 cursor-pointer focus:bg-white/10"
                    >
                      <span>Renomear etapa</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => mutate((ws, ctx) => duplicateStage(ws, ctx, stage.id))}
                      className="gap-2 cursor-pointer focus:bg-white/10"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Duplicar etapa</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem
                      onClick={() => mutate((ws, ctx) => archiveStage(ws, ctx, stage.id))}
                      className="gap-2 text-rose-400 cursor-pointer focus:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Excluir / Arquivar etapa</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Lista de Tarefas da Etapa */}
            {isStageExpanded && (
              <div className="p-2 space-y-2">
                {tasks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-white/30 border border-dashed border-white/5 rounded-xl">
                    Nenhuma tarefa nesta etapa. Clique em "Adicionar Tarefa".
                  </div>
                ) : (
                  tasks.map((task, taskIdx) => {
                    const subtasks = subtasksOf(workspace, task.id);
                    const isTaskExpanded = expandedTasks[task.id] ?? false;
                    const assignee = task.assigneeId ? workspace.members[task.assigneeId] : null;
                    const ack = ackState(workspace, task.id, task.assigneeId);

                    return (
                      <div
                        key={task.id}
                        className={`rounded-xl border transition-all ${
                          task.status === "done"
                            ? "bg-white/[0.02] border-white/5 text-white/60"
                            : task.status === "doing"
                            ? "bg-amber-500/[0.04] border-amber-500/20 text-white"
                            : "bg-white/5 border-white/5 hover:border-white/20 text-white"
                        }`}
                      >
                        {/* Linha Principal da Tarefa */}
                        <div className="p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {/* Grip handle (Modo Organização) */}
                            {interactionMode === "organize" && (
                              <GripVertical className="h-4 w-4 text-white/20 shrink-0 cursor-grab" />
                            )}

                            {/* Status Toggle Rápido */}
                            <button
                              onClick={() => {
                                const nextStatus: TaskStatus =
                                  task.status === "pending"
                                    ? "doing"
                                    : task.status === "doing"
                                    ? "done"
                                    : "pending";
                                setTaskStatusAction(task.id, nextStatus);
                              }}
                              className="text-base shrink-0 hover:scale-110 transition-transform"
                              title={`Status: ${task.status}. Clique para alternar.`}
                            >
                              {STATUS_ICON[task.status]}
                            </button>

                            {/* Título da Tarefa com Inline Edit */}
                            {editingTitleId === task.id ? (
                              <Input
                                value={editingTitleText}
                                onChange={(e) => setEditingTitleText(e.target.value)}
                                onBlur={() => commitEditTitle("task", task.id)}
                                onKeyDown={(e) => e.key === "Enter" && commitEditTitle("task", task.id)}
                                autoFocus
                                className="h-7 text-xs font-bold bg-black border-primary"
                              />
                            ) : (
                              <span
                                onDoubleClick={() => startEditTitle(task.id, task.title)}
                                onClick={() => {
                                  setSelectedTaskId(task.id);
                                  setIsTaskModalOpen(true);
                                }}
                                className={`text-xs font-bold truncate cursor-pointer hover:text-primary transition-colors ${
                                  task.status === "done" ? "line-through text-white/50" : "text-white"
                                }`}
                              >
                                {task.title}
                              </span>
                            )}

                            {/* Badges de Prioridade e Impacto */}
                            <Badge
                              className={`text-[9px] font-black py-0 px-1.5 shrink-0 ${
                                task.priority === "P0"
                                  ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                                  : task.priority === "P1"
                                  ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                                  : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              }`}
                            >
                              {task.priority}
                            </Badge>

                            {task.financialImpact && (
                              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[9px] py-0 px-1.5 gap-0.5 shrink-0">
                                <DollarSign className="h-2 w-2" />
                                <span>$</span>
                              </Badge>
                            )}

                            {/* Responsável */}
                            <span className="text-[11px] text-white/50 shrink-0 hidden md:inline flex items-center gap-1">
                              <User className="h-3 w-3 text-white/30" />
                              {assignee?.name || "Sem atribuição"}
                            </span>

                            {/* Ciência (Seção 21) */}
                            {task.assigneeId && (
                              <span
                                onClick={() => acknowledgeAction(task.id, task.assigneeId!)}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer shrink-0 ${
                                  ack === "current"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                    : ack === "outdated"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                    : "bg-white/5 text-white/40 hover:text-white"
                                }`}
                                title={
                                  ack === "current"
                                    ? "Ciência confirmada na versão atual"
                                    : ack === "outdated"
                                    ? "Ciência desatualizada após alteração de escopo/prazo"
                                    : "Clique para confirmar ciência"
                                }
                              >
                                👁️ {ack === "current" ? "Ciente" : ack === "outdated" ? "Revisar Ciência" : "Ciente?"}
                              </span>
                            )}

                            {/* Duração / Prazos */}
                            {task.durationMinutes && (
                              <span className="text-[10px] font-mono text-white/40 shrink-0 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {fmtMinutes(task.durationMinutes)}
                              </span>
                            )}
                          </div>

                          {/* Ações da Tarefa */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Contador de Subtarefas com Toggle de Expansão */}
                            {subtasks.length > 0 && (
                              <button
                                onClick={() => toggleTask(task.id)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                              >
                                <CheckSquare className="h-3 w-3 text-primary" />
                                <span>
                                  {subtasks.filter((s) => s.done).length}/{subtasks.length}
                                </span>
                                {isTaskExpanded ? (
                                  <ChevronDown className="h-3 w-3 ml-0.5" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 ml-0.5" />
                                )}
                              </button>
                            )}

                            {/* Botão de Detalhes Completo */}
                            <Button
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setIsTaskModalOpen(true);
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-white/40 hover:text-white"
                              title="Abrir detalhes completos da tarefa"
                            >
                              <Maximize2 className="h-3.5 w-3.5" />
                            </Button>

                            {/* Menu de Acessibilidade da Tarefa */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-7 w-7 rounded hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-zinc-950 border-white/10 text-white text-xs">
                                <DropdownMenuItem
                                  disabled={taskIdx === 0}
                                  onClick={() => moveTaskOrder(task.id, stage.id, "up")}
                                  className="gap-2 cursor-pointer focus:bg-white/10"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                  <span>Mover para cima</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={taskIdx === tasks.length - 1}
                                  onClick={() => moveTaskOrder(task.id, stage.id, "down")}
                                  className="gap-2 cursor-pointer focus:bg-white/10"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                  <span>Mover para baixo</span>
                                </DropdownMenuItem>

                                {/* Mover para outra Etapa */}
                                <DropdownMenuSeparator className="bg-white/10" />
                                {stages
                                  .filter((s) => s.id !== stage.id)
                                  .map((targetSt) => (
                                    <DropdownMenuItem
                                      key={targetSt.id}
                                      onClick={() => moveTaskToStage(task.id, targetSt.id)}
                                      className="gap-2 cursor-pointer focus:bg-white/10 text-white/70"
                                    >
                                      <span>Mover para: {targetSt.title}</span>
                                    </DropdownMenuItem>
                                  ))}

                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem
                                  onClick={() => mutate((ws, ctx) => duplicateTask(ws, ctx, task.id))}
                                  className="gap-2 cursor-pointer focus:bg-white/10"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Duplicar tarefa</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => mutate((ws, ctx) => archiveTask(ws, ctx, task.id))}
                                  className="gap-2 text-rose-400 cursor-pointer focus:bg-rose-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Arquivar tarefa</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Bloco Expandido: Subtarefas e Microcheckpoints (Seção 19) */}
                        {isTaskExpanded && (
                          <div className="pl-8 pr-4 pb-3 pt-1 border-t border-white/5 space-y-1.5 bg-black/20">
                            {subtasks.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between text-xs py-1 group/sub"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <button
                                    onClick={() => toggleSubtaskAction(sub.id, !sub.done)}
                                    className="shrink-0 text-white/40 hover:text-emerald-400 transition-colors"
                                  >
                                    {sub.done ? (
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : (
                                      <Circle className="h-3.5 w-3.5" />
                                    )}
                                  </button>

                                  <span className={`truncate ${sub.done ? "line-through text-white/40" : "text-white/80"}`}>
                                    {sub.title}
                                  </span>

                                  {sub.required && (
                                    <span className="text-[10px] text-amber-400/80 font-semibold shrink-0">
                                      *obrigatória
                                    </span>
                                  )}
                                </div>

                                {/* Contador Quantitativo [-] 0 / N [+] (Seção 19 e 29) */}
                                {sub.target != null && (
                                  <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded border border-white/10 shrink-0">
                                    <button
                                      onClick={() => stepSubtaskCountAction(sub.id, -1)}
                                      disabled={sub.count <= 0}
                                      className="text-white/40 hover:text-white disabled:opacity-30"
                                    >
                                      <Minus className="h-2.5 w-2.5" />
                                    </button>
                                    <span className="font-mono font-bold text-[11px] text-white">
                                      {sub.count}/{sub.target}
                                    </span>
                                    <button
                                      onClick={() => stepSubtaskCountAction(sub.id, 1)}
                                      disabled={sub.count >= sub.target}
                                      className="text-white/40 hover:text-white disabled:opacity-30"
                                    >
                                      <Plus className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Adicionar Subtarefa Rápida */}
                            <div className="pt-1.5">
                              <Button
                                onClick={() => {
                                  mutate((ws, ctx) => {
                                    createSubtask(ws, ctx, task.id, "Nova subtarefa");
                                  });
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px] text-white/40 hover:text-white p-0 gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Adicionar item de checklist</span>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
