import { useState } from "react";
import { MessageSquare, RefreshCw, Loader2, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useChat, useChatMessages } from "@/hooks/useChat";

import InboxList from "@/components/chat/InboxList";
import MessageThread from "@/components/chat/MessageThread";
import ChatComposer from "@/components/chat/ChatComposer";
import LeadContextPanel from "@/components/chat/LeadContextPanel";

export default function Chat() {
  const { activeCompanyId } = useCompany();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  // Hook state logic
  const {
    conversations,
    pipelineStages,
    templates,
    isConversationsLoading,
    refetchConversations,
    sendMessage,
    isSending,
    updateConversationStatus,
    assignOperator,
    updateLeadStage,
  } = useChat();

  // Load selected conversation messages
  const {
    messages,
    isMessagesLoading,
  } = useChatMessages(selectedConvId || undefined);

  // Load operator/team profiles from company_members
  const { data: operators = [], isLoading: isOperatorsLoading } = useQuery({
    queryKey: ["company-members-profiles", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("company_members")
        .select(`
          user_id,
          profiles:profiles(id, full_name, email)
        `)
        .eq("company_id", activeCompanyId)
        .eq("is_active", true);

      if (error) throw error;
      return (data || [])
        .map((m: any) => m.profiles)
        .filter(Boolean)
        .map((p: any) => ({ id: p.id, name: p.full_name || p.email }));
    },
    enabled: !!activeCompanyId,
    staleTime: 300000, // 5 minutes stale time
  });

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  // Send message coordinator
  const handleSendMessage = async (text: string, isInternal: boolean, mediaUrl?: string, mediaType?: string) => {
    if (!selectedConvId) return;
    
    // Automatically assign conversation to operator when they send a message, if it is currently unassigned
    if (selectedConv && !selectedConv.operator_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await assignOperator({ conversationId: selectedConvId, operatorId: user.id });
      }
    }

    return sendMessage({
      conversationId: selectedConvId,
      body: text,
      mediaUrl,
      mediaType,
      isInternal,
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background/30 backdrop-blur-md border border-border/10 rounded-2xl m-4 shadow-xl">
      {/* 1. Unified Inbox Column (Left) */}
      {isConversationsLoading || isOperatorsLoading ? (
        <div className="w-[320px] shrink-0 border-r border-border/40 flex items-center justify-center bg-card/5">
          <div className="text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground font-semibold">Carregando Inbox...</p>
          </div>
        </div>
      ) : (
        <InboxList
          conversations={conversations}
          selectedId={selectedConvId}
          onSelect={(id) => setSelectedConvId(id)}
          operators={operators}
        />
      )}

      {/* 2. Chat Stream Column (Middle) */}
      <div className="flex-1 flex flex-col h-full bg-card/5 overflow-hidden">
        {selectedConv ? (
          <>
            {/* Header info */}
            <div className="p-4 border-b border-border/40 bg-card/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm text-card-foreground leading-snug">
                  {selectedConv.lead?.name || selectedConv.lead?.phone || "Lead Sem Nome"}
                </h3>
                <p className="text-[10px] text-muted-foreground font-mono leading-none mt-0.5">
                  {selectedConv.lead?.phone}
                </p>
              </div>

              {/* Status toggles */}
              <div className="flex gap-2">
                {selectedConv.status !== "resolved" ? (
                  <button
                    onClick={() => updateConversationStatus({ conversationId: selectedConv.id, status: "resolved" })}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 transition-all duration-300 cursor-pointer shadow-sm shadow-green-500/5"
                  >
                    Marcar Resolvido
                  </button>
                ) : (
                  <button
                    onClick={() => updateConversationStatus({ conversationId: selectedConv.id, status: "open" })}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 transition-all duration-300 cursor-pointer shadow-sm shadow-blue-500/5"
                  >
                    Reabrir Conversa
                  </button>
                )}
              </div>
            </div>

            {/* Bubble Messages stream */}
            <MessageThread
              conversation={selectedConv}
              messages={messages}
              isLoading={isMessagesLoading}
            />

            {/* Message composer */}
            <ChatComposer
              onSend={handleSendMessage}
              isSending={isSending}
              templates={templates}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground/60 space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-bounce shadow-md">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-card-foreground">Nenhuma conversa ativa</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Selecione um contato na lista ao lado para iniciar ou continuar o atendimento.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Lead Details Panel Column (Right) */}
      {selectedConv && (
        <LeadContextPanel
          conversation={selectedConv}
          stages={pipelineStages}
          onUpdateStage={updateLeadStage}
        />
      )}
    </div>
  );
}
