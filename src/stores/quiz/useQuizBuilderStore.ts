// src/stores/quiz/useQuizBuilderStore.ts
import { create } from "zustand";
import { QuizFunnel, QuizStep, QuizComponent, QuizDesignConfig } from "@/types/quiz";

export type SaveStatus = "saved" | "saving" | "dirty" | "error" | "offline";
export type DeviceMode = "mobile" | "tablet" | "desktop";
export type InspectorTab = "content" | "style" | "spacing" | "responsive" | "behavior" | "conditions" | "data";

interface HistoryState {
  steps: QuizStep[];
  components: QuizComponent[];
  designConfig: QuizDesignConfig;
}

interface QuizBuilderStore {
  // Funnel & Current Document State
  funnel: QuizFunnel | null;
  steps: QuizStep[];
  components: QuizComponent[];
  designConfig: QuizDesignConfig | null;

  // Sidebar Toggles
  isStepSidebarOpen: boolean;
  isLibraryOpen: boolean;
  toggleStepSidebar: () => void;
  toggleLibrary: () => void;

  // Active Selections
  activeStepId: string | null;
  activeComponentId: string | null;
  activeTab: InspectorTab;

  // Environment & Viewport State
  deviceMode: DeviceMode;
  isPreviewMode: boolean;
  zoomLevel: number;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;

  // Undo / Redo History
  history: HistoryState[];
  historyIndex: number;

  // Actions
  setFunnel: (funnel: QuizFunnel) => void;
  setSteps: (steps: QuizStep[]) => void;
  setComponents: (components: QuizComponent[]) => void;
  setDesignConfig: (config: QuizDesignConfig) => void;

  setActiveStepId: (stepId: string | null) => void;
  setActiveComponentId: (componentId: string | null) => void;
  setActiveTab: (tab: InspectorTab) => void;

  setDeviceMode: (mode: DeviceMode) => void;
  setIsPreviewMode: (preview: boolean) => void;
  setZoomLevel: (zoom: number) => void;
  setSaveStatus: (status: SaveStatus) => void;

  // Document Mutators with History Push
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Step Operations
  addStep: (step: QuizStep) => void;
  updateStep: (id: string, updates: Partial<QuizStep>) => void;
  deleteStep: (id: string) => void;
  reorderSteps: (orderedIds: string[]) => void;

  // Component Operations
  addComponent: (component: QuizComponent) => void;
  updateComponent: (id: string, updates: Partial<QuizComponent>) => void;
  deleteComponent: (id: string) => void;
  reorderComponents: (stepId: string, orderedIds: string[]) => void;
  duplicateComponent: (id: string) => void;
}

