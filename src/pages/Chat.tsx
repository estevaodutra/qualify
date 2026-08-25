import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, RefreshCw, Loader2, Info, ChevronLeft, Smartphone, Radio, Eye, Zap, Pin, Archive, UserPlus, Users } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { toast } from "sonner";
import InboxList from "@/components/chat/InboxList";
import MessageThread from "@/components/chat/MessageThread";
import ChatComposer from "@/components/chat/ChatComposer";
import ChatSidebar, { ChatSidebarMode } from "@/components/chat/ChatSidebar";
import QuickRepliesSidebarPanel from "@/components/chat/quick-replies/QuickRepliesSidebarPanel";
import LeadContextPanel from "@/components/chat/LeadContextPanel";
import GroupContextPanel from "@/components/chat/group/GroupContextPanel";
import LeadPipelineSummary from "@/components/chat/pipeline/LeadPipelineSummary";
import ConversationActionsMenu from "@/components/chat/actions/ConversationActionsMenu";
import { useConversationActions } from "@/hooks/useConversationActions";
import { QuickReply } from "@/types/quickReplyTypes";

import { AdvancedChatFilters, DEFAULT_ADVANCED_CHAT_FILTERS } from "@/types/chatFilterTypes";

export default function Chat() {
  const { activeCompanyId } = useCompany();
  const [searchParams] = useSearchParams();
  const phoneParam = searchParams.get("phone");
  const leadIdParam = searchParams.get("leadId");
  const conversationIdParam = searchParams.get("conversationId");

  const [selectedConvId, setSelectedConvId] = useState<string | null>(conversationIdParam || null);
  const [sidebarMode, setSidebarMode] = useState<ChatSidebarMode>("quick_replies");
  const [selectedQuickReply, setSelectedQuickReply] = useState<QuickReply | null>(null);

  // Mobile Sheet states
  const [mobileQuickRepliesOpen, setMobileQuickRepliesOpen] = useState(false);
  const [mobileLeadDetailsOpen, setMobileLeadDetailsOpen] = useState(false);

  // Handle mobile selection with browser history state integration
  const handleSelectConv = (id: string | null) => {
    if (id && window.innerWidth < 768) {
      window.history.pushState({ chatConversationId: id }, "");
    }
    setSelectedConvId(id);
  };

  // Listen to popstate event (mobile back gesture / browser back)
  useEffect(() => {
    const handlePopState = () => {
      if (selectedConvId && window.innerWidth < 768) {
        setSelectedConvId(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedConvId]);

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
    archivedCount,
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
  const { createLeadFromConversation, isCreatingLead } = useConversationActions();

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
    staleTime: 300000,
  });

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  // Find all conversations belonging to the currently selected lead
  const leadConversations = useMemo(() => {
    if (!selectedConv?.lead_id) return [];
    return conversations.filter((c) => c.lead_id === selectedConv.lead_id);
  }, [conversations, selectedConv?.lead_id]);

  // Handle switching instance connection without database unique constraint errors
  const handleSwitchInstance = async (val: string) => {
    if (!selectedConv) return;
    const targetInstanceId = val === "none" ? null : val;

    const existingConv = conversations.find(
      (c) => c.lead_id === selectedConv.lead_id && (targetInstanceId === null ? c.instance_id === null : c.instance_id === targetInstanceId)
    );

    if (existingConv) {
      handleSelectConv(existingConv.id);
      toast.success(`Alternado para a conversa na conexão ${existingConv.instance?.name || "selecionada"}`);
      return;
    }

    try {
      const updated = await updateConversationInstance({
        conversationId: selectedConv.id,
        instanceId: targetInstanceId,
      });
      if (updated?.id) {
        handleSelectConv(updated.id);
        toast.success("Conexão atualizada com sucesso");
      }
    } catch (err: any) {
      if (err?.message?.includes("duplicate key value") || err?.code === "23505") {
        const { data: dbConv } = await supabase
          .from("chat_conversations")
          .select("id")
          .eq("company_id", activeCompanyId)
          .eq("lead_id", selectedConv.lead_id)
          .eq("instance_id", targetInstanceId)
          .maybeSingle();

        if (dbConv?.id) {
          handleSelectConv(dbConv.id);
          toast.success("Alternado para a conversa existente nesta conexão.");
          refetchConversations();
        } else {
          toast.error("Erro ao alterar conexão.");
        }
      } else {
        toast.error(`Erro ao trocar conexão: ${err.message}`);
      }
    }
  };

  const [isCreatingConv, setIsCreatingConv] = useState(false);

  // Auto-select conversation if conversationIdParam, leadIdParam or phoneParam is present
  useEffect(() => {
    if (!selectedConvId && !isConversationsLoading && !isCreatingConv) {
      if (conversationIdParam) {
        handleSelectConv(conversationIdParam);
      } else if (leadIdParam) {
        const match = conversations.find(c => c.lead?.id === leadIdParam);
        if (match) {
          handleSelectConv(match.id);
        } else {
          setIsCreatingConv(true);
          createConversation({ leadId: leadIdParam })
            .then((newConv) => {
              handleSelectConv(newConv.id);
            })
            .catch((err) => {
              console.error("Erro ao criar conversa:", err);
              if (phoneParam) {
                const phoneMatch = conversations.find(c => c.lead?.phone?.includes(phoneParam));
                if (phoneMatch) handleSelectConv(phoneMatch.id);
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
          handleSelectConv(match.id);
        }
      }
    }
  }, [conversationIdParam, leadIdParam, phoneParam, selectedConvId, isConversationsLoading, conversations, createConversation, isCreatingConv]);

  // Send message coordinator
  const handleSendMessage = async (text: string, isInternal: boolean, mediaUrl?: string, mediaType?: string) => {
    if (!selectedConvId) return;
    
    if (selectedConv && !selectedConv.operator_id) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await assignOperator({ conversationId: selectedConvId, operatorId: user.id });
      }
    }

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

  const handleBackToInbox = () => {
    if (window.history.state?.chatConversationId) {
      window.history.back();
    } else {
      setSelectedConvId(null);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background/30 backdrop-blur-md border-0 md:border border-border/10 rounded-none md:rounded-2xl shadow-xl">
      {/* 1. Unified Inbox Column (Left) */}
      <div className={cn(
        "shrink-0 border-r border-border/40 h-full transition-all duration-300",
        "w-full md:w-[320px] lg:w-[360px]",
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
            archivedCount={archivedCount}
            selectedId={selectedConvId}
            onSelect={handleSelectConv}
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
        "flex-1 flex flex-col h-full bg-card/5 overflow-hidden relative min-w-0",
        !selectedConvId ? "hidden md:flex" : "flex"
      )}>
        {selectedConv ? (
          <>
            {/* Header info */}
            <div className="p-3 px-3.5 md:p-3.5 md:px-4 border-b border-border/40 bg-card/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                {/* Mobile back button ← */}
                <button 
                  onClick={handleBackToInbox}
                  className="md:hidden p-1.5 -ml-1 rounded-xl text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1 font-bold text-xs shrink-0"
                  aria-label="Voltar para a caixa de entrada"
                >
                  <ChevronLeft className="h-5 w-5 text-primary" />
                </button>

                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {selectedConv.is_pinned && (
                      <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-500/20" title="Conversa Fixada" />
                    )}
                    {(() => {
                      const p = selectedConv.lead?.phone || selectedConv.contact_phone || "";
                      const c = (selectedConv.lead?.custom_fields as Record<string, any>) || {};
                      const isGrp = p.length > 15 || p.includes("@g.us") || p.includes("-group") || c.is_group === true;
                      return (
                        <div
                          onClick={() => setSidebarMode(prev => prev === "quick_replies" ? "lead_details" : "quick_replies")}
                          className="flex items-center gap-1.5 min-w-0 cursor-pointer group"
                          title={isGrp ? "Clique para ver dados do grupo" : "Clique para ver dados do lead"}
                        >
                          {isGrp && (
                            <div className="p-0.5 rounded bg-purple-500/10 text-purple-600 shrink-0">
                              <Users className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <h3 className="font-bold text-sm text-card-foreground leading-snug truncate group-hover:text-primary transition-colors">
                            {selectedConv.lead?.name || selectedConv.contact_name || (isGrp ? "Grupo WhatsApp" : "Lead Sem Nome")}
                          </h3>
                        </div>
                      );
                    })()}
                    {selectedConv.is_archived && (
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20 shrink-0">
                        Arquivada
                      </span>
                    )}

                    {/* Desktop Eye button */}
                    <div className="hidden lg:block">
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
                            {(() => {
                              const p = selectedConv.lead?.phone || selectedConv.contact_phone || "";
                              const c = (selectedConv.lead?.custom_fields as Record<string, any>) || {};
                              const isGrp = p.length > 15 || p.includes("@g.us") || p.includes("-group") || c.is_group === true;
                              return sidebarMode === "quick_replies" 
                                ? (isGrp ? "Ver dados do grupo" : "Ver detalhes do lead")
                                : "Voltar para respostas rápidas";
                            })()}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {/* Mobile Eye / Details button */}
                    <button
                      type="button"
                      onClick={() => setMobileLeadDetailsOpen(true)}
                      className="lg:hidden p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                      title="Detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {/* Mobile Quick Replies trigger */}
                    <button
                      type="button"
                      onClick={() => setMobileQuickRepliesOpen(true)}
                      className="lg:hidden p-1 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors shrink-0"
                      title="Respostas Rápidas"
                    >
                      <Zap className="h-4 w-4 fill-amber-500/20" />
                    </button>
                  </div>

                  {/* Below Name: Phone + Connection/Instance Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedConv.lead?.phone && (
                      <span className="text-[11px] text-muted-foreground font-mono leading-none">
                        {selectedConv.lead?.phone}
                      </span>
                    )}

                    {selectedConv.lead?.phone && (
                      <span className="text-muted-foreground/30 text-[10px] hidden sm:inline">•</span>
                    )}

                    {/* Instance Connection Selector */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Select
                        value={selectedConv.instance_id || "none"}
                        onValueChange={handleSwitchInstance}
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
                                <span className="font-semibold text-card-foreground truncate max-w-[120px] sm:max-w-[170px]">
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
                          {instances.map((inst) => {
                            const hasHistory = leadConversations.some(c => c.instance_id === inst.id);
                            return (
                              <SelectItem key={inst.id} value={inst.id} className="text-xs">
                                <div className="flex items-center justify-between gap-3 w-full">
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
                                  </div>
                                  {hasHistory && (
                                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold">
                                      Histórico
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status toggles & Conversation Actions Menu */}
              <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                {selectedConv.status !== "resolved" ? (
                  <button
                    onClick={() => updateConversationStatus({ conversationId: selectedConv.id, status: "resolved" })}
                    className="px-2.5 py-1 rounded-full text-[11px] md:text-xs font-bold bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 transition-all duration-300 cursor-pointer shadow-sm shadow-green-500/5 whitespace-nowrap"
                  >
                    Resolver
                  </button>
                ) : (
                  <button
                    onClick={() => updateConversationStatus({ conversationId: selectedConv.id, status: "open" })}
                    className="px-2.5 py-1 rounded-full text-[11px] md:text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 transition-all duration-300 cursor-pointer shadow-sm shadow-blue-500/5 whitespace-nowrap"
                  >
                    Reabrir
                  </button>
                )}

                <ConversationActionsMenu
                  conversation={selectedConv}
                  className="h-8 w-8 rounded-xl border border-border/40 bg-background/60 hover:bg-background"
                />
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

      {/* 3. Desktop Chat Sidebar Column (Right) */}
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

      {/* Mobile Quick Replies Sheet */}
      <Sheet open={mobileQuickRepliesOpen} onOpenChange={setMobileQuickRepliesOpen}>
        <SheetContent side="bottom" className="h-[85dvh] p-0 rounded-t-3xl bg-background border-t border-border/40 z-[9999]">
          <SheetHeader className="p-4 border-b border-border/40">
            <SheetTitle className="text-sm font-bold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500 fill-amber-500/20" />
              <span>Respostas Rápidas</span>
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(85dvh-60px)] overflow-y-auto">
            <QuickRepliesSidebarPanel
              onSelectReply={(reply) => {
                setSelectedQuickReply(reply);
                setMobileQuickRepliesOpen(false);
                setTimeout(() => setSelectedQuickReply(null), 100);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Details Sheet */}
      <Sheet open={mobileLeadDetailsOpen} onOpenChange={setMobileLeadDetailsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-background border-l border-border/40 z-[9999] overflow-y-auto">
          {selectedConv && (() => {
            const p = selectedConv.lead?.phone || selectedConv.contact_phone || "";
            const c = (selectedConv.lead?.custom_fields as Record<string, any>) || {};
            const isGrp = p.length > 15 || p.includes("@g.us") || p.includes("-group") || c.is_group === true;

            return isGrp ? (
              <GroupContextPanel
                conversation={selectedConv}
                onClose={() => setMobileLeadDetailsOpen(false)}
              />
            ) : (
              <LeadContextPanel
                conversation={selectedConv}
                stages={pipelineStages}
                onClose={() => setMobileLeadDetailsOpen(false)}
              />
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
