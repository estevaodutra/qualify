import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useChat() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  // 1. Fetch Conversations
  const {
    data: conversations = [],
    isLoading: isConversationsLoading,
    refetch: refetchConversations,
  } = useQuery({
    queryKey: ["chat-conversations", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`
          *,
          lead:leads!chat_conversations_lead_id_fkey(id, name, phone, email, tags, custom_fields),
          operator:profiles!chat_conversations_operator_id_fkey(id, full_name, email)
        `)
        .eq("company_id", activeCompanyId)
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
        throw error;
      }

      return data as unknown as ChatConversation[];
    },
    enabled: !!activeCompanyId && !!user,
    staleTime: 30000, // 30 seconds stale time since it's updated via realtime
  });

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

  // 7. Update Lead Pipeline Stage
      });
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
          event: "*",
          schema: "public",
          table: "chat_conversations",
          filter: `company_id=eq.${activeCompanyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeCompanyId] });
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
          queryClient.invalidateQueries({ queryKey: ["chat-messages", newMsg.conversation_id] });
          queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeCompanyId] });
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
    data: messages = [],
    isLoading: isMessagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }

      // Mark conversation unread count as 0 when thread is opened/refetched
      await supabase
        .from("chat_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);

      return data as ChatMessage[];
    },
    enabled: !!conversationId && !!user,
  });

  return {
    messages,
    isMessagesLoading,
    refetchMessages,
  };
}
