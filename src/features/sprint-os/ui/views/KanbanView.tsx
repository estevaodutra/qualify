/**
 * Visão Kanban do Sprint OS com Cards Otimizados e Cronômetro Real (AJ-022).
 * Três colunas canônicas principais:
 * - 🔴 PENDENTE
 * - 🟡 FAZENDO
 * - 🟢 CONCLUÍDA
 * Controle real do tempo de execução:
 * PLAY → FAZENDO → CONTAGEM REAL → PAUSA → REGISTRO → RETOMADA → CONCLUSÃO → TEMPO TOTAL.
 */

import React, { useState, useEffect } from "react";
import {
  Clock,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSprintOSStore } from "../../state/sprintOsStore";
import { useAuth } from "@/contexts/AuthContext";
import {
  sprintTasks,
  updateTask,
  reconcileWorkspaceWithAJ019,
  reconcileWorkspaceWithAJ024,
  startTaskSession,
  pauseTaskSession,
  concludeTaskWithSession,
  setTaskStatus,
  createTask,
  stagesOf,
} from "../../domain/ops";
import type { TaskStatus, Task } from "../../domain/types";
import { KanbanCard } from "../kanban/KanbanCard";
import { toast } from "sonner";

const COLUMNS: {
  id: TaskStatus;
  title: string;
  color: string;
  bg: string;
  icon: string;
  dropBorder: string;
}[] = [
  {
    id: "pending",
    title: "Pendente",
    color: "text-rose-600 dark:text-rose-400",
    bg: "border-rose-500/20 bg-rose-500/5",
    icon: "🔴",
    dropBorder: "border-rose-500 ring-2 ring-rose-500/30",
  },
  {
    id: "doing",
    title: "Fazendo",
    color: "text-amber-600 dark:text-amber-400",
    bg: "border-amber-500/20 bg-amber-500/5",
    icon: "🟡",
    dropBorder: "border-amber-500 ring-2 ring-amber-500/30",
  },
  {
    id: "done",
    title: "Concluída",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "border-emerald-500/20 bg-emerald-500/5",
    icon: "🟢",
    dropBorder: "border-emerald-500 ring-2 ring-emerald-500/30",
  },
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
    mutate,
  } = useSprintOSStore();

  const { user } = useAuth();

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<TaskStatus | null>(null);

  // Estado de criação de card estilo Trello (+ no cabeçalho)
  const [addingCardInCol, setAddingCardInCol] = useState<TaskStatus | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  const handleCreateBlankCard = async (status: TaskStatus = "pending", customTitle?: string) => {
    if (!workspace) return;
    const stages = activeSprintId ? stagesOf(workspace, activeSprintId) : Object.values(workspace.stages || {});
    const stageId = stages[0]?.id || Object.keys(workspace.stages || {})[0];
    if (!stageId) {
      toast.error("Nenhuma etapa operacional encontrada.");
      return;
    }

    const title = (customTitle !== undefined ? customTitle : newCardTitle).trim() || "Novo Card";
    let createdTaskId = "";

    try {
      await mutate((ws, ctx) => {
        createdTaskId = createTask(ws, ctx, stageId, title, {
          status,
          priority: "P2",
        });
      }, user?.email || "Operador");

      setAddingCardInCol(null);
      setNewCardTitle("");
      toast.success(`Card criado em ${status === "done" ? "Concluída" : status === "doing" ? "Fazendo" : "Pendente"}!`);

      if (createdTaskId) {
        handleOpenTaskDetails(createdTaskId);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar card");
    }
  };

  // Auto-reconciliação do workspace com o Checklist Master AJ-024 se faltar itens
  useEffect(() => {
    if (workspace && activeSprintId) {
      const live = Object.values(workspace.tasks || {}).filter((t) => !t.archivedAt);
      const hasIM01 = live.some((t) => t.title.includes("01.01") || t.title.includes("IM-01"));
      const hasSubtasksOnIM01 = live.some(
        (t) =>
          (t.title.includes("01.01") || t.title.includes("IM-01")) &&
          Object.values(workspace.subtasks || {}).some((st) => !st.archivedAt && st.taskId === t.id)
      );
      const hasEtapa13 = live.some((t) => t.title.includes("13.01") || t.title.includes("OPORTUNIDADES"));
      const hasLabels = workspace.labels && Object.keys(workspace.labels).length > 0;

      if (!hasIM01 || !hasSubtasksOnIM01 || !hasEtapa13 || !hasLabels) {
        mutate((ws, ctx) => {
          reconcileWorkspaceWithAJ024(ws, ctx);
          reconcileWorkspaceWithAJ019(ws, ctx);
        }, user?.email || "Operador");
      }
    }
  }, [workspace?.project?.id, activeSprintId]);

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

  const handleOpenTaskDetails = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  // ───────────── Drag and Drop Handlers (AJ-022) ─────────────
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverColId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColId(null);
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setDraggedTaskId(null);

    if (!taskId) return;
    const task = workspace.tasks[taskId];
    if (!task || task.status === targetStatus) return;

    try {
      await mutate((ws, ctx) => {
        if (targetStatus === "done") {
          // Conclusão segura de sessão e consolidação de tempo
          concludeTaskWithSession(ws, ctx, taskId);
        } else if (targetStatus === "doing") {
          // Transição para Fazendo
          if (task.status === "pending") {
            // Mover para Fazendo preserva estado para iniciar sessão ao clicar Play
            setTaskStatus(ws, ctx, taskId, "doing");
          } else {
            setTaskStatus(ws, ctx, taskId, "doing");
          }
        } else if (targetStatus === "pending") {
          // Devolver para Pendente encerra sessão ativa se houver
          if (task.workSessions?.some((s) => s.status === "active")) {
            pauseTaskSession(ws, ctx, taskId);
          }
          setTaskStatus(ws, ctx, taskId, "pending");
        }
      }, user?.email || "Operador");

      toast.success(`Tarefa movida para ${targetStatus === "done" ? "Concluída" : targetStatus === "doing" ? "Fazendo" : "Pendente"}`);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível mover a tarefa");
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho do Kanban (Estilo Trello) com Ação de Criar Card em Branco */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-foreground tracking-tight">
            Quadro Kanban
          </span>
          <Badge
            variant="outline"
            className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg border-border text-muted-foreground bg-muted/40"
          >
            {tasks.length} {tasks.length === 1 ? "card" : "cards"}
          </Badge>
        </div>

        <Button
          type="button"
          onClick={() => handleCreateBlankCard("pending")}
          size="sm"
          className="h-8 px-3 text-xs font-bold bg-primary text-primary-foreground rounded-xl flex items-center gap-1.5 hover:brightness-110 shadow-xs cursor-pointer"
          title="Criar um novo card em branco tipo Trello"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>+ Criar Card em Branco</span>
        </Button>
      </div>

      {/* 3 Colunas Principais: Pendente, Fazendo, Concluída */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[640px]">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isOver = dragOverColId === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-3xl border ${col.bg} p-4 flex flex-col backdrop-blur-md shadow-xs transition-all ${
                isOver ? col.dropBorder : ""
              }`}
            >
              {/* Cabeçalho da Coluna com Botão '+' Tipo Trello */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-base">{col.icon}</span>
                  <span className={`text-sm font-black uppercase tracking-wider ${col.color}`}>
                    {col.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-xs font-bold border-border text-muted-foreground bg-muted rounded-xl px-2 py-0.5"
                  >
                    {colTasks.length}
                  </Badge>

                  {/* Botão '+' no cabeçalho da coluna para criar card em branco */}
                  <button
                    type="button"
                    onClick={() => {
                      if (addingCardInCol === col.id) {
                        setAddingCardInCol(null);
                        setNewCardTitle("");
                      } else {
                        setAddingCardInCol(col.id);
                        setNewCardTitle("");
                      }
                    }}
                    className="h-6 w-6 rounded-lg bg-background/80 hover:bg-primary hover:text-primary-foreground border border-border/80 flex items-center justify-center text-muted-foreground transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                    title={`Adicionar novo card em branco em ${col.title}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Composer Rápido Estilo Trello ao Clicar no '+' */}
              {addingCardInCol === col.id && (
                <div className="mb-3 p-3 rounded-2xl bg-card border-2 border-primary/50 shadow-md space-y-2 animate-in fade-in-50 duration-150">
                  <Input
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    placeholder="Insira o título (ou Enter para 'Novo Card')..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateBlankCard(col.id);
                      }
                      if (e.key === "Escape") {
                        setAddingCardInCol(null);
                        setNewCardTitle("");
                      }
                    }}
                    className="h-8 text-xs font-medium bg-background border-border rounded-lg"
                  />
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCreateBlankCard(col.id)}
                      className="h-7 px-3 text-xs bg-primary text-primary-foreground font-bold rounded-lg cursor-pointer"
                    >
                      Adicionar cartão
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setAddingCardInCol(null);
                        setNewCardTitle("");
                      }}
                      className="h-7 px-2 text-xs text-muted-foreground rounded-lg cursor-pointer"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de Cards da Coluna */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {colTasks.length === 0 && addingCardInCol !== col.id ? (
                  <div className="h-40 flex flex-col items-center justify-center text-xs text-muted-foreground/50 border border-dashed border-border/80 rounded-2xl p-4 text-center">
                    <span>Nenhuma tarefa em {col.title}</span>
                    <span className="text-[10px] text-muted-foreground/40 mt-1">
                      Arraste um card para cá ou clique no + para criar
                    </span>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <KanbanCard
                        task={task}
                        onOpenDetails={handleOpenTaskDetails}
                      />
                    </div>
                  ))
                )}

                {/* Botão no rodapé da coluna tipo Trello '+ Adicionar cartão' */}
                {addingCardInCol !== col.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingCardInCol(col.id);
                      setNewCardTitle("");
                    }}
                    className="w-full mt-1 py-2 px-3 rounded-xl border border-dashed border-border/70 hover:border-primary/50 bg-background/30 hover:bg-background/80 text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Adicionar cartão</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
