import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatExpressSession {
  leadId: string;
  conversationId?: string | null;
  leadName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  instanceId?: string | null;
  channel: "whatsapp";
  hasExistingConversation: boolean;
  isResolvingConversation: boolean;
  unreadCount: number;
  draft: string;
  scrollPosition?: number;
}

interface ChatExpressState {
  isOpen: boolean;
  isMinimized: boolean;
  activeLeadId: string | null;
  sessions: ChatExpressSession[];
  
  // Actions
  openLeadSession: (lead: Partial<ChatExpressSession> & { leadId: string; leadName: string }) => void;
  activateSession: (leadId: string) => void;
  closeSession: (leadId: string) => void;
  closeAllSessions: () => void;
  minimizeDock: () => void;
  restoreDock: () => void;
  updateSession: (leadId: string, patch: Partial<ChatExpressSession>) => void;
  setDraft: (leadId: string, draft: string) => void;
}

export const useChatExpressStore = create<ChatExpressState>()(
  persist(
    (set) => ({
      isOpen: false,
      isMinimized: false,
      activeLeadId: null,
      sessions: [],

      openLeadSession: (lead) => {
        set((state) => {
          const existing = state.sessions.find((s) => s.leadId === lead.leadId);
          if (existing) {
            return {
              isOpen: true,
              isMinimized: false,
              activeLeadId: lead.leadId,
            };
          }
          return {
            isOpen: true,
            isMinimized: false,
            activeLeadId: lead.leadId,
            sessions: [
              ...state.sessions,
              {
                leadId: lead.leadId,
                conversationId: null,
                leadName: lead.leadName,
                phone: lead.phone || null,
                avatarUrl: lead.avatarUrl || null,
                instanceId: null,
                channel: "whatsapp",
                hasExistingConversation: false,
                isResolvingConversation: true,
                unreadCount: 0,
                draft: "",
                ...lead, // Allow overriding properties
              },
            ],
          };
        });
      },

      activateSession: (leadId) => {
        set((state) => {
          if (state.sessions.some(s => s.leadId === leadId)) {
             return { activeLeadId: leadId, isMinimized: false };
          }
          return state;
        });
      },

      closeSession: (leadId) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.leadId !== leadId);
          
          if (newSessions.length === 0) {
            return {
              sessions: [],
              activeLeadId: null,
              isOpen: false,
              isMinimized: false,
            };
          }

          if (state.activeLeadId === leadId) {
            return {
              sessions: newSessions,
              activeLeadId: newSessions[newSessions.length - 1].leadId,
            };
          }

          return { sessions: newSessions };
        });
      },

      closeAllSessions: () => {
        set({ sessions: [], activeLeadId: null, isOpen: false, isMinimized: false });
      },

      minimizeDock: () => set({ isMinimized: true }),
      
      restoreDock: () => set({ isMinimized: false, isOpen: true }),

      updateSession: (leadId, patch) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.leadId === leadId ? { ...s, ...patch } : s
          ),
        }));
      },

      setDraft: (leadId, draft) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.leadId === leadId ? { ...s, draft } : s
          ),
        }));
      },
    }),
    {
      name: 'chat-express-storage',
      partialize: (state) => ({ 
        sessions: state.sessions, 
        activeLeadId: state.activeLeadId,
        isOpen: state.isOpen,
        isMinimized: state.isMinimized 
      })
    }
  )
);
