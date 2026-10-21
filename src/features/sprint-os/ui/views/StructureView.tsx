/**
 * Visão Estrutura em Blocos do Sprint OS (Cockpit 80/20).
 * Especificação: Master Prompt v9.0 — Seções 9, 10 e 11.
 * - Hierarquia: Cronograma -> Etapa -> Tarefa -> Subtarefa
 * - Drag & Drop real de etapas (recalcula numeração) e tarefas (mesma etapa e entre etapas)
 * - Atribuição direta inline de responsável com 1 clique (Seção 11)
 * - Divulgação progressiva: linha recolhida minimalista, expande para ver subtarefas e detalhes
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
  CheckSquare,
  Search,
  UserCheck,
  UserX,
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
  archiveStage,
  archiveTask,
  renameStage,
  updateTask,
  ackState,
} from "../../domain/ops";
import { PRIORITY_LABEL, STATUS_ICON, type TaskStatus } from "../../domain/types";
import { fmtMinutes } from "../../scheduler/time";

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
    assignTaskMemberAction,
    reorderStagesAction,
    moveTaskAction,
    mutate,
  } = useSprintOSStore();

  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");

  // Estados de Drag & Drop
  const [draggedStageId, setDraggedStageId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  if (!workspace || !activeSprintId) return null;

  const stages = stagesOf(workspace, activeSprintId);
  const members = Object.values(workspace.members || {}).filter((m) => !m.archivedAt);

  const toggleStage = (id: string) => {
    setExpandedStages((prev) => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] }));
  };

  const toggleTask = (id: string) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
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
      if (type === "stage") renameStage(ws, ctx, id, editingTitleText.trim());
      else updateTask(ws, ctx, id, { title: editingTitleText.trim() });
    });
    setEditingTitleId(null);
  };

  // Reordenação de Etapas por Drag & Drop
  const handleStageDrop = (targetStageId: string) => {
    if (!draggedStageId || draggedStageId === targetStageId) return;
    const stageIds = stages.map((s) => s.id);
    const fromIndex = stageIds.indexOf(draggedStageId);
    const toIndex = stageIds.indexOf(targetStageId);
    if (fromIndex === -1 || toIndex === -1) return;

    stageIds.splice(fromIndex, 1);
    stageIds.splice(toIndex, 0, draggedStageId);
    reorderStagesAction(stageIds);
    setDraggedStageId(null);
  };

  // Reordenação de Tarefas por Drag & Drop
  const handleTaskDrop = (toStageId: string, toIndex: number) => {
    if (!draggedTaskId) return;
    moveTaskAction(draggedTaskId, toStageId, toIndex);
    setDraggedTaskId(null);
  };

  return (
    <div className="space-y-4">
      {/* Estado Vazio para Cronogramas em Branco */}
      {stages.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-zinc-950/40">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
            <Plus className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-white/90">Nenhuma etapa cadastrada</h3>
          <p className="text-xs text-white/40 max-w-sm mt-1 mb-4">
            Este cronograma está em branco. Comece adicionando a primeira etapa da sua implementação.
          </p>
          <Button
            onClick={() => {
              mutate((ws, ctx) => {
                createStage(ws, ctx, activeSprintId, "Etapa 01 — Planejamento Inicial");
              });
            }}
            className="text-xs bg-primary hover:bg-primary/90 text-white font-medium px-4 py-2 rounded-xl flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar Etapa</span>
          </Button>
        </div>
      ) : (
        stages.map((stage, stageIdx) => {
          let tasks = tasksOf(workspace, stage.id);

          // Filtros
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            tasks = tasks.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
          }
          if (filterAssigneeId) tasks = tasks.filter((t) => t.assigneeId === filterAssigneeId);
          if (filterPriority) tasks = tasks.filter((t) => t.priority === filterPriority);
          if (filterStatus) tasks = tasks.filter((t) => t.status === filterStatus);

          const isStageExpanded = expandedStages[stage.id] ?? true;
          const stageNumber = (stageIdx + 1).toString().padStart(2, "0");

          return (
            <div
              key={stage.id}
              draggable={interactionMode === "organize"}
              onDragStart={() => setDraggedStageId(stage.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleStageDrop(stage.id)}
              className="rounded-2xl border border-white/5 bg-zinc-900/40 overflow-hidden shadow-sm transition-all"
            >
              {/* Cabeçalho da Etapa */}
              <div className="p-3 bg-zinc-950/70 border-b border-white/5 flex items-center justify-between gap-3">
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

                  {interactionMode === "organize" && (
                    <GripVertical className="h-4 w-4 text-white/30 cursor-grab shrink-0" />
                  )}

                  {editingTitleId === stage.id ? (
                    <Input
                      value={editingTitleText}
                      onChange={(e) => setEditingTitleText(e.target.value)}
                      onBlur={() => commitEditTitle("stage", stage.id)}
                      onKeyDown={(e) => e.key === "Enter" && commitEditTitle("stage", stage.id)}
                      autoFocus
                      className="h-7 text-xs font-bold uppercase tracking-wider bg-black border-primary text-white"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startEditTitle(stage.id, stage.title)}
                      className="text-xs font-bold uppercase tracking-wider text-white truncate cursor-pointer hover:text-primary transition-colors"
                      title="Clique duas vezes para renomear"
                    >
                      Etapa {stageNumber} — {stage.title.replace(/^Etapa\s*\d+\s*[—–-]\s*/i, "")}
                    </span>
                  )}

                  <Badge variant="outline" className="text-[10px] text-white/40 border-white/10 py-0 shrink-0 font-mono">
                    {tasks.length} tarefa(s)
                  </Badge>
                </div>

                {/* Ações da Etapa */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    onClick={() => {
                      mutate((ws, ctx) => {
                        createTask(ws, ctx, stage.id, "Nova Tarefa");
                      });
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px] text-white/70 hover:text-white hover:bg-white/10 gap-1 rounded-lg"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="hidden sm:inline">Adicionar Tarefa</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-7 w-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#12161F] border-white/10 text-white text-xs w-44">
                      <DropdownMenuItem
                        onClick={() => startEditTitle(stage.id, stage.title)}
                        className="cursor-pointer"
                      >
                        Renomear Etapa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => mutate((ws, ctx) => duplicateStage(ws, ctx, stage.id))}
                        className="cursor-pointer"
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Duplicar Etapa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem
                        onClick={() => mutate((ws, ctx) => archiveStage(ws, ctx, stage.id))}
                        className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Excluir Etapa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Lista de Tarefas da Etapa */}
              {isStageExpanded && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleTaskDrop(stage.id, tasks.length)}
                  className="p-2.5 space-y-1.5"
                >
                  {tasks.length === 0 ? (
                    <div className="p-3 text-center text-xs text-white/30 border border-dashed border-white/5 rounded-xl">
                      Nenhuma tarefa nesta etapa.
                    </div>
                  ) : (
                    tasks.map((task, taskIdx) => {
                      const subtasks = subtasksOf(workspace, task.id);
                      const isTaskExpanded = expandedTasks[task.id] ?? false;
                      const assignee = task.assigneeId ? workspace.members[task.assigneeId] : null;

                      return (
                        <div
                          key={task.id}
                          draggable={interactionMode === "organize"}
                          onDragStart={() => setDraggedTaskId(task.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.stopPropagation();
                            handleTaskDrop(stage.id, taskIdx);
                          }}
                          className={`rounded-xl border transition-all ${
                            task.status === "done"
                              ? "bg-white/[0.02] border-white/5 text-white/50"
                              : task.status === "doing"
                              ? "bg-amber-500/[0.03] border-amber-500/20 text-white"
                              : "bg-black/30 border-white/5 hover:border-white/15 text-white"
                          }`}
                        >
                          {/* Linha Principal da Tarefa (80/20: status, título, prioridade, responsável direto, duração, checklist) */}
                          <div className="p-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              {interactionMode === "organize" && (
                                <GripVertical className="h-3.5 w-3.5 text-white/20 shrink-0 cursor-grab" />
                              )}

                              {/* Status Toggle Rápido */}
                              <button
                                onClick={() => {
                                  const next: TaskStatus =
                                    task.status === "pending"
                                      ? "doing"
                                      : task.status === "doing"
                                      ? "done"
                                      : "pending";
                                  setTaskStatusAction(task.id, next);
                                }}
                                className="text-sm shrink-0 hover:scale-110 transition-transform"
                                title={`Status atual: ${task.status}. Clique para alternar.`}
                              >
                                {STATUS_ICON[task.status]}
                              </button>

                              {/* Título com Edição Inline ou Clique para Abrir */}
                              {editingTitleId === task.id ? (
                                <Input
                                  value={editingTitleText}
                                  onChange={(e) => setEditingTitleText(e.target.value)}
                                  onBlur={() => commitEditTitle("task", task.id)}
                                  onKeyDown={(e) => e.key === "Enter" && commitEditTitle("task", task.id)}
                                  autoFocus
                                  className="h-7 text-xs font-medium bg-black border-primary text-white"
                                />
                              ) : (
                                <span
                                  onDoubleClick={() => startEditTitle(task.id, task.title)}
                                  onClick={() => {
                                    setSelectedTaskId(task.id);
                                    setIsTaskModalOpen(true);
                                  }}
                                  className={`text-xs font-semibold truncate cursor-pointer hover:text-primary transition-colors ${
                                    task.status === "done" ? "line-through text-white/40" : "text-white/90"
                                  }`}
                                >
                                  {task.title}
                                </span>
                              )}

                              {/* Prioridade */}
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-black py-0 px-1.5 shrink-0 ${
                                  task.priority === "P0"
                                    ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                    : task.priority === "P1"
                                    ? "bg-orange-500/10 text-orange-300 border-orange-500/30"
                                    : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                                }`}
                              >
                                {task.priority}
                              </Badge>

                              {/* SEÇÃO 11: ATRIBUIÇÃO DIRETA DE RESPONSÁVEL COM 1 CLIQUE */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={`text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 ${
                                      assignee
                                        ? "bg-white/5 hover:bg-white/10 text-white/80"
                                        : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20"
                                    }`}
                                    title="Clique para atribuir ou trocar responsável"
                                  >
                                    <User className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[120px]">
                                      {assignee?.name || "Sem atribuição"}
                                    </span>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="bg-[#12161F] border-white/10 text-white text-xs w-56 p-1.5 rounded-xl shadow-xl">
                                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-white/40">
                                    Atribuir Responsável
                                  </div>
                                  <DropdownMenuSeparator className="bg-white/10" />

                                  {/* Opção Desatribuir */}
                                  <DropdownMenuItem
                                    onClick={() => assignTaskMemberAction(task.id, null)}
                                    className="cursor-pointer text-white/50 hover:text-white"
                                  >
                                    <UserX className="h-3.5 w-3.5 mr-2 text-white/40" />
                                    <span>Sem atribuição (Remover)</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator className="bg-white/10" />

                                  {/* Lista de Membros da Empresa */}
                                  {members.map((m) => (
                                    <DropdownMenuItem
                                      key={m.id}
                                      onClick={() => assignTaskMemberAction(task.id, m.id)}
                                      className="cursor-pointer flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <User className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <span className="truncate">{m.name}</span>
                                      </div>
                                      {task.assigneeId === m.id && (
                                        <UserCheck className="h-3 w-3 text-emerald-400 shrink-0" />
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {/* Duração Estimada */}
                              {task.durationMinutes && (
                                <span className="text-[10px] font-mono text-white/40 shrink-0 hidden sm:flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {fmtMinutes(task.durationMinutes)}
                                </span>
                              )}
                            </div>

                            {/* Ações da Tarefa */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Subtarefas Checklist Concluído/Total */}
                              {subtasks.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleTask(task.id)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
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

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="h-6 w-6 rounded hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white">
                                    <MoreVertical className="h-3 w-3" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#12161F] border-white/10 text-white text-xs w-40">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTaskId(task.id);
                                      setIsTaskModalOpen(true);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    Ver Detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => startEditTitle(task.id, task.title)}
                                    className="cursor-pointer"
                                  >
                                    Renomear
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      mutate((ws, ctx) => {
                                        createSubtask(ws, ctx, task.id, "Nova Subtarefa");
                                      });
                                      setExpandedTasks((p) => ({ ...p, [task.id]: true }));
                                    }}
                                    className="cursor-pointer"
                                  >
                                    + Adicionar Subtarefa
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/10" />
                                  <DropdownMenuItem
                                    onClick={() => mutate((ws, ctx) => archiveTask(ws, ctx, task.id))}
                                    className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Excluir Tarefa
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Seção Expandida da Tarefa (Divulgação Progressiva) */}
                          {isTaskExpanded && (
                            <div className="p-3 bg-black/40 border-t border-white/5 space-y-2 text-xs">
                              {task.description && (
                                <p className="text-white/60 text-[11px] leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              {/* Subtarefas */}
                              <div className="space-y-1.5 pt-1">
                                {subtasks.map((st) => (
                                  <div
                                    key={st.id}
                                    className="flex items-center justify-between p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] text-[11px]"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleSubtaskAction(st.id, !st.done)}
                                      className="flex items-center gap-2 text-left flex-1 min-w-0"
                                    >
                                      {st.done ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                      ) : (
                                        <Circle className="h-3.5 w-3.5 text-white/30 shrink-0" />
                                      )}
                                      <span className={st.done ? "line-through text-white/40" : "text-white/80"}>
                                        {st.title}
                                      </span>
                                    </button>
                                  </div>
                                ))}
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
        })
      )}

      {/* Botão no Rodapé para Adicionar Nova Etapa */}
      {stages.length > 0 && (
        <div className="pt-2 flex justify-center">
          <Button
            onClick={() => {
              mutate((ws, ctx) => {
                const nextNum = (stages.length + 1).toString().padStart(2, "0");
                createStage(ws, ctx, activeSprintId, `Etapa ${nextNum} — Nova Etapa`);
              });
            }}
            variant="outline"
            size="sm"
            className="text-xs bg-zinc-900/60 border-dashed border-white/10 hover:border-white/30 text-white/60 hover:text-white rounded-xl flex items-center gap-1.5 px-4 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar Nova Etapa</span>
          </Button>
        </div>
      )}
    </div>
  );
};
