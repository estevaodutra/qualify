/**
 * Store Central do Sprint OS (Camada B).
 * Integração com Zustand, gerenciando:
 * - Estado reativo do Workspace e Sprint ativa
 * - Modo de interação (Organização, Execução, Planejamento)
 * - Filtros operacionais (Responsável, Prioridade, Status, Busca)
 * - Modais e diálogos (Atualizar Prazos com Prévia, Ativação de Sprint, Detalhes da Tarefa)
 * - Despacho de mutações de domínio com persistência e log de auditoria
 */

import { create } from "zustand";
import { toast } from "sonner";
import type {
  ID,
  InteractionMode,
  Priority,
  TaskStatus,
  Workspace,
  DeadlineProposal,
  Task,
} from "../domain/types";
import {
  acknowledge,
  createStage,
  createSubtask,
  createTask,
  deleteSubtask,
  duplicateStage,
  duplicateTask,
  moveSubtask,
  moveTask,
  renameStage,
  reorderStages,
  setFunnelCount,
  setMemberCost,
  setPriority,
  setPrompt,
  setTaskStatus,
  stepSubtaskCount,
  toggleRoutineOccurrence,
  toggleSubtask,
  updateProject,
  updateSprint,
  updateSubtask,
  updateTask,
  upsertChangeRequest,
  upsertFinancial,
  upsertMember,
  upsertMilestone,
  upsertRoutine,
  validateMilestone,
  addTimeEntry,
  acceptTask,
  archiveStage,
  archiveTask,
  restoreTask,
} from "../domain/ops";
import {
  activateSprint,
  applyDeadlineProposal,
  proposeDeadlineUpdate,
  rescheduleTask,
  undoRevision,
  type ActivationInput,
} from "../scheduler/planning";
import { nowInSaoPaulo } from "../scheduler/time";
import { SprintOSRepository } from "../persistence/repository";

export type ViewTab =
  | "dashboard"
  | "structure"
  | "kanban"
  | "gantt"
  | "schedule"
  | "funnel"
  | "financial"
  | "routines"
  | "milestones"
  | "reports";

interface SprintOSState {
  workspace: Workspace | null;
  version: number;
  isLoading: boolean;
  activeSprintId: ID | null;
  interactionMode: InteractionMode;
  activeTab: ViewTab;

  // Filtros
  searchQuery: string;
  filterAssigneeId: ID | null;
  filterPriority: Priority | null;
  filterStatus: TaskStatus | null;

  // Seleções & Modais
  selectedTaskId: ID | null;
  isTaskModalOpen: boolean;
  deadlineProposal: DeadlineProposal | null;
  isDeadlineModalOpen: boolean;
  isActivateModalOpen: boolean;
  isShareModalOpen: boolean;
  isTemplatesModalOpen: boolean;
  isReportModalOpen: boolean;

  // Ações de Carregamento & Persistência
  initWorkspace: (companyId?: string | null, workspaceId?: string | null, actorName?: string) => Promise<void>;
  saveCurrentWorkspace: (companyId?: string | null, actorName?: string) => Promise<void>;

  // Setters de Visualização
  setInteractionMode: (mode: InteractionMode) => void;
  setActiveTab: (tab: ViewTab) => void;
  setActiveSprintId: (id: ID) => void;
  setSearchQuery: (query: string) => void;
  setFilterAssigneeId: (id: ID | null) => void;
  setFilterPriority: (priority: Priority | null) => void;
  setFilterStatus: (status: TaskStatus | null) => void;
  setSelectedTaskId: (id: ID | null) => void;
  setIsTaskModalOpen: (open: boolean) => void;
  setIsDeadlineModalOpen: (open: boolean) => void;
  setIsActivateModalOpen: (open: boolean) => void;
  setIsShareModalOpen: (open: boolean) => void;
  setIsTemplatesModalOpen: (open: boolean) => void;
  setIsReportModalOpen: (open: boolean) => void;

  // Mutações de Domínio
  mutate: (fn: (ws: Workspace, ctx: { actorName: string; nowIso: string }) => void, actorName?: string) => Promise<void>;

