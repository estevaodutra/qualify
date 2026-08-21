import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, RefreshCw, Loader2, Info, ChevronLeft, Smartphone, Radio, Eye, EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useChat, useChatMessages, ChatFilters } from "@/hooks/useChat";
import { useInstances } from "@/hooks/useInstances";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { toast } from "sonner";
import InboxList from "@/components/chat/InboxList";
import MessageThread from "@/components/chat/MessageThread";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatSidebar, { ChatSidebarMode } from "@/components/chat/ChatSidebar";
import LeadPipelineSummary from "@/components/chat/pipeline/LeadPipelineSummary";
import { QuickReply } from "@/types/quickReplyTypes";

import { AdvancedChatFilters, DEFAULT_ADVANCED_CHAT_FILTERS } from "@/types/chatFilterTypes";

export default function Chat() {
  const { activeCompanyId } = useCompany();
  const [searchParams] = useSearchParams();
  const phoneParam = searchParams.get("phone");
  const leadIdParam = searchParams.get("leadId");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [sidebarMode, setSidebarMode] = useState<ChatSidebarMode>("quick_replies");
  const [selectedQuickReply, setSelectedQuickReply] = useState<QuickReply | null>(null);

  // Reset sidebar to quick_replies when switching conversation
  useEffect(() => {
    setSidebarMode("quick_replies");
  }, [selectedConvId]);

  const [filters, setFilters] = useState<AdvancedChatFilters>({
    ...DEFAULT_ADVANCED_CHAT_FILTERS,
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
    updateConversationInstance,
    assignOperator,
    updateLeadStage,
    createConversation,
  } = useChat(filters, selectedConvId);

  const { instances = [] } = useInstances();

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

    // If conversation doesn't have an instance assigned and sending outbound message, assign default connected instance
    if (selectedConv && !selectedConv.instance_id && !isInternal) {
      const connectedInst = instances.find(i => i.status === "connected") || instances[0];
      if (connectedInst) {
        await updateConversationInstance({ conversationId: selectedConvId, instanceId: connectedInst.id });
      } else {
        toast.error("Selecione uma instância para enviar a mensagem");
        return;
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
    <div className="flex h-full w-full overflow-hidden bg-background/30 backdrop-blur-md border border-border/10 rounded-2xl shadow-xl">
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
            instances={instances}
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
            <div className="p-3.5 px-4 border-b border-border/40 bg-card/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button 
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden p-1.5 -ml-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="font-bold text-sm text-card-foreground leading-snug truncate">
                      {selectedConv.lead?.name || selectedConv.lead?.phone || "Lead Sem Nome"}
                    </h3>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setSidebarMode(prev => prev === "quick_replies" ? "lead_details" : "quick_replies")}
                            className={cn(
                              "p-1 rounded-lg transition-all duration-200 cursor-pointer shrink-0",
                              sidebarMode === "lead_details"
                                ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs font-semibold z-[10000]">
                          {sidebarMode === "quick_replies" ? "Ver detalhes do lead" : "Voltar para respostas rápidas"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Below Name: Phone + Connection/Instance Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedConv.lead?.phone && (
                      <span className="text-[11px] text-muted-foreground font-mono leading-none">
                        {selectedConv.lead?.phone}
                      </span>
                    )}

                    {selectedConv.lead?.phone && (
                      <span className="text-muted-foreground/30 text-[10px]">•</span>
                    )}

                    {/* Instance Connection Selector */}
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={selectedConv.instance_id || "none"}
                        onValueChange={(val) => {
                          updateConversationInstance({
                            conversationId: selectedConv.id,
                            instanceId: val === "none" ? null : val,
                          });
                        }}
                      >
                        <SelectTrigger className="h-6 px-2 py-0.5 text-[11px] font-medium bg-background/60 hover:bg-background border-border/50 rounded-lg shadow-none focus:ring-0 gap-1.5 min-w-0 w-auto">
                          <div className="flex items-center gap-1.5 truncate">
                            {selectedConv.instance_id ? (
                              <>
                                <span className={cn(
                                  "h-2 w-2 rounded-full shrink-0",
                                  selectedConv.instance?.status === "connected" || instances.find(i => i.id === selectedConv.instance_id)?.status === "connected"
                                    ? "bg-emerald-500 animate-pulse"
                                    : "bg-amber-500"
                                )} />
                                <span className="font-semibold text-card-foreground truncate max-w-[170px]">
                                  {selectedConv.instance?.name || instances.find(i => i.id === selectedConv.instance_id)?.name || "Instância Conectada"}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 animate-ping" />
                                <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                  <Radio className="h-3 w-3" />
                                  Selecionar Conexão
                                </span>
                              </>
                            )}
                          </div>
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="none" className="text-xs text-muted-foreground">
                            Nenhuma Conexão
                          </SelectItem>
                          {instances.map((inst) => (
                            <SelectItem key={inst.id} value={inst.id} className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "h-2 w-2 rounded-full shrink-0",
                                  inst.status === "connected" ? "bg-emerald-500" : "bg-muted-foreground/40"
                                )} />
                                <span className="font-medium">{inst.name}</span>
                                {inst.phoneNumber && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    ({inst.phoneNumber})
                                  </span>
                                )}
                                {inst.status === "connected" ? (
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-0.2 rounded font-bold">
                                    Conectado
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-muted px-1 py-0.2 rounded text-muted-foreground">
                                    Desconectado
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Lead Pipeline Summary */}
                  <LeadPipelineSummary
                    leadId={selectedConv.lead?.id}
                    leadName={selectedConv.lead?.name || selectedConv.lead?.phone}
                  />
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
              leadId={selectedConv?.lead?.id}
              externalQuickReply={selectedQuickReply}
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

      {/* 3. Chat Sidebar Column (Right) */}
      {selectedConv && (
        <div className="hidden lg:block h-full shrink-0">
          <ChatSidebar
            conversation={selectedConv}
            stages={pipelineStages}
            sidebarMode={sidebarMode}
            onSetSidebarMode={setSidebarMode}
            onSelectQuickReply={(reply) => {
              setSelectedQuickReply(reply);
              setTimeout(() => setSelectedQuickReply(null), 100);
            }}
          />
        </div>
      )}
    </div>
  );
}
