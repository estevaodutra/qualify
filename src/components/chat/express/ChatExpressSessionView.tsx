import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useChatMessages } from "@/hooks/useChat";
import { useChatExpress } from "@/hooks/useChatExpress";
import { useChatExpressStore, ChatExpressSession } from "@/stores/chatExpress.store";
import { useInstances } from "@/hooks/useInstances";
import ChatComposer from "@/components/chat/ChatComposer";
import MessageThread from "@/components/chat/MessageThread";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Minimize2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatExpressSessionViewProps {
  session: ChatExpressSession;
}

export function ChatExpressSessionView({ session }: ChatExpressSessionViewProps) {
  const { resolveConversation, sendMessage, isSending } = useChatExpress();
  const { updateSession, closeSession, minimizeDock } = useChatExpressStore();
  const { instances } = useInstances();
  const [localInstanceId, setLocalInstanceId] = useState<string>(session.instanceId || "");

  useEffect(() => {
    if (session.isResolvingConversation) {
      resolveConversation(session.leadId);
    }
  }, [session.leadId, session.isResolvingConversation, resolveConversation]);

  useEffect(() => {
    if (session.instanceId && session.instanceId !== localInstanceId) {
       setLocalInstanceId(session.instanceId);
    }
  }, [session.instanceId]);

  const {
    messages,
    isLoading: isLoadingMessages,
    fetchNextMessages,
    hasNextMessages,
    isFetchingNextMessages
  } = useChatMessages(session.conversationId || undefined);

  const handleSend = async (text: string, isInternal: boolean, mediaUrl?: string, mediaType?: string) => {
    await sendMessage({
      leadId: session.leadId,
      body: text,
      mediaUrl,
      mediaType,
      isInternal,
      instanceId: localInstanceId || undefined
    });
  };

  const connectedInstances = instances.filter(i => i.status === "connected");

  return (
    <div className="flex-1 flex flex-col bg-background/50 backdrop-blur-xl relative z-10 overflow-hidden h-full">
      {/* Header */}
      <div className="h-16 border-b border-border/40 bg-card/50 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <Avatar className="w-9 h-9 rounded-xl border border-border/50">
            <AvatarImage src={session.avatarUrl || ""} alt={session.leadName} />
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
              {session.leadName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm text-foreground truncate">{session.leadName}</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground truncate">{session.phone || "Sem telefone"}</span>
              <div className="w-1 h-1 bg-border rounded-full" />
              <Select value={localInstanceId} onValueChange={(val) => {
                 setLocalInstanceId(val);
                 updateSession(session.leadId, { instanceId: val });
              }}>
                <SelectTrigger className="h-5 p-0 border-0 bg-transparent text-[11px] font-medium text-muted-foreground hover:text-foreground shadow-none focus:ring-0 gap-1 min-w-0 w-auto">
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent className="z-[150]">
                  {connectedInstances.map(inst => (
                    <SelectItem key={inst.id} value={inst.id} className="text-xs">{inst.name}</SelectItem>
                  ))}
                  {connectedInstances.length === 0 && (
                    <SelectItem value="none" disabled className="text-xs">Nenhuma instância conectada</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={minimizeDock} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground">
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => closeSession(session.leadId)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {session.isResolvingConversation ? (
           <div className="flex-1 flex flex-col items-center justify-center">
             <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-2" />
             <span className="text-xs text-muted-foreground">Resolvendo conversa...</span>
           </div>
        ) : session.hasExistingConversation && session.conversationId ? (
            <MessageThread
              conversation={{ id: session.conversationId, lead_id: session.leadId, status: "open", company_id: "", unread_count: 0, instance_id: localInstanceId, channel: "whatsapp" } as any}
              messages={messages as any}
              isLoading={isLoadingMessages}
              onLoadMore={fetchNextMessages}
              hasNextPage={hasNextMessages}
              isFetchingNextPage={isFetchingNextMessages}
            />
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
               <AlertCircle className="w-6 h-6" />
             </div>
             <h3 className="font-semibold text-foreground mb-1">Nenhuma conversa iniciada</h3>
             <p className="text-sm text-muted-foreground max-w-[250px]">
               Envie a primeira mensagem abaixo para começar o atendimento com {session.leadName}.
             </p>
           </div>
        )}
      </div>

      {/* Composer */}
      <ChatComposer
        onSend={handleSend}
        isSending={isSending}
        templates={[]}
      />
    </div>
  );
}
