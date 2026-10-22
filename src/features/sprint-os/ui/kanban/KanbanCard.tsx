/**
 * Card Otimizado do Kanban com Cronômetro Real e Etiquetas Trello (AJ-022).
 * Padrão: ETAPA → TAREFA → SUBTAREFA
 * Controle real do tempo de execução:
 * PLAY → FAZENDO → CONTAGEM REAL → PAUSA → REGISTRO → RETOMADA → CONCLUSÃO → TEMPO TOTAL.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  User,
  MoreVertical,
  Edit2,
  Tag,
  Plus,
  ChevronDown,
  ChevronUp,
  Archive,
  Trash2,
  ExternalLink,
  ListTodo,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  subtasksOf,
  updateTask,
  deleteTask,
  archiveTask,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
  startTaskSession,
  pauseTaskSession,
  concludeTaskWithSession,
  getTaskActiveSession,
  getTaskAccumulatedSeconds,
  fmtStopwatch,
  fmtDurationSummary,
} from "../../domain/ops";
import type { Task, TaskStatus, Priority } from "../../domain/types";
import { LabelsManagerPopover } from "./LabelsManagerPopover";
import { fmtDateTime } from "../../scheduler/time";
import { toast } from "sonner";

interface KanbanCardProps {
  task: Task;
  onOpenDetails: (taskId: string) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  onOpenDetails,
}) => {
  const { workspace, mutate, setSelectedTaskId, setIsTaskModalOpen, setActiveBrandManualTarget } = useSprintOSStore();
  const { user } = useAuth();

  // Estados locais de edição inline do título
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleText, setTitleText] = useState(task.title);

  // Estados expansíveis do card
  const [showHistory, setShowHistory] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Estado do cronômetro em tempo real
  const [currentSeconds, setCurrentSeconds] = useState<number>(() =>
    getTaskAccumulatedSeconds(task)
  );

  const activeSession = getTaskActiveSession(task);
  const isRunning = Boolean(activeSession && activeSession.status === "active");
  const isPaused = Boolean(task.isPaused && task.status === "doing");
  const isDone = task.status === "done";
  const isPending = task.status === "pending";

  // Atualização a cada segundo enquanto houver sessão ativa
  useEffect(() => {
    let interval: any = null;
    if (isRunning && activeSession) {
      // Atualiza imediatamente
      setCurrentSeconds(getTaskAccumulatedSeconds(task));
      interval = setInterval(() => {
        setCurrentSeconds(getTaskAccumulatedSeconds(task));
      }, 1000);
    } else {
      setCurrentSeconds(getTaskAccumulatedSeconds(task));
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, activeSession?.startedAt, task.totalTimeSeconds, task.workSessions]);

  // Sincroniza título caso mude externamente
  useEffect(() => {
    setTitleText(task.title);
  }, [task.title]);

  if (!workspace) return null;

  const stage = workspace.stages[task.stageId];
  const subtasks = subtasksOf(workspace, task.id);
  const assignee = task.assigneeId ? workspace.members[task.assigneeId] : null;
  const taskLabels = (task.labelIds || [])
    .map((id) => workspace.labels?.[id])
    .filter(Boolean);
  const completedSessions = (task.workSessions || []).filter(
    (s) => s.status === "completed"
  );
  const totalSessionsCount = (task.workSessions || []).length;

  // ───────────── Ações de Título ─────────────
  const handleCommitTitle = async () => {
    if (titleText.trim() && titleText.trim() !== task.title) {
      await mutate((ws, ctx) => {
        updateTask(ws, ctx, task.id, { title: titleText.trim() });
      }, user?.email || "Operador");
      toast.success("Título da tarefa atualizado!");
    }
    setIsEditingTitle(false);
  };

  // ───────────── Ações do Cronômetro Real (AJ-022) ─────────────
  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await mutate((ws, ctx) => {
      startTaskSession(
        ws,
        ctx,
        task.id,
        user?.id,
        user?.user_metadata?.full_name || user?.email || "Operador"
      );
    }, user?.email || "Operador");
    toast.success(`▶ Execução iniciada: "${task.title}"`);
  };

  const handlePause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await mutate((ws, ctx) => {
      pauseTaskSession(ws, ctx, task.id);
    }, user?.email || "Operador");
    toast.info(`⏸ Tarefa pausada: ${fmtStopwatch(currentSeconds)}`);
  };

  const handleConclude = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await mutate((ws, ctx) => {
        concludeTaskWithSession(ws, ctx, task.id);
      }, user?.email || "Operador");
      toast.success(`✓ Tarefa concluída com ${fmtStopwatch(currentSeconds)}!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao concluir tarefa");
    }
  };

  // ───────────── Ações de Subtarefa / Checklist ─────────────
  const handleToggleSubtask = async (e: React.MouseEvent, subtaskId: string, currentDone: boolean) => {
    e.stopPropagation();
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
    toast.success("Subtarefa adicionada!");
  };

  const handleDeleteSubtask = async (e: React.MouseEvent, subtaskId: string) => {
    e.stopPropagation();
    await mutate((ws, ctx) => {
      deleteSubtask(ws, ctx, subtaskId);
    }, user?.email || "Operador");
    toast.info("Item removido do checklist");
  };

  // ───────────── Ação de Prioridade (AJ-022) ─────────────
  const handleSetPriority = async (p: Priority) => {
    if (task.priority === p) return;
    await mutate((ws, ctx) => {
      updateTask(ws, ctx, task.id, { priority: p });
    }, user?.email || "Operador");
    toast.success(
      p === "P0"
        ? "Prioridade: P0 — Urgente (Vermelho)"
        : p === "P1"
        ? "Prioridade: P1 — Importante (Laranja)"
        : p === "P2"
        ? "Prioridade: P2 — Útil (Amarelo)"
        : "Prioridade: P3 — Baixa"
    );
  };

  // ───────────── Ações de Responsável ─────────────
  const handleAssignMember = async (memberId: string | null) => {
    await mutate((ws, ctx) => {
      updateTask(ws, ctx, task.id, { assigneeId: memberId });
    }, user?.email || "Operador");
    toast.success(memberId ? "Responsável atribuído!" : "Atribuição removida");
  };

  return (
    <div
      onClick={() => onOpenDetails(task.id)}
      className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs group relative text-card-foreground select-none ${
        isDone
          ? "border-emerald-500/30 bg-emerald-500/[0.03] hover:border-emerald-500/60"
          : isRunning
          ? "border-amber-500/50 bg-amber-500/[0.04] ring-2 ring-amber-500/20 shadow-md"
          : isPaused
          ? "border-amber-500/30 bg-card hover:border-amber-500/50"
          : "border-border bg-card hover:border-primary/40 hover:shadow-md"
      }`}
    >
      {/* 1. LINHA SUPERIOR: ETAPA, PRIORIDADE E MENU CONTEXTUAL */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider truncate">
          {stage?.title || "Etapa Operacional"}
        </span>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Seletor Rápido e Interativo de Prioridade no Card (AJ-022) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`text-[10px] font-bold py-0.5 px-2 rounded-lg border transition-all flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 ${
                  task.priority === "P0"
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    : task.priority === "P1"
                    ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30"
                    : task.priority === "P2"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30"
                }`}
                title="Clique para alterar a prioridade da tarefa"
              >
                <span>
                  {task.priority === "P0"
                    ? "P0 Urgente"
                    : task.priority === "P1"
                    ? "P1 Importante"
                    : task.priority === "P2"
                    ? "P2 Útil"
                    : "P3 Baixa"}
                </span>
                <ChevronDown className="h-2.5 w-2.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-xl text-xs">
              <div className="px-2 py-1 text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Alterar Prioridade
              </div>
              <DropdownMenuItem
                onClick={() => handleSetPriority("P0")}
                className={`cursor-pointer gap-2 font-bold ${
                  task.priority === "P0" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <span>P0 — Urgente (Vermelho)</span>
                {task.priority === "P0" && <Check className="h-3.5 w-3.5 ml-auto text-rose-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSetPriority("P1")}
                className={`cursor-pointer gap-2 font-bold ${
                  task.priority === "P1" ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" : "text-orange-600 dark:text-orange-400"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                <span>P1 — Importante (Laranja)</span>
                {task.priority === "P1" && <Check className="h-3.5 w-3.5 ml-auto text-orange-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSetPriority("P2")}
                className={`cursor-pointer gap-2 font-bold ${
                  task.priority === "P2" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-amber-600 dark:text-amber-400"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                <span>P2 — Útil (Amarelo)</span>
                {task.priority === "P2" && <Check className="h-3.5 w-3.5 ml-auto text-amber-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSetPriority("P3")}
                className={`cursor-pointer gap-2 text-muted-foreground ${
                  task.priority === "P3" ? "bg-muted font-bold text-foreground" : ""
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                <span>P3 — Baixa (Neutro)</span>
                {task.priority === "P3" && <Check className="h-3.5 w-3.5 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Menu de Contexto (Três Pontos) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Ações do Card"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-2xl shadow-xl text-xs">
              <DropdownMenuItem
                onClick={() => {
                  setIsEditingTitle(true);
                  setTitleText(task.title);
                }}
                className="cursor-pointer gap-2"
              >
                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Editar Título</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  setShowChecklist(true);
                  setIsAddingSubtask(true);
                }}
                className="cursor-pointer gap-2"
              >
                <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Adicionar ao Checklist</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Submenu de Prioridades no Menu */}
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                Prioridade
              </div>
              <DropdownMenuItem
                onClick={() => handleSetPriority("P0")}
                className="cursor-pointer gap-2 text-rose-600 dark:text-rose-400 font-semibold"
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>P0 — Urgente (Vermelho)</span>
                {task.priority === "P0" && <Check className="h-3 w-3 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSetPriority("P1")}
                className="cursor-pointer gap-2 text-orange-600 dark:text-orange-400 font-semibold"
              >
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                <span>P1 — Importante (Laranja)</span>
                {task.priority === "P1" && <Check className="h-3 w-3 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleSetPriority("P2")}
                className="cursor-pointer gap-2 text-amber-600 dark:text-amber-400 font-semibold"
              >
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>P2 — Útil (Amarelo)</span>
                {task.priority === "P2" && <Check className="h-3 w-3 ml-auto" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Submenu de Responsáveis */}
              <div className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">
                Atribuir Responsável
              </div>
              {Object.values(workspace.members || {}).map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => handleAssignMember(m.id)}
                  className={`cursor-pointer gap-2 ${
                    task.assigneeId === m.id ? "bg-primary/10 text-primary font-bold" : ""
                  }`}
                >
                  <User className="h-3 w-3" />
                  <span className="truncate">{m.name}</span>
                  {task.assigneeId === m.id && <Check className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
              {task.assigneeId && (
                <DropdownMenuItem
                  onClick={() => handleAssignMember(null)}
                  className="cursor-pointer gap-2 text-rose-600 dark:text-rose-400"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Desatribuir</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={async () => {
                  await mutate((ws, ctx) => archiveTask(ws, ctx, task.id), user?.email || "Operador");
                  toast.info("Tarefa arquivada");
                }}
                className="cursor-pointer gap-2 text-amber-600 dark:text-amber-400"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Arquivar Tarefa</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={async () => {
                  await mutate((ws, ctx) => deleteTask(ws, ctx, task.id), user?.email || "Operador");
                  toast.error("Tarefa removida");
                }}
                className="cursor-pointer gap-2 text-rose-600 dark:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remover Tarefa</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. ETIQUETAS PERSONALIZÁVEIS E ATALHO DE CHECKLIST NO TOPO */}
      <div
        className="flex flex-wrap items-center gap-1.5 mb-2"
        onClick={(e) => e.stopPropagation()}
      >
        {taskLabels.map((lbl: any) => (
          <div
            key={lbl.id}
            className="px-2 py-0.5 rounded-md border text-[10px] font-semibold flex items-center gap-1"
            style={{
              backgroundColor: `${lbl.color}15`,
              borderColor: `${lbl.color}40`,
              color: lbl.color,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: lbl.color }}
            />
            <span className="truncate max-w-[120px]">{lbl.name}</span>
          </div>
        ))}

        <LabelsManagerPopover
          taskId={task.id}
          trigger={
            <button
              type="button"
              className="h-5 px-1.5 rounded-md border border-dashed border-border hover:border-foreground/40 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors cursor-pointer"
              title="Gerenciar Etiquetas"
            >
              <Plus className="h-2.5 w-2.5" />
              <span>Etiqueta</span>
            </button>
          }
        />

        {/* Botão Atalho + Checklist */}
        <button
          type="button"
          onClick={() => {
            setShowChecklist(true);
            setIsAddingSubtask(true);
          }}
          className="h-5 px-1.5 rounded-md border border-dashed border-border hover:border-primary/50 text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
          title="Adicionar item ao Checklist dentro do card"
        >
          <ListTodo className="h-2.5 w-2.5" />
          <span>+ Checklist</span>
        </button>
      </div>

      {/* 3. TÍTULO COM EDIÇÃO INLINE OU CLIQUE DUPLO */}
      {isEditingTitle ? (
        <div onClick={(e) => e.stopPropagation()} className="mb-2">
          <Input
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            onBlur={handleCommitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCommitTitle();
              if (e.key === "Escape") {
                setTitleText(task.title);
                setIsEditingTitle(false);
              }
            }}
            autoFocus
            className="h-7 text-xs font-bold bg-background border-primary text-foreground rounded-lg"
          />
        </div>
      ) : (
        <h4
          onDoubleClick={(e) => {
            e.stopPropagation();
            setIsEditingTitle(true);
          }}
          className={`text-xs font-bold leading-snug mb-2 transition-colors cursor-pointer ${
            isDone
              ? "line-through text-muted-foreground"
              : "text-foreground group-hover:text-primary"
          }`}
          title="Clique duas vezes para renomear"
        >
          {task.title}
        </h4>
      )}

      {/* 4. SINALIZADORES OPERACIONAIS E VÍNCULOS COM O MANUAL DE MARCA */}
      {(() => {
        const titleUpper = task.title.toUpperCase();
        const bmFields = workspace.brandManual?.fields || [];
        const badges: React.ReactNode[] = [];

        if (titleUpper.includes("08H00") || titleUpper.includes("08:00")) {
          badges.push(
            <Badge key="time-08" className="bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30 text-[9px] font-mono py-0 px-1.5 gap-1">
              🕒 08h00
            </Badge>
          );
        } else if (titleUpper.includes("A CONFIRMAR")) {
          badges.push(
            <Badge key="time-pending" className="bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30 text-[9px] font-mono py-0 px-1.5 gap-1">
              ⏳ Horário a confirmar
            </Badge>
          );
        }

        if (titleUpper.includes("EVENTO: ENTRADA") || titleUpper.includes("AUTO-01")) {
          badges.push(
            <Badge key="trig-entry" className="bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 text-[9px] font-mono py-0 px-1.5 gap-1">
              ⚡ Evento: Entrada
            </Badge>
          );
        }

        if (titleUpper.includes("IM-01") || titleUpper.includes("POSICIONAMENTO")) {
          const posFields = bmFields.filter((f) => f.moduleId === "posicionamento" && !f.archived && !f.removed);
          const answered = posFields.filter((f) => (f.response || "").trim().length > 0).length;
          const total = posFields.length || 4;
          badges.push(
            <Badge key="bm-pos" className={`text-[9px] font-bold py-0 px-1.5 gap-1 ${answered >= total ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-amber-500/15 text-amber-600 border-amber-500/30"}`}>
              {answered >= total ? "✓" : "⏳"} {answered}/{total} respostas
            </Badge>
          );
        }

        if (badges.length === 0) return null;
        return <div className="flex flex-wrap items-center gap-1.5 mb-2.5">{badges}</div>;
      })()}

      {/* 5. BLOCO DO CRONÔMETRO REAL & BOTÃO PLAY/PAUSAR (AJ-022) */}
      <div
        className="my-2.5 p-2 rounded-xl bg-background/60 border border-border/80 flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lado Esquerdo: Status & Cronômetro Visual */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                Fazendo
              </span>
              <span className="font-mono font-black text-xs text-foreground bg-muted px-1.5 py-0.5 rounded-md border border-border">
                {fmtStopwatch(currentSeconds)}
              </span>
            </div>
          ) : isPaused ? (
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500/50"></span>
              <span className="text-[11px] font-bold text-amber-600/80 dark:text-amber-400/80">
                Pausada
              </span>
              <span className="font-mono font-semibold text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                {fmtStopwatch(currentSeconds)}
              </span>
            </div>
          ) : isDone ? (
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 font-bold" />
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                Concluída
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {fmtStopwatch(currentSeconds)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-[11px] font-medium">Não iniciada</span>
            </div>
          )}
        </div>

        {/* Lado Direito: Botões de Controle Play / Pausar / Concluir */}
        <div className="flex items-center gap-1 shrink-0">
          {isPending && (
            <Button
              type="button"
              size="sm"
              onClick={handlePlay}
              className="h-6 px-2.5 text-[11px] bg-primary text-primary-foreground font-bold rounded-lg gap-1 hover:brightness-110 shadow-xs cursor-pointer"
            >
              <Play className="h-3 w-3 fill-current" />
              <span>Play</span>
            </Button>
          )}

          {isRunning && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePause}
                className="h-6 px-2 text-[11px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 rounded-lg gap-1 cursor-pointer"
              >
                <Pause className="h-3 w-3 fill-current" />
                <span>Pausar</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConclude}
                className="h-6 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg gap-1 cursor-pointer"
              >
                <Check className="h-3 w-3" />
                <span>Concluir</span>
              </Button>
            </>
          )}

          {isPaused && (
            <>
              <Button
                type="button"
                size="sm"
                onClick={handlePlay}
                className="h-6 px-2 text-[11px] bg-primary text-primary-foreground font-bold rounded-lg gap-1 hover:brightness-110 cursor-pointer"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Retomar</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleConclude}
                className="h-6 px-2 text-[11px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold rounded-lg gap-1 cursor-pointer"
              >
                <Check className="h-3 w-3" />
                <span>Concluir</span>
              </Button>
            </>
          )}

          {isDone && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {task.actualEnd ? fmtDateTime(task.actualEnd).split(" ")[1] : "Feito"}
            </span>
          )}
        </div>
      </div>

      {/* 6. HISTÓRICO EXPANSÍVEL DE SESSÕES (AJ-022) */}
      {(task.workSessions?.length || 0) > 0 && (
        <div className="mb-2 text-xs" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground font-semibold py-0.5 cursor-pointer"
          >
            <span>
              {fmtDurationSummary(currentSeconds, totalSessionsCount)}
            </span>
            {showHistory ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {showHistory && (
            <div className="mt-1.5 p-2 rounded-xl bg-muted/40 border border-border/60 text-[10px] space-y-1">
              <div className="grid grid-cols-4 font-bold text-muted-foreground pb-1 border-b border-border/40">
                <span>Sessão</span>
                <span>Início</span>
                <span>Fim</span>
                <span className="text-right">Duração</span>
              </div>
              {task.workSessions!.map((sess, idx) => (
                <div
                  key={sess.id}
                  className="grid grid-cols-4 text-foreground/80 font-mono py-0.5"
                >
                  <span className="font-sans font-medium text-muted-foreground">
                    #{String(idx + 1).padStart(2, "0")}
                  </span>
                  <span>{fmtDateTime(sess.startedAt).split(" ")[1] || "--"}</span>
                  <span>
                    {sess.endedAt
                      ? fmtDateTime(sess.endedAt).split(" ")[1]
                      : sess.status === "active"
                      ? "Ativa..."
                      : "--"}
                  </span>
                  <span className="text-right font-bold text-primary">
                    {sess.status === "active"
                      ? fmtStopwatch(
                          Math.max(
                            0,
                            Math.floor((Date.now() - new Date(sess.startedAt).getTime()) / 1000)
                          )
                        )
                      : fmtStopwatch(sess.durationSeconds)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7. PROGRESSO DO CHECKLIST / SUBTAREFAS & PREVIEW EXPANSÍVEL (AJ-022) */}
      <div className="mb-2 text-xs" onClick={(e) => e.stopPropagation()}>
        {subtasks.length > 0 ? (
          <div>
            <div
              onClick={() => setShowChecklist(!showChecklist)}
              className="flex items-center justify-between text-[10px] text-muted-foreground hover:text-foreground py-0.5 cursor-pointer"
            >
              <div className="flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                <span>
                  Checklist ({subtasks.filter((s) => s.done).length}/{subtasks.length})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChecklist(true);
                    setIsAddingSubtask(true);
                  }}
                  className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5"
                  title="Adicionar item ao checklist"
                >
                  <Plus className="h-3 w-3" />
                  <span>Item</span>
                </button>
                {showChecklist ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </div>
            </div>

            {/* Lista Compacta de Subtarefas com Toggle Direto */}
            {showChecklist && (
              <div className="mt-1.5 space-y-1 p-2 rounded-xl bg-muted/30 border border-border/40">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-1.5 text-[11px] group/sub"
                  >
                    <button
                      type="button"
                      onClick={(e) => handleToggleSubtask(e, st.id, st.done)}
                      className="flex items-center gap-1.5 text-left flex-1 min-w-0 cursor-pointer"
                    >
                      {st.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      )}
                      <span
                        className={`truncate ${
                          st.done ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {st.title}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSubtask(e, st.id)}
                      className="opacity-0 group-hover/sub:opacity-100 p-0.5 text-muted-foreground hover:text-rose-600 rounded transition-opacity"
                      title="Remover item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {/* Adicionar subtarefa rápido */}
                {isAddingSubtask ? (
                  <form onSubmit={handleCreateSubtask} className="pt-1 flex items-center gap-1">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Novo item do checklist..."
                      className="h-6 text-[11px] bg-background border-input rounded-md flex-1"
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-6 px-2 text-[10px] bg-primary text-primary-foreground font-bold rounded-md"
                    >
                      OK
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddingSubtask(false)}
                      className="h-6 px-1.5 text-[10px] text-muted-foreground rounded-md"
                    >
                      X
                    </Button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingSubtask(true)}
                    className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 pt-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Adicionar item</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Quando ainda não há itens: botão visível para criar checklist direto no card */
          <div>
            {isAddingSubtask ? (
              <form onSubmit={handleCreateSubtask} className="p-2 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-1.5">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Digite o item do checklist..."
                  className="h-6 text-[11px] bg-background border-input rounded-md flex-1"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-6 px-2 text-[10px] bg-primary text-primary-foreground font-bold rounded-md"
                >
                  Adicionar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAddingSubtask(false)}
                  className="h-6 px-1.5 text-[10px] text-muted-foreground rounded-md"
                >
                  Cancelar
                </Button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowChecklist(true);
                  setIsAddingSubtask(true);
                }}
                className="w-full py-1.5 px-2 rounded-xl border border-dashed border-border/80 hover:border-primary/50 text-[10px] text-muted-foreground hover:text-primary flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-muted/10 hover:bg-muted/30"
              >
                <ListTodo className="h-3 w-3" />
                <span>+ Adicionar Checklist no Card</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 8. RODAPÉ DO CARD: RESPONSÁVEL E BOTÃO DE DETALHES */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/60">
        <span className="flex items-center gap-1 truncate max-w-[140px]">
          <User className="h-3 w-3 text-muted-foreground/60 shrink-0" />
          <span className="truncate text-foreground/80 font-medium">
            {assignee?.name || "Sem atribuição"}
          </span>
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(task.id);
          }}
          className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 font-medium cursor-pointer"
        >
          <span>Abrir detalhes</span>
        </button>
      </div>
    </div>
  );
};
