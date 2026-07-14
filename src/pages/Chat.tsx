import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, RefreshCw, Loader2, Info, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useChat, useChatMessages, ChatFilters } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

import InboxList from "@/components/chat/InboxList";
import MessageThread from "@/components/chat/MessageThread";
import ChatComposer from "@/components/chat/ChatComposer";
import LeadContextPanel from "@/components/chat/LeadContextPanel";

export default function Chat() {
  const { activeCompanyId } = useCompany();
  const [searchParams] = useSearchParams();
  const phoneParam = searchParams.get("phone");
  const leadIdParam = searchParams.get("leadId");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const [filters, setFilters] = useState<ChatFilters>({
    status: "all",
    operatorId: "all",
    search: phoneParam || "",
  });

  // Hook state logic
  const {
    conversations,
    fetchNextConversations,
    hasNextConversations,
    isFetchingNextConversations,
    pipelineStages,
    templates,
    isConversationsLoading,
    refetchConversations,
    sendMessage,
    isSending,
    updateConversationStatus,
    assignOperator,
    updateLeadStage,
  } = useChat(filters, selectedConvId);

  // Load selected conversation messages
  const {
    messages,
    isMessagesLoading,
    fetchNextMessages,
    hasNextMessages,
    isFetchingNextMessages,
    markAsRead,
  } = useChatMessages(selectedConvId || undefined);

  // Mark as read when conversation is opened
  useEffect(() => {
    if (selectedConvId) {
      markAsRead(selectedConvId).catch(console.error);
    }
  }, [selectedConvId, markAsRead]);

  // Load operator/team profiles from company_members
  const { data: operators = [], isLoading: isOperatorsLoading } = useQuery({
    queryKey: ["company-members-profiles", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data: members, error: memErr } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("company_id", activeCompanyId)
        .eq("is_active", true);

      if (memErr) throw memErr;
      if (!members || members.length === 0) return [];

      const userIds = members.map((m: any) => m.user_id);
      
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
        
      if (profErr) throw profErr;

      return (profiles || []).map((p: any) => ({ id: p.id, name: p.full_name || p.email }));
    },
    enabled: !!activeCompanyId,
    staleTime: 300000, // 5 minutes stale time
  });

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  const [isCreatingConv, setIsCreatingConv] = useState(false);

  // Auto-select conversation if leadIdParam or phoneParam is present
  useEffect(() => {
    if (!selectedConvId && !isConversationsLoading && !isCreatingConv) {
      if (leadIdParam) {
        const match = conversations.find(c => c.lead?.id === leadIdParam);
        if (match) {
          setSelectedConvId(match.id);
        } else {
          setIsCreatingConv(true);
          createConversation({ leadId: leadIdParam })
            .then((newConv) => {
              setSelectedConvId(newConv.id);
            })
            .catch((err) => {
              console.error("Erro ao criar conversa:", err);
              // Fallback se falhar
              if (phoneParam) {
                const phoneMatch = conversations.find(c => c.lead?.phone?.includes(phoneParam));
                if (phoneMatch) setSelectedConvId(phoneMatch.id);
              }
            })
            .finally(() => setIsCreatingConv(false));
        }
      } else if (phoneParam) {
        const match = conversations.find(c => {
          const p = c.lead?.phone || "";
          return p.includes(phoneParam) || phoneParam.includes(p);
        });
        if (match) {
          setSelectedConvId(match.id);
        }
      }
    }
  }, [leadIdParam, phoneParam, selectedConvId, isConversationsLoading, conversations, createConversation, isCreatingConv]);

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
      <div className={cn(
        "shrink-0 border-r border-border/40 h-full",
        "w-full md:w-[320px]",
        selectedConvId ? "hidden md:block" : "block"
      )}>
        {isConversationsLoading || isOperatorsLoading ? (
          <div className="h-full flex items-center justify-center bg-card/5">
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
            filters={filters}
            setFilters={setFilters}
            fetchNextPage={fetchNextConversations}
            hasNextPage={hasNextConversations}
            isFetchingNextPage={isFetchingNextConversations}
          />
        )}
      </div>

      {/* 2. Chat Stream Column (Middle) */}
      <div className={cn(
        "flex-1 flex flex-col h-full bg-card/5 overflow-hidden relative",
        !selectedConvId ? "hidden md:flex" : "flex"
      )}>
        {selectedConv ? (
          <>
            {/* Header info */}
            <div className="p-4 border-b border-border/40 bg-card/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden p-1.5 -ml-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h3 className="font-bold text-sm text-card-foreground leading-snug">
                    {selectedConv.lead?.name || selectedConv.lead?.phone || "Lead Sem Nome"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono leading-none mt-0.5">
                    {selectedConv.lead?.phone}
                  </p>
                </div>
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
              fetchNextMessages={fetchNextMessages}
              hasNextMessages={hasNextMessages}
              isFetchingNextMessages={isFetchingNextMessages}
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
        <div className="hidden lg:block h-full shrink-0">
          <LeadContextPanel
            conversation={selectedConv}
            stages={pipelineStages}
          />
        </div>
      )}
    </div>
  );
}