  // Ações Operacionais Especializadas
  openDeadlineUpdatePreview: () => void;
  confirmDeadlineUpdate: (actorName?: string) => Promise<void>;
  undoLastRevision: (revId: ID, actorName?: string) => Promise<void>;
  activateSprintAction: (input: ActivationInput, actorName?: string) => Promise<void>;
  rescheduleTaskAction: (taskId: ID, newStart: string, pin?: boolean, actorName?: string) => Promise<void>;
  setTaskStatusAction: (taskId: ID, status: TaskStatus, actorName?: string) => Promise<void>;
  toggleSubtaskAction: (subtaskId: ID, done: boolean, actorName?: string) => Promise<void>;
  stepSubtaskCountAction: (subtaskId: ID, delta: 1 | -1, actorName?: string) => Promise<void>;
  acknowledgeAction: (taskId: ID, memberId: ID, actorName?: string) => Promise<void>;
}

export const useSprintOSStore = create<SprintOSState>((set, get) => ({
  workspace: null,
  version: 1,
  isLoading: true,
  activeSprintId: null,
  interactionMode: "execute",
  activeTab: "dashboard",

  searchQuery: "",
  filterAssigneeId: null,
  filterPriority: null,
  filterStatus: null,

  selectedTaskId: null,
  isTaskModalOpen: false,
  deadlineProposal: null,
  isDeadlineModalOpen: false,
  isActivateModalOpen: false,
  isShareModalOpen: false,
  isTemplatesModalOpen: false,
  isReportModalOpen: false,

  initWorkspace: async (companyId, workspaceId, actorName = "Engenheiro Operacional") => {
    set({ isLoading: true });
    try {
      const { workspace, version } = await SprintOSRepository.loadWorkspace(companyId, workspaceId);
      const sprintIds = Object.keys(workspace.sprints);
      const activeSprintId = sprintIds.length > 0 ? sprintIds[0] : null;

      set({
        workspace,
        version,
        activeSprintId,
        isLoading: false,
      });
    } catch (e: any) {
      toast.error(`Erro ao carregar workspace: ${e.message}`);
      set({ isLoading: false });
    }
  },

  saveCurrentWorkspace: async (companyId, actorName = "Engenheiro Operacional") => {
    const { workspace, version } = get();
    if (!workspace) return;

    const res = await SprintOSRepository.saveWorkspace(workspace, version, companyId, actorName);
    if (res.conflict) {
      toast.error(res.error || "Conflito de versão! Recarregando dados mais recentes...");
      // Recarregar
      get().initWorkspace(companyId, workspace.project.id);
    } else if (res.ok) {
      set({ version: res.version });
    }
  },

  setInteractionMode: (mode) => set({ interactionMode: mode }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveSprintId: (id) => set({ activeSprintId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterAssigneeId: (id) => set({ filterAssigneeId: id }),
  setFilterPriority: (priority) => set({ filterPriority: priority }),
  setFilterStatus: (status) => set({ filterStatus: status }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setIsTaskModalOpen: (open) => set({ isTaskModalOpen: open }),
  setIsDeadlineModalOpen: (open) => set({ isDeadlineModalOpen: open }),
  setIsActivateModalOpen: (open) => set({ isActivateModalOpen: open }),
  setIsShareModalOpen: (open) => set({ isShareModalOpen: open }),
  setIsTemplatesModalOpen: (open) => set({ isTemplatesModalOpen: open }),
  setIsReportModalOpen: (open) => set({ isReportModalOpen: open }),

  mutate: async (fn, actorName = "Engenheiro Operacional") => {
    const { workspace, version } = get();
    if (!workspace) return;

    // Clonar rascunho de forma segura
    const draft: Workspace = JSON.parse(JSON.stringify(workspace));
    const ctx = { actorName, nowIso: new Date().toISOString() };

    try {
      fn(draft, ctx);
      set({ workspace: draft });
      // Salvar imediatamente no repository
      const res = await SprintOSRepository.saveWorkspace(draft, version, null, actorName);
      if (res.ok) {
        set({ version: res.version });
      }
    } catch (e: any) {
      toast.error(e.message || "Erro na operação");
      throw e;
    }
  },

  // ─────────────────────────────────────────────────────────────
  // AÇÕES ESPECIAIS DO MOTOR DE CRONOGRAMA
  // ─────────────────────────────────────────────────────────────

  openDeadlineUpdatePreview: () => {
    const { workspace, activeSprintId } = get();
    if (!workspace || !activeSprintId) return;

    try {
      const nowSp = nowInSaoPaulo();
      const proposal = proposeDeadlineUpdate(workspace, activeSprintId, nowSp);
      set({ deadlineProposal: proposal, isDeadlineModalOpen: true });
    } catch (e: any) {
      toast.error(`Falha no cálculo de prazos: ${e.message}`);
    }
  },

  confirmDeadlineUpdate: async (actorName = "Engenheiro Operacional") => {
    const { deadlineProposal, workspace } = get();
    if (!deadlineProposal || !workspace) return;

    try {
      await get().mutate((ws, ctx) => {
        applyDeadlineProposal(ws, ctx, deadlineProposal);
      }, actorName);

      toast.success("🔃 Prazos do cronograma recalculados com sucesso!");
      set({ isDeadlineModalOpen: false, deadlineProposal: null });
    } catch (e: any) {
      toast.error(`Não foi possível aplicar novo cronograma: ${e.message}`);
    }
  },

  undoLastRevision: async (revId: ID, actorName = "Engenheiro Operacional") => {
    try {
      await get().mutate((ws, ctx) => {
        undoRevision(ws, ctx, revId);
      }, actorName);
      toast.success("Revisão de cronograma desfeita com sucesso.");
    } catch (e: any) {
      toast.error(`Erro ao desfazer: ${e.message}`);
    }
  },

  activateSprintAction: async (input: ActivationInput, actorName = "Engenheiro Operacional") => {
    const { activeSprintId } = get();
    if (!activeSprintId) return;

    const now = nowInSaoPaulo();
    try {
      await get().mutate((ws, ctx) => {
        activateSprint(ws, ctx, activeSprintId, input, now);
      }, actorName);

      toast.success("🚀 Sprint Ativada! Linha de base imutável capturada.");
      set({ isActivateModalOpen: false });
    } catch (e: any) {
      toast.error(`Erro ao ativar sprint: ${e.message}`);
    }
  },

  rescheduleTaskAction: async (taskId, newStart, pin = true, actorName = "Engenheiro Operacional") => {
    try {
      await get().mutate((ws, ctx) => {
        rescheduleTask(ws, ctx, taskId, newStart, { pin });
      }, actorName);
      toast.success("Tarefa reagendada.");
    } catch (e: any) {
      toast.error(`Erro ao reagendar: ${e.message}`);
    }
  },

  setTaskStatusAction: async (taskId, status, actorName = "Engenheiro Operacional") => {
    try {
      await get().mutate((ws, ctx) => {
        setTaskStatus(ws, ctx, taskId, status);
      }, actorName);
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  toggleSubtaskAction: async (subtaskId, done, actorName = "Engenheiro Operacional") => {
    try {
      await get().mutate((ws, ctx) => {
        toggleSubtask(ws, ctx, subtaskId, done);
      }, actorName);
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  stepSubtaskCountAction: async (subtaskId, delta, actorName = "Engenheiro Operacional") => {
    try {
      await get().mutate((ws, ctx) => {
        stepSubtaskCount(ws, ctx, subtaskId, delta);
      }, actorName);
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  acknowledgeAction: async (taskId, memberId, actorName = "Engenheiro Operacional") => {
    try {
      await get().mutate((ws, ctx) => {
        acknowledge(ws, ctx, taskId, memberId);
      }, actorName);
      toast.success("👁️ Confirmação de ciência registrada!");
    } catch (e: any) {
      toast.error(e.message);
    }
  },
}));
