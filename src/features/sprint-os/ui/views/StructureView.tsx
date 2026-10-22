/**
 * Visão Estrutura em Blocos do Sprint OS (Cockpit 80/20).
 * Especificação: Master Prompt v9.0 + Otimização — Seções 6, 7, 10, 11 e 12.
 * - Drag & Drop funcional das etapas com renumeração dinâmica automática (sort_order)
 * - Flags de impacto (até 3 flags simultâneas por tarefa)
 * - Atribuição direta inline de responsável (1 clique)
 * - Cronômetro / Pomodoro individual acionável diretamente na linha
 * - Duração manual: exibe "Duração: Não definida" se não configurada
 */

import React, { useState, useRef } from "react";
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
  Edit2,
  Clock,
  User,
  AlertTriangle,
  DollarSign,
  CheckSquare,
  Search,
  UserCheck,
  UserX,
  Play,
  Pause,
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
} from "../../domain/ops";
import {
  PRIORITY_LABEL,
  STATUS_ICON,
  IMPACT_FLAG_CONFIG,
  type TaskStatus,
} from "../../domain/types";
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
    filterImpact,
    filterExpertDemands,
    filterOrigin,
    setSelectedTaskId,
    setIsTaskModalOpen,
    setTaskStatusAction,
    toggleSubtaskAction,
    updateSubtaskAction,
    deleteSubtaskAction,
    assignTaskMemberAction,
    reorderStagesAction,
    moveTaskAction,
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    mutate,
  } = useSprintOSStore();

  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState("");
  const clickTimeoutRef = useRef<any>(null);

  const handleTaskClick = (taskId: string) => {
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

  const handleTaskDoubleClick = (taskId: string, title: string) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setIsTaskModalOpen(false);
    startEditTitle(taskId, title);
  };
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<string, string>>({});

  // Drag & Drop
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
    setEditingTitleText(current.replace(/^Etapa\s*\d+\s*[—–-]\s*/i, ""));
  };

  const commitEditTitle = (type: "stage" | "task", id: string) => {
    if (!editingTitleText.trim()) {
      setEditingTitleId(null);
      return;
    }
    const clean = editingTitleText.trim().replace(/^Etapa\s*\d+\s*[—–-]\s*/i, "");
    mutate((ws, ctx) => {
      if (type === "stage") renameStage(ws, ctx, id, clean);
      else updateTask(ws, ctx, id, { title: clean });
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

  const moveStageDirection = (stageId: string, direction: "up" | "down") => {
    const stageIds = stages.map((s) => s.id);
    const idx = stageIds.indexOf(stageId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= stageIds.length) return;

    const temp = stageIds[idx];
    stageIds[idx] = stageIds[targetIdx];
    stageIds[targetIdx] = temp;
    reorderStagesAction(stageIds);
  };

  return (
    <div className="space-y-4">
      {/* Estado Vazio para Cronogramas em Branco */}
      {stages.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3">
            <Plus className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Nenhuma etapa cadastrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
            Este cronograma está em branco. Comece adicionando a primeira etapa da sua implementação.
          </p>
          <Button
            onClick={() => {
              mutate((ws, ctx) => {
                createStage(ws, ctx, activeSprintId, "Planejamento Inicial");
              });
            }}
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-4 py-2 rounded-xl flex items-center gap-1.5"
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
          if (filterImpact) tasks = tasks.filter((t) => t.impactFlags?.includes(filterImpact));
          if (filterExpertDemands) tasks = tasks.filter((t) => t.expertDemand?.isExpertDemand);
          if (filterOrigin) tasks = tasks.filter((t) => (t.origin || "defined") === filterOrigin);

          const isStageExpanded = expandedStages[stage.id] ?? true;
          // Numeração dinâmica da etapa (Seção 6)
          const stageNumber = (stageIdx + 1).toString().padStart(2, "0");
          const cleanStageTitle = stage.title.replace(/^Etapa\s*\d+\s*[—–-]\s*/i, "");

          return (
            <div
              key={stage.id}
              draggable
              onDragStart={() => setDraggedStageId(stage.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleStageDrop(stage.id)}
              className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm transition-all text-card-foreground"
            >
              {/* Cabeçalho da Etapa com Handle de Drag & Drop */}
              <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    onClick={() => toggleStage(stage.id)}
                    className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isStageExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div
                    title="Arraste para reordenar a etapa"
                    className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted text-muted-foreground/30 hover:text-foreground"
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {editingTitleId === stage.id ? (
                    <Input
                      value={editingTitleText}
                      onChange={(e) => setEditingTitleText(e.target.value)}
                      onBlur={() => commitEditTitle("stage", stage.id)}
                      onKeyDown={(e) => e.key === "Enter" && commitEditTitle("stage", stage.id)}
                      autoFocus
                      className="h-7 text-xs font-bold uppercase tracking-wider bg-background border-primary text-foreground"
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startEditTitle(stage.id, cleanStageTitle)}
                      className="text-xs font-bold uppercase tracking-wider text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                      title="Clique duas vezes para renomear"
                    >
                      ETAPA {stageNumber} — {cleanStageTitle}
                    </span>
                  )}

                  <Badge variant="outline" className="text-[10px] text-muted-foreground border-border bg-muted/40 py-0 shrink-0 font-mono">
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
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted gap-1 rounded-lg"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="hidden sm:inline">Adicionar Tarefa</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground text-xs w-44 shadow-lg">
                      <DropdownMenuItem
                        disabled={stageIdx === 0}
                        onClick={() => moveStageDirection(stage.id, "up")}
                        className="cursor-pointer"
                      >
                        <ArrowUp className="h-3.5 w-3.5 mr-2" />
                        Mover para Cima
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={stageIdx === stages.length - 1}
                        onClick={() => moveStageDirection(stage.id, "down")}
                        className="cursor-pointer"
                      >
                        <ArrowDown className="h-3.5 w-3.5 mr-2" />
                        Mover para Baixo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => startEditTitle(stage.id, cleanStageTitle)}
                        className="cursor-pointer"
                      >
                        Renomear Etapa
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => mutate((ws, ctx) => duplicateStage(ws, ctx, stage.id))}
                        className="cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5 mr-2" />
                        Duplicar Etapa
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => mutate((ws, ctx) => archiveStage(ws, ctx, stage.id))}
                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
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
                    <div className="p-3 text-center text-xs text-muted-foreground/60 border border-dashed border-border rounded-xl">
                      Nenhuma tarefa nesta etapa.
                    </div>
                  ) : (
                    tasks.map((task, taskIdx) => {
                      const subtasks = subtasksOf(workspace, task.id);
                      const isTaskExpanded = expandedTasks[task.id] ?? false;
                      const assignee = task.assigneeId ? workspace.members[task.assigneeId] : null;
                      const isTimerRunning = activeTimer && activeTimer.taskId === task.id && activeTimer.isRunning;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDraggedTaskId(task.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.stopPropagation();
                            handleTaskDrop(stage.id, taskIdx);
                          }}
                          className={`rounded-xl border transition-all ${
                            task.status === "done"
                              ? "bg-muted/20 border-border text-muted-foreground"
                              : task.status === "doing"
                              ? "bg-amber-500/5 border-amber-500/20 text-foreground"
                              : "bg-card border-border hover:border-primary/30 text-foreground shadow-xs"
                          } ${
                            filterAssigneeId && task.assigneeId === filterAssigneeId
                              ? "ring-2 ring-primary/60 border-primary bg-primary/[0.04] shadow-md"
                              : ""
                          }`}
                        >
                          {/* Linha Principal da Tarefa (80/20) */}
                          <div className="p-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <div
                                title="Arraste para mover tarefa"
                                className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-foreground shrink-0"
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </div>

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
                                  className="h-7 text-xs font-medium bg-background border-primary text-foreground"
                                />
                              ) : (
                                <span
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleTaskDoubleClick(task.id, task.title);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskClick(task.id);
                                  }}
                                  className={`text-xs font-semibold truncate cursor-pointer hover:text-primary transition-colors ${
                                    task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"
                                  }`}
                                  title="Clique para abrir ou dois cliques para renomear"
                                >
                                  {task.title}
                                </span>
                              )}

                              {/* Prioridade */}
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-black py-0 px-1.5 shrink-0 ${
                                  task.priority === "P0"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30"
                                    : task.priority === "P1"
                                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/30"
                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30"
                                }`}
                              >
                                {task.priority}
                              </Badge>

                              {/* SEÇÃO 7: FLAGS DE IMPACTO (Até 3 simultâneas) */}
                              {task.impactFlags && task.impactFlags.length > 0 && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {task.impactFlags.slice(0, 3).map((f) => (
                                    <span
                                      key={f}
                                      className="text-xs hover:scale-125 transition-transform cursor-help"
                                      title={IMPACT_FLAG_CONFIG[f]?.label}
                                    >
                                      {IMPACT_FLAG_CONFIG[f]?.icon}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* PATCH 002: Indicadores Discretos 7D */}
                              {task.blockInfo?.active && (
                                <span
                                  className="text-xs shrink-0 cursor-help"
                                  title={`Bloqueio Ativo: ${task.blockInfo.reason || "Pendente"}`}
                                >
                                  🚧
                                </span>
                              )}
                              {task.expertDemand?.isExpertDemand && (
                                <span
                                  className="text-xs shrink-0 cursor-help"
                                  title={`Demanda do Expert: ${task.expertDemand.category} (${task.expertDemand.status})`}
                                >
                                  👔
                                </span>
                              )}
                              {task.origin === "proposed" && (
                                <Badge
                                  variant="outline"
                                  className="text-[8px] font-mono py-0 px-1 border-dashed border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5 shrink-0"
                                >
                                  PROPOSTO
                                </Badge>
                              )}

                              {/* SEÇÃO 11: ATRIBUIÇÃO DIRETA DE RESPONSÁVEL COM 1 CLIQUE */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={`text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 ${
                                      assignee
                                        ? "bg-muted hover:bg-muted/80 text-foreground"
                                        : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/20"
                                    }`}
                                    title="Clique para atribuir ou trocar responsável"
                                  >
                                    <User className="h-3 w-3 shrink-0" />
                                    <span className="truncate max-w-[120px]">
                                      {assignee?.name || "Sem atribuição"}
                                    </span>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="bg-popover border-border text-popover-foreground text-xs w-56 p-1.5 rounded-xl shadow-xl">
                                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-muted-foreground">
                                    Atribuir Responsável
                                  </div>
                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    onClick={() => assignTaskMemberAction(task.id, null)}
                                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                                  >
                                    <UserX className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                    <span>Sem atribuição (Remover)</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

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
                                        <UserCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {/* SEÇÃO 12: DURAÇÃO MANUAL (NÃO DEFINIDA se nulo) */}
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0 hidden sm:flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                {task.durationMinutes ? fmtMinutes(task.durationMinutes) : "Duração: Não definida"}
                              </span>
                            </div>

                            {/* Ações da Tarefa */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* SEÇÃO 11: CRONÔMETRO RÁPIDO / POMODORO */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (activeTimer && activeTimer.taskId === task.id) {
                                    if (activeTimer.isRunning) pauseTimer();
                                    else resumeTimer();
                                  } else {
                                    startTimer(task.id, "stopwatch");
                                  }
                                }}
                                className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs transition-colors shrink-0 ${
                                  isTimerRunning
                                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/40 animate-pulse"
                                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                                }`}
                                title={
                                  isTimerRunning
                                    ? "Pausar cronômetro"
                                    : "Iniciar cronômetro desta tarefa"
                                }
                              >
                                {isTimerRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </button>

                              {/* Subtarefas Checklist Concluído/Total */}
                              {subtasks.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleTask(task.id)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-mono bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
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
                                  <button className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="h-3 w-3" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground text-xs w-40 shadow-lg">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedTaskId(task.id);
                                      setIsTaskModalOpen(true);
                                    }}
                                    className="cursor-pointer"
                                  >
                                    Ver Detalhes / Flags
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
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => mutate((ws, ctx) => archiveTask(ws, ctx, task.id))}
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
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
                            <div className="p-3 bg-muted/30 border-t border-border space-y-2 text-xs">
                              {task.description && (
                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              {/* Subtarefas / Checklist */}
                              <div className="space-y-1.5 pt-1">
                                {subtasks.map((st) => (
                                  <div
                                    key={st.id}
                                    className="flex items-center justify-between p-1.5 rounded-lg bg-card/60 hover:bg-card border border-border/50 text-[11px] gap-2"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleSubtaskAction(st.id, !st.done)}
                                      className="shrink-0"
                                    >
                                      {st.done ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                                      )}
                                    </button>

                                    {editingSubtaskId === st.id ? (
                                      <Input
                                        value={editingSubtaskTitle}
                                        onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                        onBlur={() => {
                                          if (editingSubtaskTitle.trim() && editingSubtaskTitle !== st.title) {
                                            updateSubtaskAction(st.id, { title: editingSubtaskTitle.trim() });
                                          }
                                          setEditingSubtaskId(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            if (editingSubtaskTitle.trim() && editingSubtaskTitle !== st.title) {
                                              updateSubtaskAction(st.id, { title: editingSubtaskTitle.trim() });
                                            }
                                            setEditingSubtaskId(null);
                                          }
                                        }}
                                        autoFocus
                                        className="h-6 text-[11px] bg-background border-primary text-foreground flex-1"
                                      />
                                    ) : (
                                      <span
                                        onDoubleClick={() => {
                                          setEditingSubtaskId(st.id);
                                          setEditingSubtaskTitle(st.title);
                                        }}
                                        onClick={() => toggleSubtaskAction(st.id, !st.done)}
                                        className={`flex-1 min-w-0 truncate cursor-pointer ${st.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}
                                        title="Clique para alternar ou duplo-clique para editar"
                                      >
                                        {st.title}
                                      </span>
                                    )}

                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingSubtaskId(st.id);
                                          setEditingSubtaskTitle(st.title);
                                        }}
                                        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded"
                                        title="Editar subtarefa"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => deleteSubtaskAction(st.id)}
                                        className="p-1 hover:bg-muted text-muted-foreground hover:text-destructive rounded"
                                        title="Excluir subtarefa"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {/* Input rápido para adicionar nova subtarefa */}
                                <div className="flex items-center gap-1.5 pt-1">
                                  <Input
                                    value={newSubtaskInputs[task.id] || ""}
                                    onChange={(e) => setNewSubtaskInputs((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && newSubtaskInputs[task.id]?.trim()) {
                                        mutate((ws, ctx) => {
                                          createSubtask(ws, ctx, task.id, newSubtaskInputs[task.id].trim());
                                        });
                                        setNewSubtaskInputs((prev) => ({ ...prev, [task.id]: "" }));
                                      }
                                    }}
                                    placeholder="+ Adicionar subtarefa..."
                                    className="h-6 text-[11px] bg-background border-input text-foreground flex-1"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (newSubtaskInputs[task.id]?.trim()) {
                                        mutate((ws, ctx) => {
                                          createSubtask(ws, ctx, task.id, newSubtaskInputs[task.id].trim());
                                        });
                                        setNewSubtaskInputs((prev) => ({ ...prev, [task.id]: "" }));
                                      }
                                    }}
                                    className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                                  >
                                    Salvar
                                  </Button>
                                </div>
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
                createStage(ws, ctx, activeSprintId, "Nova Etapa");
              });
            }}
            variant="outline"
            size="sm"
            className="text-xs bg-card border-dashed border-border hover:border-primary/40 text-muted-foreground hover:text-foreground rounded-xl flex items-center gap-1.5 px-4 h-8 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar Nova Etapa</span>
          </Button>
        </div>
      )}
    </div>
  );
};
