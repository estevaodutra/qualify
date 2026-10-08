import { create } from "zustand";

export type FloatingCallStatus =
  | "idle"
  | "dialing"
  | "ringing"
  | "on_call"
  | "ended"
  | "no_answer"
  | "failed";

export interface CallDialogData {
  callId: string;
  campaignId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  campaignName: string;
  duration: number;
  notes: string;
  attemptNumber: number;
  maxAttempts: number;
  isPriority: boolean;
  callStatus?: string;
  externalCallId?: string | null;
  audioUrl?: string | null;
  userId?: string;
  operatorId?: string;
}

interface CallFloatingState {
  isOpen: boolean;
  isMinimized: boolean;
  activeCall: CallDialogData | null;
  callStatus: FloatingCallStatus;
  duration: number;
  lastEndedAt: string | null;

  // Actions
  openCall: (data?: Partial<CallDialogData>) => void;
  closeCallDialog: () => void;
  minimizeCallDialog: () => void;
  setActiveCall: (data: CallDialogData | null) => void;
  setCallStatus: (status: FloatingCallStatus) => void;
  setDuration: (duration: number) => void;
  tickDuration: () => void;
  resetCall: () => void;
}

export const useCallFloatingStore = create<CallFloatingState>((set) => ({
  isOpen: false,
  isMinimized: false,
  activeCall: null,
  callStatus: "idle",
  duration: 0,
  lastEndedAt: null,

  openCall: (data) =>
    set((state) => {
      const merged: CallDialogData = {
        callId: data?.callId || state.activeCall?.callId || "",
        campaignId: data?.campaignId || state.activeCall?.campaignId || "",
        leadId: data?.leadId || state.activeCall?.leadId || "",
        leadName: data?.leadName || state.activeCall?.leadName || "Lead",
        leadPhone: data?.leadPhone || state.activeCall?.leadPhone || "",
        campaignName: data?.campaignName || state.activeCall?.campaignName || "Geral",
        duration: data?.duration ?? state.duration,
        notes: data?.notes ?? state.activeCall?.notes ?? "",
        attemptNumber: data?.attemptNumber ?? state.activeCall?.attemptNumber ?? 1,
        maxAttempts: data?.maxAttempts ?? state.activeCall?.maxAttempts ?? 3,
        isPriority: data?.isPriority ?? state.activeCall?.isPriority ?? false,
        callStatus: data?.callStatus || state.callStatus || "idle",
        externalCallId: data?.externalCallId ?? state.activeCall?.externalCallId ?? null,
        audioUrl: data?.audioUrl ?? state.activeCall?.audioUrl ?? null,
        userId: data?.userId ?? state.activeCall?.userId,
        operatorId: data?.operatorId ?? state.activeCall?.operatorId,
      };

      return {
        isOpen: true,
        isMinimized: false,
        activeCall: merged,
      };
    }),

  closeCallDialog: () =>
    set({
      isOpen: false,
      isMinimized: true,
    }),

  minimizeCallDialog: () =>
    set({
      isOpen: false,
      isMinimized: true,
    }),

  setActiveCall: (data) =>
    set((state) => ({
      activeCall: data,
      duration: data?.duration ?? state.duration,
    })),

  setCallStatus: (callStatus) =>
    set((state) => {
      const isEnded = ["ended", "no_answer", "failed"].includes(callStatus);
      return {
        callStatus,
        lastEndedAt: isEnded ? new Date().toISOString() : state.lastEndedAt,
      };
    }),

  setDuration: (duration) => set({ duration }),

  tickDuration: () => set((state) => ({ duration: state.duration + 1 })),

  resetCall: () =>
    set({
      isOpen: false,
      isMinimized: false,
      activeCall: null,
      callStatus: "idle",
      duration: 0,
      lastEndedAt: null,
    }),
}));
