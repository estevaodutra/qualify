import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface ChatConversation {
  id: string;
  company_id: string;
  lead_id: string;
  instance_id: string | null;
  status: "open" | "in_progress" | "waiting" | "resolved";
  operator_id: string | null;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string;
  waiting_since: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  lead: {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
    custom_fields?: any;
    custom_fields: Record<string, any> | null;
  };
  operator?: {
    id: string;
    full_name: string | null;
    email: string | null;
  };
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: "lead" | "operator" | "system";
  sender_id: string | null;
  message_type: "text" | "image" | "video" | "audio" | "document" | "location" | "contact";
  body: string | null;
  media_url: string | null;
  media_type: string | null;
  status: "pending" | "sent" | "delivered" | "read";
  is_internal: boolean;
  zaap_id: string | null;
  message_id: string | null;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  company_id: string;
  name: string;
  color: string;
  order_index: number;
}

export interface ChatTemplate {
  id: string;
  company_id: string;
  shortcut: string;
  title: string;
  body: string;
}

export interface ChatFilters {
  status?: string;
  instanceId?: string;
  tags?: string[];
  operatorId?: string;
  search?: string;
}

export function useChat(filters?: ChatFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  // 1. Fetch Conversations
  const {
    data: conversationsData,
    isLoading: isConversationsLoading,
    fetchNextPage: fetchNextConversations,
    hasNextPage: hasNextConversations,
    isFetchingNextPage: isFetchingNextConversations,
    refetch: refetchConversations,
  } = useInfiniteQuery({
    queryKey: ["chat-conversations", activeCompanyId, filters],
    initialPageParam: null as { last_message_at: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      if (!activeCompanyId) return [];

      let query = supabase
        .from("chat_conversations")
        .select(`
          id,
          company_id,
          instance_id,
          status,
          operator_id,
          unread_count,
          last_message_preview,
          last_message_at,
          tags,
          waiting_since,
          created_at,
          updated_at,
          lead:leads(id, name, phone, email, tags, custom_fields),
          operator:profiles(id, full_name, email)
        `)
        .eq("company_id", activeCompanyId);

      // Filters
      if (filters?.status && filters.status !== "all") {
        if (filters.status === "unread") {
          query = query.gt("unread_count", 0);
        } else if (filters.status === "unassigned") {
          query = query.is("operator_id", null);
        } else {
          query = query.eq("status", filters.status);
        }
      }
      
      if (filters?.instanceId) {
        query = query.eq("instance_id", filters.instanceId);
      }
      
      if (filters?.operatorId && filters.operatorId !== "all") {
        if (filters.operatorId === "unassigned") {
           query = query.is("operator_id", null);
        } else {
           query = query.eq("operator_id", filters.operatorId);
        }
      }

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains("tags", filters.tags);
      }

      if (filters?.search) {
        // Simple search on lead name or phone via joined table
        // This requires an inner join to filter correctly
        // Or we just do a text search on preview
        query = query.or(`last_message_preview.ilike.%${filters.search}%`);
      }

      // Pagination cursor
      if (pageParam) {
        query = query.or(`last_message_at.lt.${pageParam.last_message_at},and(last_message_at.eq.${pageParam.last_message_at},id.lt.${pageParam.id})`);
      }

      const limit = 30;
      query = query.order("last_message_at", { ascending: false }).order("id", { ascending: false }).limit(limit);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching conversations:", error);
        toast({ title: "Erro ao buscar conversas", description: error.message, variant: "destructive" });
        throw error;
      }

      return data as unknown as ChatConversation[];
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 30) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { last_message_at: last.last_message_at, id: last.id };
    },
    enabled: !!activeCompanyId && !!user,
    staleTime: 30000,
  });

  const conversations = conversationsData?.pages.flat() || [];


  // 2. Fetch Pipeline Stages
  const {
    data: pipelineStages = [],
    isLoading: isStagesLoading,
  } = useQuery({
    queryKey: ["pipeline-stages", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as PipelineStage[];
    },
    enabled: !!activeCompanyId && !!user,
    staleTime: 300000, // 5 minutes stale time as pipeline stages change rarely
  });

  // 3. Fetch Quick Templates
  const {
    data: templates = [],
    isLoading: isTemplatesLoading,
  } = useQuery({
    queryKey: ["chat-templates", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("chat_templates")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("shortcut", { ascending: true });

      if (error) throw error;
      return data as ChatTemplate[];
    },
    enabled: !!activeCompanyId && !!user,
    staleTime: 300000, // 5 minutes stale time
  });

  // 4. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: {
      conversationId: string;
      body?: string;
      mediaUrl?: string;
      mediaType?: string;
      isInternal?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke("chat-send-message", {
        body: payload,
      });

      if (error || !data.success) {
        throw new Error(error?.message || data?.error || "Erro ao enviar mensagem.");
      }

      return data.message as ChatMessage;
    },
    onSuccess: (data) => {
      // Optimistically update conversation and messages list
      queryClient.invalidateQueries({ queryKey: ["chat-messages", data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeCompanyId] });
    },
    onError: (error) => {
      toast({
        title: "Falha ao enviar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 5. Update Conversation Status (e.g. resolve, mark waiting)
  const updateConversationStatusMutation = useMutation({
    mutationFn: async ({
      conversationId,
      status,
    }: {
      conversationId: string;
      status: ChatConversation["status"];
    }) => {
      const updates: Record<string, any> = { status };
      if (status === "resolved") {
        updates.waiting_since = null;
        updates.unread_count = 0;
      }
      const { data, error } = await supabase
        .from("chat_conversations")
        .update(updates)
        .eq("id", conversationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeCompanyId] });
    },
  });

  // 6. Assign Operator Mutation
  const assignOperatorMutation = useMutation({
    mutationFn: async ({
      conversationId,
      operatorId,
    }: {
      conversationId: string;
      operatorId: string | null;
    }) => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .update({
          operator_id: operatorId,
          status: operatorId ? "in_progress" : "open",
        })
        .eq("id", conversationId)
        .select()
        .single();

      if (error) throw error;

      // Log to attribution history if assigned
      if (operatorId && user) {
        await supabase.from("chat_attribution_history").insert({
          conversation_id: conversationId,
          assigned_by: user.id,
          assigned_to: operatorId,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeCompanyId] });
    },
  });

  // 7. Update Lead Stage Mutation
  const updateLeadStageMutation = useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      const { data, error } = await supabase
        .from("leads")
        .update({ pipeline_stage_id: stageId })
        .eq("id", leadId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeCompanyId] });
    },
  });

  // 8. Create Chat Template
  const createTemplateMutation = useMutation({
    mutationFn: async (payload: { shortcut: string; title: string; body: string }) => {
      const { data, error } = await supabase
        .from("chat_templates")
        .insert({
          company_id: activeCompanyId,
          shortcut: payload.shortcut,
          title: payload.title,
          body: payload.body,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-templates", activeCompanyId] });
      toast({ title: "Template criado", description: "O atalho rápido já está disponível." });
    },
  });

  // 9. Realtime Subscription Setup for the Unified Inbox
  useEffect(() => {
    if (!activeCompanyId) return;

    console.log(`[Realtime] Subscribing to Chat channels for company ${activeCompanyId}`);

    const channel = supabase
      .channel("chat-realtime-changes")
      .on(
        "postgres_changes",
        {
          event: "update",
          schema: "public",
          table: "chat_conversations",
          filter: `company_id=eq.${activeCompanyId}`,
        },
        (payload) => {
          const updatedConv = payload.new as ChatConversation;
          queryClient.setQueriesData({ queryKey: ["chat-conversations", activeCompanyId] }, (oldData: any) => {
            if (!oldData || !oldData.pages) return oldData;
            const newPages = oldData.pages.map((page: any[]) => {
              return page.map((conv) => (conv.id === updatedConv.id ? { ...conv, ...updatedConv } : conv));
            });
            return { ...oldData, pages: newPages };
          });
          
          // Fallback robusto: se a mensagem não chegar pelo realtime de chat_messages (devido ao RLS complexo),
          // o update da conversa garante que vamos buscar a nova mensagem.
          if (activeConversationId === updatedConv.id) {
            queryClient.invalidateQueries(["chat-messages", activeConversationId]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "insert",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          
          // Granular update for messages
          queryClient.setQueryData(["chat-messages", newMsg.conversation_id], (oldData: any) => {
            if (!oldData || !oldData.pages) return oldData;

            // Previne duplicação na tela caso cheguem dois webhooks
            const exists = oldData.pages.some((page: any[]) => 
              page.some((m) => m.id === newMsg.id || (m.message_id && m.message_id === newMsg.message_id))
            );
            if (exists) return oldData;

            const newPages = [...oldData.pages];
            if (newPages.length > 0) {
              newPages[0] = [newMsg, ...newPages[0]];
            }
            return { ...oldData, pages: newPages };
          });

          // Granular update for conversations
          // Note: we can't easily know all filter keys, so we invalidate as a fallback 
          // or we can invalidate after a delay. We will use a soft update for the current active filters.
          queryClient.setQueriesData({ queryKey: ["chat-conversations", activeCompanyId] }, (oldData: any) => {
            if (!oldData || !oldData.pages) return oldData;
            const newPages = oldData.pages.map((page: any[]) => {
              return page.map((conv) => {
                if (conv.id === newMsg.conversation_id) {
                  return {
                    ...conv,
                    last_message_preview: newMsg.is_internal ? `[Nota Interna] ${newMsg.body || '[Mídia]'}` : (newMsg.body || '[Mídia]'),
                    last_message_at: newMsg.created_at,
                    unread_count: newMsg.sender_type === 'lead' ? conv.unread_count + 1 : conv.unread_count
                  };
                }
                return conv;
              });
            });
            return { ...oldData, pages: newPages };
          });
        }
      )
      .subscribe();

    return () => {
      console.log("[Realtime] Unsubscribing from Chat channels");
      supabase.removeChannel(channel);
    };
  }, [activeCompanyId, queryClient]);

  return {
    conversations,
    fetchNextConversations,
    hasNextConversations,
    isFetchingNextConversations,
    pipelineStages,
    templates,
    isConversationsLoading,
    isStagesLoading,
    isTemplatesLoading,
    refetchConversations,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    updateConversationStatus: updateConversationStatusMutation.mutateAsync,
    assignOperator: assignOperatorMutation.mutateAsync,
    updateLeadStage: updateLeadStageMutation.mutateAsync,
    createTemplate: createTemplateMutation.mutateAsync,
  };
}

export function useChatMessages(conversationId?: string) {
  const { user } = useAuth();

  // Fetch Messages for Selected Thread
  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    fetchNextPage: fetchNextMessages,
    hasNextPage: hasNextMessages,
    isFetchingNextPage: isFetchingNextMessages,
    refetch: refetchMessages,
  } = useInfiniteQuery({
    queryKey: ["chat-messages", conversationId],
    initialPageParam: null as { created_at: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      if (!conversationId) return [];

      let query = supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

      if (pageParam) {
        query = query.or(`created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`);
      }

      query = query.limit(50);

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }

      if (!pageParam) {
        // Mark conversation unread count as 0 when thread is opened
        await supabase
          .from("chat_conversations")
          .update({ unread_count: 0 })
          .eq("id", conversationId);
      }

      return data as ChatMessage[];
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 50) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { created_at: last.created_at, id: last.id };
    },
    enabled: !!conversationId && !!user,
  });

  const messages = messagesData ? [...messagesData.pages.flat()].reverse() : [];

  return {
    messages,
    isMessagesLoading,
    fetchNextMessages,
    hasNextMessages,
    isFetchingNextMessages,
    refetchMessages,
  };
}
