import { useChatExpressStore } from "@/stores/chatExpress.store";
import { ChatExpressSidebar } from "./ChatExpressSidebar";
import { ChatExpressSessionView } from "./ChatExpressSessionView";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatExpressDock() {
  const { isOpen, isMinimized, sessions, activeLeadId, restoreDock, closeAllSessions } = useChatExpressStore();

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
        <Button
          onClick={restoreDock}
          className="h-14 bg-primary text-primary-foreground shadow-2xl rounded-full px-6 flex items-center gap-3 hover:bg-primary/90 transition-all hover:scale-105"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {sessions.length > 0 && (
              <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center rounded-full font-bold shadow-sm">
                {sessions.length}
              </span>
            )}
          </div>
          <span className="font-semibold text-sm">Chats Abertos</span>
        </Button>
      </div>
    );
  }

  const activeSession = sessions.find((s) => s.leadId === activeLeadId);

  return (
    <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-[100] flex flex-col md:flex-row w-full h-[100dvh] md:w-[480px] md:h-[650px] max-h-[100dvh] bg-background/80 backdrop-blur-2xl md:rounded-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] border border-border/40 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
      
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