export const useQuizBuilderStore = create<QuizBuilderStore>((set, get) => ({
  funnel: null,
  steps: [],
  components: [],
  designConfig: null,

  isStepSidebarOpen: true,
  isLibraryOpen: true,
  toggleStepSidebar: () => set((state) => ({ isStepSidebarOpen: !state.isStepSidebarOpen })),
  toggleLibrary: () => set((state) => ({ isLibraryOpen: !state.isLibraryOpen })),

  activeStepId: null,
  activeComponentId: null,
  activeTab: "content",

  deviceMode: "mobile",
  isPreviewMode: false,
  zoomLevel: 100,
  saveStatus: "saved",
  lastSavedAt: null,

  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,

  setFunnel: (funnel) => set({ funnel, designConfig: funnel.designConfig }),
  setSteps: (steps) => {
    set({ steps });
    if (!get().activeStepId && steps.length > 0) {
      set({ activeStepId: steps[0].id });
    }
  },
  setComponents: (components) => set({ components }),
  setDesignConfig: (config) => {
    set({ designConfig: config, saveStatus: "dirty" });
  },

  setActiveStepId: (activeStepId) => set({ activeStepId, activeComponentId: null }),
  setActiveComponentId: (activeComponentId) => set({ activeComponentId }),
  setActiveTab: (activeTab) => set({ activeTab }),

  setDeviceMode: (deviceMode) => set({ deviceMode }),
  setIsPreviewMode: (isPreviewMode) => set({ isPreviewMode }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  setSaveStatus: (saveStatus) => set({
    saveStatus,
    lastSavedAt: saveStatus === "saved" ? new Date() : get().lastSavedAt
  }),

  pushHistory: () => {
    const { steps, components, designConfig, history, historyIndex } = get();
    if (!designConfig) return;

    const snapshot: HistoryState = {
      steps: JSON.parse(JSON.stringify(steps)),
      components: JSON.parse(JSON.stringify(components)),
      designConfig: JSON.parse(JSON.stringify(designConfig)),
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);

    if (newHistory.length > 30) newHistory.shift();

    const newIndex = newHistory.length - 1;
    set({
      history: newHistory,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: false,
      saveStatus: "dirty",
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;

    const prevIndex = historyIndex - 1;
    const target = history[prevIndex];

    set({
      steps: target.steps,
      components: target.components,
      designConfig: target.designConfig,
      historyIndex: prevIndex,
      canUndo: prevIndex > 0,
      canRedo: true,
      saveStatus: "dirty",
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;

    const nextIndex = historyIndex + 1;
    const target = history[nextIndex];

    set({
      steps: target.steps,
      components: target.components,
      designConfig: target.designConfig,
      historyIndex: nextIndex,
      canUndo: true,
      canRedo: nextIndex < history.length - 1,
      saveStatus: "dirty",
    });
  },

  addStep: (step) => {
    get().pushHistory();
    set((state) => ({
      steps: [...state.steps, step],
      activeStepId: step.id,
      saveStatus: "dirty",
    }));
  },

  updateStep: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      steps: state.steps.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      saveStatus: "dirty",
    }));
  },

  deleteStep: (id) => {
    get().pushHistory();
    set((state) => {
      const remainingSteps = state.steps.filter((s) => s.id !== id);
      const remainingComponents = state.components.filter((c) => c.stepId !== id);
      const nextActiveStepId = state.activeStepId === id ? (remainingSteps[0]?.id || null) : state.activeStepId;

      return {
        steps: remainingSteps,
        components: remainingComponents,
        activeStepId: nextActiveStepId,
        activeComponentId: null,
        saveStatus: "dirty",
      };
    });
  },

  reorderSteps: (orderedIds) => {
    get().pushHistory();
    set((state) => {
      const reordered = [...state.steps].sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id));
      return {
        steps: reordered.map((s, idx) => ({ ...s, stepOrder: idx })),
        saveStatus: "dirty",
      };
    });
  },

  addComponent: (component) => {
    get().pushHistory();
    set((state) => ({
      components: [...state.components, component],
      activeComponentId: component.id,
      saveStatus: "dirty",
    }));
  },

  updateComponent: (id, updates) => {
    get().pushHistory();
    set((state) => ({
      components: state.components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      saveStatus: "dirty",
    }));
  },

  deleteComponent: (id) => {
    get().pushHistory();
    set((state) => ({
      components: state.components.filter((c) => c.id !== id),
      activeComponentId: state.activeComponentId === id ? null : state.activeComponentId,
      saveStatus: "dirty",
    }));
  },

  reorderComponents: (stepId, orderedIds) => {
    get().pushHistory();
    set((state) => {
      const stepComponents = state.components.filter((c) => c.stepId === stepId);
      const otherComponents = state.components.filter((c) => c.stepId !== stepId);

      const reordered = [...stepComponents].sort(
        (a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)
      );

      return {
        components: [
          ...otherComponents,
          ...reordered.map((c, idx) => ({ ...c, componentOrder: idx })),
        ],
        saveStatus: "dirty",
      };
    });
  },

  duplicateComponent: (id) => {
    const { components, addComponent } = get();
    const source = components.find((c) => c.id === id);
    if (!source) return;

    const duplicate: QuizComponent = {
      ...JSON.parse(JSON.stringify(source)),
      id: crypto.randomUUID(),
      componentOrder: source.componentOrder + 1,
    };

    addComponent(duplicate);
  },
}));
