import { useChatExpressStore } from "@/stores/chatExpress.store";
import { useCallFloatingStore } from "@/stores/callFloating.store";
import { ChatExpressSidebar } from "./ChatExpressSidebar";
import { ChatExpressSessionView } from "./ChatExpressSessionView";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatExpressDock() {
  const { isOpen, isMinimized, sessions, activeLeadId, restoreDock, closeAllSessions } = useChatExpressStore();
  const isCallCardOpen = useCallFloatingStore((s) => s.isOpen && !!s.activeCall);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          isCallCardOpen
            ? "bottom-4 md:bottom-6 right-4 md:right-[525px]"
            : "bottom-4 md:bottom-6 right-[72px] md:right-[88px]"
        )}
      >
        <Button
          onClick={restoreDock}
          title="Chats Abertos"
          size="icon"
          className="h-12 w-12 md:h-14 md:w-14 bg-gradient-to-tr from-[#7C3AED] to-[#3B4DFF] hover:opacity-95 text-white shadow-[0_8px_30px_rgb(0,0,0,0.18)] hover:shadow-[0_12px_36px_rgba(99,102,241,0.35)] rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 relative border-2 border-white/20"
        >
          <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
          {sessions.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center rounded-full font-bold shadow-md ring-2 ring-white dark:ring-slate-900 animate-in zoom-in">
              {sessions.length}
            </span>
          )}
        </Button>
      </div>
    );
  }

  const activeSession = sessions.find((s) => s.leadId === activeLeadId);

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-[100] flex flex-col md:flex-row w-full h-[100dvh] md:w-[480px] md:h-[650px] max-h-[100dvh] bg-background/80 backdrop-blur-2xl md:rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] border border-border/40 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 transition-all ease-out",
        isCallCardOpen ? "md:bottom-5 md:right-[525px]" : "md:bottom-6 md:right-6"
      )}
    >
      {/* Mobile Header (Only visible on small screens to close) */}
      <div className="md:hidden h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <span className="font-semibold text-sm flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" /> Chat Express
        </span>
        <Button variant="ghost" size="icon" onClick={closeAllSessions} className="w-8 h-8 -mr-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ChatExpressSidebar />
      
      {activeSession ? (
        <ChatExpressSessionView key={activeSession.leadId} session={activeSession} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-background/50 p-6 text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-foreground">Nenhuma conversa selecionada</h3>
          <p className="text-sm text-muted-foreground max-w-[200px] mt-1">
            Selecione um lead no menu lateral para iniciar o atendimento.
          </p>
        </div>
      )}
    </div>
  );
}
