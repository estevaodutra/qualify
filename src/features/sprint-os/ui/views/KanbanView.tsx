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
              {/* Cabeçalho da Coluna */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-base">{col.icon}</span>
                  <span className={`text-sm font-black uppercase tracking-wider ${col.color}`}>
                    {col.title}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-bold border-border text-muted-foreground bg-muted rounded-xl px-2 py-0.5"
                >
                  {colTasks.length}
                </Badge>
              </div>

              {/* Lista de Cards da Coluna */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {colTasks.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-xs text-muted-foreground/50 border border-dashed border-border/80 rounded-2xl p-4 text-center">
                    <span>Nenhuma tarefa em {col.title}</span>
                    <span className="text-[10px] text-muted-foreground/40 mt-1">
                      Arraste um card para cá ou inicie pelo botão Play
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
