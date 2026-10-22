/**
 * Modal de Detalhes da Tarefa — Estilo Trello Puro (AJ-024 / UX Refactor).
 *
 * Estrutura:
 * - Cabeçalho limpo com Seletor de Etapa e Status
 * - Título em destaque com checkbox de conclusão direta
 * - Barra de ações rápidas estilo Trello: [🏷️ Etiquetas] [☑️ Checklist] [🕒 Datas] [👤 Membros] [▶️ Play]
 * - Coluna Principal (Esquerda):
 *   - ≡ Descrição expansível e editável
 *   - ☑️ Lista de verificação (Checklist) com Barra de Progresso Dinâmica
 * - Coluna Lateral (Direita):
 *   - Card Info: Responsável, Prioridade, Prazo e Cronômetro em tempo real
 *   - 💬 Comentários e Atividades
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  User,
  AlignLeft,
  CheckSquare,
  MessageSquare,
  Play,
  Pause,
  X,
  ChevronDown,
  Timer,
  Check,
  Tag,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { useAuth } from "@/contexts/AuthContext";
import { LabelsManagerPopover } from "../kanban/LabelsManagerPopover";
import {
  subtasksOf,
  stagesOf,
  updateTask,
  setTaskStatus,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  toggleSubtask,
  startTaskSession,
  pauseTaskSession,
  concludeTaskWithSession,
  getTaskAccumulatedSeconds,
  getTaskActiveSession,
} from "../../domain/ops";
import type { TaskStatus, Priority, Task } from "../../domain/types";
import { fmtDateTime } from "../../scheduler/time";

export const TaskDetailModal: React.FC = () => {
  const {
    workspace,
    activeSprintId,
    selectedTaskId,
    isTaskModalOpen,
    setIsTaskModalOpen,
    setTaskStatusAction,
    moveTaskAction,
    mutate,
  } = useSprintOSStore();

  const { user } = useAuth();

  // Estados locais de edição
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState("");

  // Subtarefas / Checklist
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");

  // Comentários
  const [newCommentText, setNewCommentText] = useState("");

  // Cronômetro local para tick
  const [, setTick] = useState(0);

  const task = selectedTaskId && workspace?.tasks ? workspace.tasks[selectedTaskId] : null;

  useEffect(() => {
    if (task) {
      setTitleInput(task.title);
      setDescInput(task.description || "");
    }
  }, [task?.id, task?.title, task?.description]);

  // Tick a cada segundo se o cronômetro estiver rodando
  useEffect(() => {
    if (!task) return;
    const active = getTaskActiveSession(task);
    if (!active || active.status !== "active") return;
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [task]);

  if (!workspace || !activeSprintId || !task) return null;

  const stage = workspace.stages[task.stageId];
  const stagesList = stagesOf(workspace, activeSprintId);
  const subtasks = subtasksOf(workspace, task.id);
  const members = Object.values(workspace.members || {}).filter((m) => !m.archivedAt);
  const assignee = task.assigneeId ? workspace.members[task.assigneeId] : null;

  // Cálculo de Progresso do Checklist
  const completedSubtasksCount = subtasks.filter((s) => s.done).length;
  const totalSubtasksCount = subtasks.length;
  const checklistPercent =
    totalSubtasksCount > 0
      ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100)
      : 0;

  // Cronômetro
  const activeSession = getTaskActiveSession(task);
  const isRunning = Boolean(activeSession && activeSession.status === "active");
  const accumulatedSeconds = getTaskAccumulatedSeconds(task);

  const formatTimerTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Handlers de Tarefa
  const handleSaveTitle = async () => {
    if (titleInput.trim() && titleInput.trim() !== task.title) {
      await mutate((ws, ctx) => {
        updateTask(ws, ctx, task.id, { title: titleInput.trim() });
      }, user?.email || "Operador");
      toast.success("Título atualizado!");
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = async () => {
    await mutate((ws, ctx) => {
      updateTask(ws, ctx, task.id, { description: descInput.trim() });
    }, user?.email || "Operador");
    setIsEditingDesc(false);
    toast.success("Descrição salva!");
  };

  const handleToggleTaskStatus = async () => {
    const nextStatus: TaskStatus =
      task.status === "pending" ? "doing" : task.status === "doing" ? "done" : "pending";
    await mutate((ws, ctx) => {
      setTaskStatus(ws, ctx, task.id, nextStatus);
    }, user?.email || "Operador");
    toast.success(`Status alterado para ${nextStatus === "done" ? "Concluída" : nextStatus === "doing" ? "Fazendo" : "Pendente"}`);
  };

  // Handlers de Checklist
  const handleToggleSubtask = async (subtaskId: string, currentDone: boolean) => {
    await mutate((ws, ctx) => {
      toggleSubtask(ws, ctx, subtaskId, !currentDone);
    }, user?.email || "Operador");
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    await mutate((ws, ctx) => {
      createSubtask(ws, ctx, task.id, newSubtaskTitle.trim());
    }, user?.email || "Operador");
    setNewSubtaskTitle("");
    setIsAddingSubtask(false);
    toast.success("Item adicionado ao checklist!");
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    await mutate((ws, ctx) => {
      deleteSubtask(ws, ctx, subtaskId);
    }, user?.email || "Operador");
    toast.info("Item removido.");
  };

  const handleStartEditSubtask = (subtaskId: string, currentTitle: string) => {
    setEditingSubtaskId(subtaskId);
    setEditingSubtaskTitle(currentTitle);
  };

  const handleCommitEditSubtask = async (subtaskId: string) => {
    if (!editingSubtaskId) return;
    const trimmed = editingSubtaskTitle.trim();
    const existing = subtasks.find((s) => s.id === subtaskId);
    if (trimmed && trimmed !== existing?.title) {
      try {
        await mutate((ws, ctx) => {
          updateSubtask(ws, ctx, subtaskId, { title: trimmed });
        }, user?.email || "Operador");
        toast.success("Item do checklist atualizado!");
      } catch (err: any) {
        toast.error(err.message || "Erro ao atualizar item");
      }
    }
    setEditingSubtaskId(null);
    setEditingSubtaskTitle("");
  };

  // Handlers de Cronômetro
  const handleStartTimer = async () => {
    await mutate((ws, ctx) => {
      startTaskSession(ws, ctx, task.id);
    }, user?.email || "Operador");
    toast.success("Cronômetro iniciado!");
  };

  const handlePauseTimer = async () => {
    await mutate((ws, ctx) => {
      pauseTaskSession(ws, ctx, task.id);
    }, user?.email || "Operador");
    toast.info("Cronômetro pausado.");
  };

  const handleConcludeTask = async () => {
    await mutate((ws, ctx) => {
      concludeTaskWithSession(ws, ctx, task.id);
    }, user?.email || "Operador");
    toast.success("Tarefa concluída!");
  };

  // Handlers de Comentário
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const author = user?.email || "Operador";
    const timestamp = new Date().toISOString();
    const commentEntry = `\n\n💬 [${fmtDateTime(timestamp)} por ${author}]: ${newCommentText.trim()}`;
    const updatedNotes = (task.notes || "") + commentEntry;

    await mutate((ws, ctx) => {
      updateTask(ws, ctx, task.id, { notes: updatedNotes });
    }, author);

    setNewCommentText("");
    toast.success("Comentário adicionado!");
  };

  return (
    <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-3xl bg-card border border-border shadow-2xl text-card-foreground max-h-[90vh] flex flex-col">
        {/* CABEÇALHO TRELLO */}
        <div className="p-5 pb-3 border-b border-border/60 bg-muted/20">
          {/* Linha Superior: Seletor de Etapa e Status */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-muted-foreground font-medium">Na lista:</span>
              <select
                value={task.stageId}
                onChange={(e) => {
                  const newStageId = e.target.value;
                  if (newStageId && newStageId !== task.stageId) {
                    moveTaskAction(task.id, newStageId, 0);
                  }
                }}
                className="bg-muted border border-border rounded-lg px-2 py-0.5 font-bold text-foreground cursor-pointer focus:outline-hidden text-xs"
                title="Mover para outra Etapa"
              >
                {stagesList.map((s) => (
                  <option key={s.id} value={s.id} className="bg-popover text-popover-foreground">
                    {s.title}
                  </option>
                ))}
              </select>

              <span className="text-muted-foreground/40">•</span>

              <select
                value={task.status}
                onChange={(e) => setTaskStatusAction(task.id, e.target.value as TaskStatus)}
                className={`font-bold rounded-lg px-2 py-0.5 border text-xs cursor-pointer focus:outline-hidden ${
                  task.status === "done"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : task.status === "doing"
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                }`}
                title="Alterar Status"
              >
                <option value="pending" className="bg-popover text-popover-foreground">🔴 Pendente</option>
                <option value="doing" className="bg-popover text-popover-foreground">🟡 Fazendo</option>
                <option value="done" className="bg-popover text-popover-foreground">🟢 Concluída</option>
              </select>
            </div>
          </div>

          {/* Título Principal com Checkbox de Conclusão Direta */}
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={handleToggleTaskStatus}
              className="mt-1 text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
              title={task.status === "done" ? "Marcar como pendente" : "Marcar como concluída"}
            >
              {task.status === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/60" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveTitle();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    autoFocus
                    className="text-base font-bold bg-background border-primary text-foreground h-9 rounded-xl"
                  />
                  <Button size="sm" onClick={handleSaveTitle} className="h-9 px-3 rounded-xl font-bold">
                    Salvar
                  </Button>
                </div>
              ) : (
                <h2
                  onClick={() => setIsEditingTitle(true)}
                  className={`text-base sm:text-lg font-bold text-foreground cursor-pointer hover:bg-muted/40 p-1 -m-1 rounded-xl transition-colors ${
                    task.status === "done" ? "line-through text-muted-foreground" : ""
                  }`}
                  title="Clique para editar título"
                >
                  {task.title}
                </h2>
              )}
            </div>
          </div>

          {/* BARRA DE AÇÕES RÁPIDAS ESTILO TRELLO */}
          <div className="flex items-center gap-1.5 flex-wrap pt-3">
            {/* Etiquetas */}
            <LabelsManagerPopover
              taskId={task.id}
              assignedLabelIds={task.labelIds || []}
            />

            {/* Checklist */}
            <button
              type="button"
              onClick={() => setIsAddingSubtask(true)}
              className="h-7 px-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-[11px] font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5 text-primary" />
              <span>Lista de verificação</span>
            </button>

            {/* Prazo */}
            <div className="relative">
              <label
                className="h-7 px-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-[11px] font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span>{task.plannedEnd ? fmtDateTime(task.plannedEnd).split(" ")[0] : "Datas"}</span>
                <input
                  type="date"
                  value={task.plannedEnd ? task.plannedEnd.slice(0, 10) : ""}
                  onChange={(e) => {
                    mutate((ws, ctx) => {
                      updateTask(ws, ctx, task.id, {
                        plannedEnd: e.target.value ? `${e.target.value}T18:00:00` : null,
                      });
                    }, user?.email || "Operador");
                  }}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full"
                />
              </label>
            </div>

            {/* Membros */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-7 px-2.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-[11px] font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <User className="h-3.5 w-3.5 text-amber-500" />
                  <span>{assignee ? assignee.name.split(" ")[0] : "Membro"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 p-1 rounded-xl text-xs">
                <DropdownMenuItem
                  onClick={() => {
                    mutate((ws, ctx) => {
                      updateTask(ws, ctx, task.id, { assigneeId: null });
                    }, user?.email || "Operador");
                  }}
                  className="cursor-pointer"
                >
                  Sem atribuição
                </DropdownMenuItem>
                {members.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => {
                      mutate((ws, ctx) => {
                        updateTask(ws, ctx, task.id, { assigneeId: m.id });
                      }, user?.email || "Operador");
                    }}
                    className="cursor-pointer font-medium"
                  >
                    {m.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Play / Pause Cronômetro */}
            {isRunning ? (
              <button
                type="button"
                onClick={handlePauseTimer}
                className="h-7 px-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
                title="Pausar cronômetro"
              >
                <Pause className="h-3 w-3" />
                <span>{formatTimerTime(accumulatedSeconds)}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartTimer}
                className="h-7 px-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Iniciar cronômetro"
              >
                <Play className="h-3 w-3 fill-primary" />
                <span>{accumulatedSeconds > 0 ? formatTimerTime(accumulatedSeconds) : "Iniciar"}</span>
              </button>
            )}
          </div>

          {/* ETIQUETAS DO CARD SE HOUVER */}
          {(task.labelIds || []).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              {(task.labelIds || []).map((id) => {
                const lbl = workspace.labels?.[id];
                if (!lbl) return null;
                return (
                  <span
                    key={lbl.id}
                    className="px-2 py-0.5 rounded-md border text-[10px] font-bold"
                    style={{
                      backgroundColor: `${lbl.color}15`,
                      borderColor: `${lbl.color}40`,
                      color: lbl.color,
                    }}
                  >
                    {lbl.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* CORPO DO CARD EM 2 COLUNAS (ESTILO TRELLO) */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* COLUNA ESQUERDA (PRINCIPAL - 2/3 DA LARGURA) */}
          <div className="md:col-span-2 space-y-6">
            {/* 1. SEÇÃO DESCRIÇÃO */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <AlignLeft className="h-4 w-4 text-muted-foreground" />
                <span>Descrição</span>
              </div>

              {isEditingDesc ? (
                <div className="space-y-2">
                  <Textarea
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    placeholder="Adicione uma descrição mais detalhada..."
                    className="text-xs bg-background border-input text-foreground min-h-[90px] rounded-xl leading-relaxed p-3 focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleSaveDescription} className="h-7 text-xs font-bold rounded-lg">
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDescInput(task.description || "");
                        setIsEditingDesc(false);
                      }}
                      className="h-7 text-xs rounded-lg"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingDesc(true)}
                  className={`p-3 rounded-xl border border-transparent hover:border-border cursor-pointer transition-all text-xs leading-relaxed ${
                    task.description
                      ? "bg-muted/30 text-foreground whitespace-pre-wrap"
                      : "bg-muted/20 text-muted-foreground italic hover:bg-muted/40"
                  }`}
                  title="Clique para editar descrição"
                >
                  {task.description || "Adicione uma descrição mais detalhada..."}
                </div>
              )}
            </div>

            {/* 2. SEÇÃO LISTA DE VERIFICAÇÃO (CHECKLIST TRELLO) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span>Lista de verificação</span>
                  {totalSubtasksCount > 0 && (
                    <span className="text-[11px] font-mono text-muted-foreground lowercase">
                      ({completedSubtasksCount}/{totalSubtasksCount})
                    </span>
                  )}
                </div>

                {totalSubtasksCount > 0 && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      checklistPercent === 100
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {checklistPercent}%
                  </span>
                )}
              </div>

              {/* Barra de Progresso Animada do Checklist */}
              {totalSubtasksCount > 0 && (
                <div className="w-full bg-muted/60 dark:bg-muted/40 rounded-full h-1.5 overflow-hidden border border-border/30">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      checklistPercent === 100
                        ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                        : "bg-primary"
                    }`}
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
              )}

              {/* Lista de Itens do Checklist com Edição por Duplo Clique */}
              <div className="space-y-1">
                {subtasks.map((st) => {
                  const isEditingThis = editingSubtaskId === st.id;

                  return (
                    <div
                      key={st.id}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-muted/30 group transition-colors text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id, st.done)}
                        className="text-muted-foreground hover:text-emerald-500 transition-colors cursor-pointer shrink-0"
                        title={st.done ? "Marcar como pendente" : "Marcar como concluído"}
                      >
                        {st.done ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/60 hover:text-emerald-500" />
                        )}
                      </button>

                      {isEditingThis ? (
                        <div className="flex-1 min-w-0">
                          <Input
                            value={editingSubtaskTitle}
                            onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                            onBlur={() => handleCommitEditSubtask(st.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCommitEditSubtask(st.id);
                              }
                              if (e.key === "Escape") {
                                setEditingSubtaskId(null);
                                setEditingSubtaskTitle("");
                              }
                            }}
                            autoFocus
                            className="h-7 text-xs px-2 bg-background border-primary text-foreground rounded-md w-full shadow-xs"
                          />
                        </div>
                      ) : (
                        <span
                          onDoubleClick={() => handleStartEditSubtask(st.id, st.title)}
                          className={`flex-1 cursor-text leading-tight select-text transition-colors hover:text-primary ${
                            st.done
                              ? "line-through text-muted-foreground"
                              : "text-foreground font-medium"
                          }`}
                          title="Duplo clique para editar este item do checklist"
                        >
                          {st.title}
                        </span>
                      )}

                      {!isEditingThis && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditSubtask(st.id, st.title)}
                            className="p-1 text-muted-foreground hover:text-primary rounded transition-colors cursor-pointer"
                            title="Editar item (ou dê 2 cliques no texto)"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSubtask(st.id)}
                            className="p-1 text-muted-foreground hover:text-rose-500 rounded transition-colors cursor-pointer"
                            title="Excluir item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Formulário para Adicionar Item */}
              {isAddingSubtask ? (
                <form onSubmit={handleCreateSubtask} className="space-y-2 pt-1">
                  <Input
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Adicionar um item..."
                    className="text-xs bg-background border-input text-foreground h-8 rounded-lg"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <Button type="submit" size="sm" className="h-7 text-xs font-bold rounded-lg">
                      Adicionar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddingSubtask(false)}
                      className="h-7 text-xs rounded-lg"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingSubtask(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Adicionar um item</span>
                </button>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA (SIDEBAR DE INFORMAÇÕES E ATIVIDADE - 1/3 DA LARGURA) */}
          <div className="space-y-5 border-t md:border-t-0 md:border-l border-border/60 md:pl-5">
            {/* Box de Informações Rápidas */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-muted/20 border border-border/50 text-xs">
              {/* Prioridade */}
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Prioridade
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => {
                    mutate((ws, ctx) => {
                      updateTask(ws, ctx, task.id, { priority: e.target.value as Priority });
                    }, user?.email || "Operador");
                  }}
                  className="w-full bg-background border border-input rounded-lg px-2 py-1 text-xs font-bold text-foreground cursor-pointer"
                >
                  <option value="P0" className="text-rose-600">🔴 P0 — Urgente</option>
                  <option value="P1" className="text-amber-600">🟠 P1 — Importante</option>
                  <option value="P2" className="text-yellow-600">🟡 P2 — Útil</option>
                  <option value="P3" className="text-slate-500">⚪ P3 — Baixa</option>
                </select>
              </div>

              {/* Responsável */}
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                  Responsável
                </label>
                <div className="flex items-center gap-2 text-foreground font-medium bg-background p-1.5 rounded-lg border border-input">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{assignee?.name || "Sem atribuição"}</span>
                </div>
              </div>

              {/* Prazo */}
              {task.plannedEnd && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                    Prazo de Entrega
                  </label>
                  <div className="flex items-center gap-2 text-foreground font-mono bg-background p-1.5 rounded-lg border border-input text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{fmtDateTime(task.plannedEnd)}</span>
                  </div>
                </div>
              )}

              {/* Ação Concluir Tarefa */}
              <div className="pt-1">
                <Button
                  onClick={task.status === "done" ? handleToggleTaskStatus : handleConcludeTask}
                  className={`w-full text-xs font-bold rounded-xl h-8 gap-1.5 ${
                    task.status === "done"
                      ? "bg-muted text-muted-foreground hover:bg-muted/80"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{task.status === "done" ? "Reabrir Tarefa" : "Concluir Tarefa"}</span>
                </Button>
              </div>
            </div>

            {/* SEÇÃO COMENTÁRIOS E ATIVIDADES */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span>Atividades & Notas</span>
              </div>

              {/* Campo para Adicionar Comentário */}
              <form onSubmit={handleAddComment} className="space-y-2">
                <Input
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="Escreva um comentário..."
                  className="text-xs bg-background border-input text-foreground h-8 rounded-xl"
                />
                {newCommentText.trim() && (
                  <Button type="submit" size="sm" className="h-7 text-xs font-bold rounded-lg">
                    Comentar
                  </Button>
                )}
              </form>

              {/* Histórico de Sessões de Cronômetro e Comentários */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                {/* Notas/Comentários Registrados */}
                {task.notes && (
                  <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40 text-muted-foreground leading-relaxed whitespace-pre-wrap text-[11px]">
                    {task.notes}
                  </div>
                )}

                {/* Sessões de Trabalho Concluídas */}
                {(task.workSessions || []).length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Sessões Registradas ({(task.workSessions || []).length})
                    </span>
                    {(task.workSessions || []).map((ws, i) => (
                      <div
                        key={ws.id || i}
                        className="p-2 rounded-lg bg-muted/30 border border-border/30 text-[11px] flex items-center justify-between"
                      >
                        <div className="flex items-center gap-1.5">
                          <Timer className="h-3 w-3 text-primary" />
                          <span className="font-semibold text-foreground">
                            {formatTimerTime(ws.durationSeconds || 0)}
                          </span>
                          <span className="text-muted-foreground text-[10px]">
                            por {ws.actorName || "Operador"}
                          </span>
                        </div>
                        {ws.startedAt && (
                          <span className="text-[10px] text-muted-foreground/60 font-mono">
                            {fmtDateTime(ws.startedAt).split(" ")[1]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Criação da Tarefa */}
                <div className="text-[10px] text-muted-foreground/60 pt-1 flex items-center gap-1">
                  <span>Criada em {fmtDateTime(task.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
