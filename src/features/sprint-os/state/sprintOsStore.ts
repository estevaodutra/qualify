/**
 * Store Central do Sprint OS / Cronogramas (Camada B).
 * Especificação: Master Prompt v9.0 + Otimização UX/UI.
 * - Gerenciamento de Cronogramas, Templates (com edição)
 * - Cronômetro individual & Pomodoro por tarefa
 * - Flags de impacto (até 3 por tarefa)
 * - Cadastro e comparação individual de publicações
 * - Gestão flexível do Funil Comercial X1
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
  ContentPublication,
  HoursCalculatorData,
  AdsCalculatorData,
  ImpactFlag,
  FunnelStage,
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
  createFunnelStage,
  updateFunnelStage,
  deleteFunnelStage,
  reorderFunnelStages,
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
  upsertPublication,
  deletePublication,
  duplicatePublication,
  setTaskImpactFlags,
  logPomodoroTime,
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
  | "calculators"
  | "funnel"
  | "routines"
  | "milestones";

export interface ActiveTaskTimer {
  taskId: ID;
  taskTitle: string;
  mode: "stopwatch" | "pomodoro";
  startedAt: number; // Date.now() timestamp when resumed/started
  accumulatedMs: number;
  isRunning: boolean;
  pomodoroWorkMinutes: number; // default 25
  pomodoroBreakMinutes: number; // default 5
  isBreak: boolean;
}

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
  filterImpact: ImpactFlag | null;

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
  isEditTemplateModalOpen: boolean;
  editingTemplateId: string | null;

  // Cronômetro / Pomodoro Ativo
  activeTimer: ActiveTaskTimer | null;
  startTimer: (taskId: ID, mode?: "stopwatch" | "pomodoro") => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopAndSaveTimer: (note?: string) => Promise<void>;
  resetTimer: () => void;

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
  updateTemplateAction: (templateId: string, metaPatch: Partial<TemplateListItem>, dataPatch?: Workspace) => Promise<void>;

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
  setFilterImpact: (flag: ImpactFlag | null) => void;
  setSelectedTaskId: (id: ID | null) => void;
  setIsTaskModalOpen: (open: boolean) => void;
  setIsDeadlineModalOpen: (open: boolean) => void;
  setIsActivateModalOpen: (open: boolean) => void;
  setIsShareModalOpen: (open: boolean) => void;
  setIsTemplatesModalOpen: (open: boolean) => void;
  setIsReportModalOpen: (open: boolean) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsEditTemplateModalOpen: (open: boolean) => void;
  setEditingTemplateId: (id: string | null) => void;

  // Mutações de Domínio
  mutate: (fn: (ws: Workspace, ctx: { actorName: string; nowIso: string }) => void, actorName?: string) => Promise<void>;

  // Ações Operacionais Especializadas
  assignTaskMemberAction: (taskId: ID, memberId: ID | null, actorName?: string) => Promise<void>;
  setTaskImpactFlagsAction: (taskId: ID, flags: ImpactFlag[], actorName?: string) => Promise<void>;
  reorderStagesAction: (orderedIds: ID[], actorName?: string) => Promise<void>;
  moveTaskAction: (taskId: ID, toStageId: ID, toIndex: number, actorName?: string) => Promise<void>;

  // Publicações (Distribuição de Conteúdo)
  upsertPublicationAction: (data: Partial<ContentPublication> & { title: string }, actorName?: string) => Promise<void>;
  deletePublicationAction: (id: ID, actorName?: string) => Promise<void>;
  duplicatePublicationAction: (id: ID, actorName?: string) => Promise<void>;

  // Funil X1
  createFunnelStageAction: (label: string, color?: string, value?: number | null, actorName?: string) => Promise<void>;
  updateFunnelStageAction: (id: ID, patch: Partial<FunnelStage>, actorName?: string) => Promise<void>;
  deleteFunnelStageAction: (id: ID, targetStageId?: ID | null, actorName?: string) => Promise<void>;
  reorderFunnelStagesAction: (orderedIds: ID[], actorName?: string) => Promise<void>;

  // Indicadores
  upsertIndicatorAction: (data: Partial<CustomIndicator> & { name: string; type: CustomIndicator["type"] }, actorName?: string) => Promise<void>;
  deleteIndicatorAction: (id: ID, actorName?: string) => Promise<void>;
  togglePinIndicatorAction: (id: ID, actorName?: string) => Promise<void>;

  // Calculadoras
  updateContentMetricsAction: (patch: Partial<ContentDistributionMetrics>, actorName?: string) => Promise<void>;
  updateHoursCalcAction: (patch: Partial<HoursCalculatorData>, actorName?: string) => Promise<void>;
  updateAdsCalcAction: (patch: Partial<AdsCalculatorData>, actorName?: string) => Promise<void>;

  // Prazos e Execução
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
  filterImpact: null,

  selectedTaskId: null,
  isTaskModalOpen: false,
  deadlineProposal: null,
  isDeadlineModalOpen: false,
  isActivateModalOpen: false,
  isShareModalOpen: false,
  isTemplatesModalOpen: false,
  isReportModalOpen: false,
  isCreateModalOpen: false,
  isEditTemplateModalOpen: false,
  editingTemplateId: null,

  // Cronômetro / Pomodoro
  activeTimer: null,

  startTimer: (taskId, mode = "stopwatch") => {
    const { workspace, activeTimer } = get();
    if (!workspace) return;
    const task = workspace.tasks[taskId];
    if (!task) return;

    // Se já havia um timer rodando para outra tarefa, pausa
    if (activeTimer && activeTimer.taskId !== taskId && activeTimer.isRunning) {
      toast.info(`Cronômetro da tarefa "${activeTimer.taskTitle}" pausado.`);
    }

    set({
      activeTimer: {
        taskId,
        taskTitle: task.title,
        mode,
        startedAt: Date.now(),
        accumulatedMs: (activeTimer && activeTimer.taskId === taskId) ? activeTimer.accumulatedMs : 0,
        isRunning: true,
        pomodoroWorkMinutes: 25,
        pomodoroBreakMinutes: 5,
        isBreak: false,
      },
    });
    toast.success(`⏱️ Cronômetro iniciado: ${task.title}`);
  },

  pauseTimer: () => {
    const { activeTimer } = get();
    if (!activeTimer || !activeTimer.isRunning) return;
    const elapsed = Date.now() - activeTimer.startedAt;
    set({
      activeTimer: {
        ...activeTimer,
        accumulatedMs: activeTimer.accumulatedMs + elapsed,
        isRunning: false,
      },
    });
    toast.info("⏸️ Cronômetro pausado.");
  },

  resumeTimer: () => {
    const { activeTimer } = get();
    if (!activeTimer || activeTimer.isRunning) return;
    set({
      activeTimer: {
        ...activeTimer,
        startedAt: Date.now(),
        isRunning: true,
      },
    });
    toast.info("▶️ Cronômetro retomado.");
  },

  stopAndSaveTimer: async (note = "Sessão de Foco") => {
    const { activeTimer } = get();
    if (!activeTimer) return;

    const currentSessionMs = activeTimer.isRunning ? Date.now() - activeTimer.startedAt : 0;
    const totalMs = activeTimer.accumulatedMs + currentSessionMs;
    const totalMinutes = Math.max(1, Math.round(totalMs / 60000));

    await get().mutate((ws, ctx) => {
      logPomodoroTime(ws, ctx, activeTimer.taskId, totalMinutes, note);
    });

    set({ activeTimer: null });
    toast.success(`⏹️ ${totalMinutes} minuto(s) registrado(s) na tarefa!`);
  },

  resetTimer: () => {
    set({ activeTimer: null });
    toast.info("Cronômetro zerado.");
  },

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

  updateTemplateAction: async (templateId, metaPatch, dataPatch) => {
    try {
      SprintOSRepository.updateTemplate(templateId, metaPatch, dataPatch);
      get().fetchTemplatesList();
      toast.success("Template atualizado com sucesso!");
    } catch (e: any) {
      toast.error(`Erro ao atualizar template: ${e.message}`);
    }
  },

  initWorkspace: async (companyId, workspaceId, actorName = "Engenheiro Operacional") => {
    set({ isLoading: true });
    try {
      await get().fetchWorkspacesList(companyId);
      get().fetchTemplatesList();
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
  setFilterImpact: (flag) => set({ filterImpact: flag }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setIsTaskModalOpen: (open) => set({ isTaskModalOpen: open }),
  setIsDeadlineModalOpen: (open) => set({ isDeadlineModalOpen: open }),
  setIsActivateModalOpen: (open) => set({ isActivateModalOpen: open }),
  setIsShareModalOpen: (open) => set({ isShareModalOpen: open }),
  setIsTemplatesModalOpen: (open) => set({ isTemplatesModalOpen: open }),
  setIsReportModalOpen: (open) => set({ isReportModalOpen: open }),
  setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  setIsEditTemplateModalOpen: (open) => set({ isEditTemplateModalOpen: open }),
  setEditingTemplateId: (id) => set({ editingTemplateId: id }),

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

  setTaskImpactFlagsAction: async (taskId, flags, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        setTaskImpactFlags(ws, ctx, taskId, flags);
      }, actorName);
      toast.success("Flags de impacto atualizadas!");
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

  // Publicações
  upsertPublicationAction: async (data, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        upsertPublication(ws, ctx, data);
      }, actorName);
      toast.success("Publicação salva!");
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  deletePublicationAction: async (id, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        deletePublication(ws, ctx, id);
      }, actorName);
      toast.success("Publicação removida.");
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  duplicatePublicationAction: async (id, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        duplicatePublication(ws, ctx, id);
      }, actorName);
      toast.success("Publicação duplicada!");
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  // Funil X1
  createFunnelStageAction: async (label, color = "#6366F1", value = 0, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        createFunnelStage(ws, ctx, label, color, value);
      }, actorName);
      toast.success(`Etapa "${label}" criada no funil!`);
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  updateFunnelStageAction: async (id, patch, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        updateFunnelStage(ws, ctx, id, patch);
      }, actorName);
      toast.success("Etapa do funil atualizada!");
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  deleteFunnelStageAction: async (id, targetStageId, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        deleteFunnelStage(ws, ctx, id, targetStageId);
      }, actorName);
      toast.success("Etapa removida do funil.");
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  reorderFunnelStagesAction: async (orderedIds, actorName = "Operador") => {
    try {
      await get().mutate((ws, ctx) => {
        reorderFunnelStages(ws, ctx, orderedIds);
      }, actorName);
    } catch (e: any) {
      toast.error(e.message);
    }
  },

  // Indicadores
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
