/**
 * Store Central do Sprint OS (Camada B).
 * Integração com Zustand, gerenciando:
 * - Lista de cronogramas e templates
 * - Workspace ativo e Sprint ativa
 * - Modo de interação (Organização, Execução, Planejamento)
 * - Filtros operacionais (Responsável, Prioridade, Status, Busca)
 * - Modais e diálogos (Atualizar Prazos, Ativação de Sprint, Detalhes da Tarefa, Criação)
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
  CustomIndicator,
  OKRGoal,
  ContentDistributionMetrics,
  HoursCalculatorData,
  AdsCalculatorData,
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
  upsertIndicator,
  deleteIndicator,
  togglePinIndicator,
  upsertOKRGoal,
  deleteOKRGoal,
  updateContentMetrics,
  updateHoursCalculator,
  updateAdsCalculator,
  createBlankWorkspace,
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
import {
  SprintOSRepository,
  type WorkspaceListItem,
  type TemplateListItem,
} from "../persistence/repository";

export type ViewTab =
  | "structure"
  | "kanban"
  | "gantt"
  | "indicators"
  | "okrs"
  | "calculators"
  | "funnel"
  | "financial"
  | "routines"
  | "milestones";

interface SprintOSState {
  // Lista de Cronogramas e Templates
  workspacesList: WorkspaceListItem[];
  templatesList: TemplateListItem[];
  activeWorkspaceId: ID | null;

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
  isCreateModalOpen: boolean;

  // Ações de Carregamento & Gestão de Cronogramas
  fetchWorkspacesList: (companyId?: string | null) => Promise<void>;
  fetchTemplatesList: () => void;
  openWorkspace: (id: ID, companyId?: string | null, actorName?: string) => Promise<void>;
  closeWorkspace: () => void;
  createBlank: (name: string, client: string, companyId?: string | null) => Promise<void>;
  createFromTemplateAction: (templateId: string, name: string, client: string, companyId?: string | null) => Promise<void>;
  duplicateCurrentWorkspace: (newName: string, companyId?: string | null) => Promise<void>;
  deleteWorkspaceAction: (id: ID, companyId?: string | null) => Promise<void>;
  saveCurrentAsTemplate: (templateName: string) => Promise<void>;

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
  setIsCreateModalOpen: (open: boolean) => void;

  // Mutações de Domínio
  mutate: (fn: (ws: Workspace, ctx: { actorName: string; nowIso: string }) => void, actorName?: string) => Promise<void>;

  // Ações Operacionais Especializadas
  assignTaskMemberAction: (taskId: ID, memberId: ID | null, actorName?: string) => Promise<void>;
  reorderStagesAction: (orderedIds: ID[], actorName?: string) => Promise<void>;
  moveTaskAction: (taskId: ID, toStageId: ID, toIndex: number, actorName?: string) => Promise<void>;
  upsertIndicatorAction: (data: Partial<CustomIndicator> & { name: string; type: CustomIndicator["type"] }, actorName?: string) => Promise<void>;
  deleteIndicatorAction: (id: ID, actorName?: string) => Promise<void>;
  togglePinIndicatorAction: (id: ID, actorName?: string) => Promise<void>;
  upsertOKRAction: (data: Partial<OKRGoal> & { title: string }, actorName?: string) => Promise<void>;
  deleteOKRAction: (id: ID, actorName?: string) => Promise<void>;
  updateContentMetricsAction: (patch: Partial<ContentDistributionMetrics>, actorName?: string) => Promise<void>;
  updateHoursCalcAction: (patch: Partial<HoursCalculatorData>, actorName?: string) => Promise<void>;
  updateAdsCalcAction: (patch: Partial<AdsCalculatorData>, actorName?: string) => Promise<void>;

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
  workspacesList: [],
  templatesList: [],
  activeWorkspaceId: null,

  workspace: null,
  version: 1,
  isLoading: true,
  activeSprintId: null,
  interactionMode: "execute",
  activeTab: "structure",

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
  isCreateModalOpen: false,

  fetchWorkspacesList: async (companyId) => {
    try {
      const list = await SprintOSRepository.listWorkspaces(companyId);
      set({ workspacesList: list });
    } catch (e: any) {
      console.warn("Erro ao buscar lista de cronogramas:", e);
    }
  },

  fetchTemplatesList: () => {
    const list = SprintOSRepository.listTemplates();
    set({ templatesList: list });
  },

  openWorkspace: async (id, companyId, actorName = "Operador") => {
    set({ isLoading: true });
    try {
      const { workspace, version } = await SprintOSRepository.loadWorkspace(companyId, id);
      const activeSprint =
        Object.values(workspace.sprints || {}).find((s) => !s.archivedAt && s.status === "active") ||
        Object.values(workspace.sprints || {})[0];

      set({
        activeWorkspaceId: id,
        workspace,
        version,
        activeSprintId: activeSprint ? activeSprint.id : null,
        isLoading: false,
      });
    } catch (e: any) {
      toast.error(`Erro ao abrir cronograma: ${e.message}`);
      set({ isLoading: false });
    }
  },

  closeWorkspace: () => {
    set({ activeWorkspaceId: null });
    get().fetchWorkspacesList();
  },

  createBlank: async (name, client, companyId) => {
    set({ isLoading: true });
    try {
      const blank = createBlankWorkspace(name, client);
      await SprintOSRepository.saveWorkspace(blank, 1, companyId, "Operador");
      await get().fetchWorkspacesList(companyId);
      set({
        workspace: blank,
        version: 1,
        activeWorkspaceId: blank.project.id,
        activeSprintId: Object.keys(blank.sprints)[0] || null,
        isCreateModalOpen: false,
        isLoading: false,
      });
      toast.success(`Cronograma em branco "${name}" criado!`);
    } catch (e: any) {
      toast.error(`Erro ao criar cronograma: ${e.message}`);
      set({ isLoading: false });
    }
  },

  createFromTemplateAction: async (templateId, name, client, companyId) => {
    set({ isLoading: true });
    try {
      const ws = SprintOSRepository.createFromTemplate(templateId, name, client);
      await SprintOSRepository.saveWorkspace(ws, 1, companyId, "Operador");
      await get().fetchWorkspacesList(companyId);
      set({
        workspace: ws,
        version: 1,
        activeWorkspaceId: ws.project.id,
        activeSprintId: Object.keys(ws.sprints)[0] || null,
        isCreateModalOpen: false,
        isLoading: false,
      });
      toast.success(`Cronograma criado a partir do template!`);
    } catch (e: any) {
      toast.error(`Erro ao importar template: ${e.message}`);
      set({ isLoading: false });
    }
  },

  duplicateCurrentWorkspace: async (newName, companyId) => {
    const { workspace } = get();
    if (!workspace) return;
    try {
      const clone = SprintOSRepository.duplicateWorkspace(workspace, newName);
      await SprintOSRepository.saveWorkspace(clone, 1, companyId, "Operador");
      await get().fetchWorkspacesList(companyId);
      set({
        workspace: clone,
        version: 1,
        activeWorkspaceId: clone.project.id,
        activeSprintId: Object.keys(clone.sprints)[0] || null,
      });
      toast.success(`Cronograma duplicado com sucesso!`);
    } catch (e: any) {
      toast.error(`Erro ao duplicar: ${e.message}`);
    }
  },

  deleteWorkspaceAction: async (id, companyId) => {
    try {
      await SprintOSRepository.deleteWorkspace(id, companyId);
      await get().fetchWorkspacesList(companyId);
      if (get().activeWorkspaceId === id) {
        set({ activeWorkspaceId: null, workspace: null });
      }
      toast.success("Cronograma excluído.");
    } catch (e: any) {
      toast.error(`Erro ao excluir: ${e.message}`);
    }
  },

  saveCurrentAsTemplate: async (templateName) => {
    const { workspace } = get();
    if (!workspace) return;
    try {
      const tpl = SprintOSRepository.saveAsTemplate(workspace, templateName);
      get().fetchTemplatesList();
      toast.success(`Template "${tpl.name}" salvo com sucesso!`);
    } catch (e: any) {
      toast.error(`Erro ao salvar template: ${e.message}`);
    }
  },

  initWorkspace: async (companyId, workspaceId, actorName = "Engenheiro Operacional") => {
    set({ isLoading: true });
    try {
      await get().fetchWorkspacesList(companyId);
      get().fetchTemplatesList();
      // Não abre direto o workspace se workspaceId for nulo (mostra a lista Meus Cronogramas)
      if (workspaceId) {
        await get().openWorkspace(workspaceId, companyId, actorName);
      } else {
        set({ activeWorkspaceId: null, isLoading: false });
      }
    } catch (e: any) {
      toast.error(`Erro ao carregar cronogramas: ${e.message}`);
      set({ isLoading: false });
    }
  },

  saveCurrentWorkspace: async (companyId, actorName = "Engenheiro Operacional") => {
    const { workspace, version } = get();
    if (!workspace) return;

    const res = await SprintOSRepository.saveWorkspace(workspace, version, companyId, actorName);
    if (res.conflict) {
      toast.error(res.error || "Conflito de versão! Recarregando...");
      get().openWorkspace(workspace.project.id, companyId);
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
  setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),

  mutate: async (fn, actorName = "Engenheiro Operacional") => {
    const { workspace, version } = get();
    if (!workspace) return;

    const draft: Workspace = JSON.parse(JSON.stringify(workspace));
    const ctx = { actorName, nowIso: new Date().toISOString() };

    try {
      fn(draft, ctx);
      set({ workspace: draft });
      const res = await SprintOSRepository.saveWorkspace(draft, version, null, actorName);
      if (res.ok) {
        set({ version: res.version });
      }
    } catch (e: any) {
      toast.error(e.message || "Erro na operação");
      throw e;
    }
  },

  assignTaskMemberAction: async (taskId, memberId, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        updateTask(ws, ctx, taskId, { assigneeId: memberId });
      }, actorName);
      toast.success("Responsável atualizado!");
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  reorderStagesAction: async (orderedIds, actorName = "Operador") => {
    const { workspace, activeSprintId } = get();
    if (!workspace || !activeSprintId) return;
    try {
      await get().mutate((ws, ctx) => {
        reorderStages(ws, ctx, activeSprintId, orderedIds);
      }, actorName);
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  moveTaskAction: async (taskId, toStageId, toIndex, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        moveTask(ws, ctx, taskId, toStageId, toIndex);
      }, actorName);
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  upsertIndicatorAction: async (data, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        upsertIndicator(ws, ctx, data);
      }, actorName);
      toast.success("Indicador salvo!");
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  deleteIndicatorAction: async (id, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        deleteIndicator(ws, ctx, id);
      }, actorName);
      toast.success("Indicador removido.");
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  togglePinIndicatorAction: async (id, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        togglePinIndicator(ws, ctx, id);
      }, actorName);
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  upsertOKRAction: async (data, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        upsertOKRGoal(ws, ctx, data);
      }, actorName);
      toast.success("OKR salvo!");
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  deleteOKRAction: async (id, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        deleteOKRGoal(ws, ctx, id);
      }, actorName);
      toast.success("OKR removido.");
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  updateContentMetricsAction: async (patch, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        updateContentMetrics(ws, ctx, patch);
      }, actorName);
      toast.success("Métricas de conteúdo atualizadas!");
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  updateHoursCalcAction: async (patch, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        updateHoursCalculator(ws, ctx, patch);
      }, actorName);
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  updateAdsCalcAction: async (patch, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        updateAdsCalculator(ws, ctx, patch);
      }, actorName);
    } catch (e: any) {
      toast.error(e.message);
    }
  },

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
