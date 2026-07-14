import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useChatExpressStore } from "@/stores/chatExpress.store";
import { toast } from "sonner";
import { ChatMessage } from "@/hooks/useChat";
import { useInstances } from "@/hooks/useInstances";

export function useChatExpress() {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const { updateSession, sessions, setDraft } = useChatExpressStore();
  const { instances } = useInstances();

  const resolveConversationMutation = useMutation({
    mutationFn: async (leadId: string) => {
      if (!activeCompanyId) throw new Error("No active company");
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("id, instance_id, status, unread_count")
        .eq("company_id", activeCompanyId)
        .eq("lead_id", leadId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, leadId) => {
      updateSession(leadId, {
        conversationId: data?.id || null,
        instanceId: data?.instance_id || null,
        hasExistingConversation: !!data,
        isResolvingConversation: false,
        unreadCount: data?.unread_count || 0,
      });
    },
    onError: (err, leadId) => {
      console.error("Failed to resolve conversation:", err);
      updateSession(leadId, { isResolvingConversation: false });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: {
      leadId: string;
      body?: string;
      mediaUrl?: string;
      mediaType?: string;
      isInternal?: boolean;
      instanceId?: string;
    }) => {
      let convId = sessions.find(s => s.leadId === payload.leadId)?.conversationId;
      let targetInstanceId = payload.instanceId || sessions.find(s => s.leadId === payload.leadId)?.instanceId;

      if (!targetInstanceId) {
         const connectedInstances = instances.filter(i => i.status === "connected");
         targetInstanceId = connectedInstances[0]?.id;
      }

      if (!convId) {
        const { data: newConv, error: createError } = await supabase
          .from("chat_conversations")
          .insert({
            company_id: activeCompanyId,
            lead_id: payload.leadId,
            instance_id: targetInstanceId || null,
            status: "open",
            unread_count: 0,
          })
          .select()
          .single();
          
        if (createError) {
            const { data: existing } = await supabase
                .from("chat_conversations")
                .select("id")
                .eq("company_id", activeCompanyId)
                .eq("lead_id", payload.leadId)
                .maybeSingle();
            
            if (existing) {
                convId = existing.id;
                // Since we found an existing one concurrently, ensure it has the right instance
                await supabase.from("chat_conversations").update({ instance_id: targetInstanceId }).eq("id", convId);
            } else {
                throw createError;
            }
        } else {
            convId = newConv.id;
        }

        updateSession(payload.leadId, {
           conversationId: convId,
           hasExistingConversation: true,
           instanceId: targetInstanceId || null
        });
        
        queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeCompanyId] });
      } else {
        // Conversation already exists, ensure the DB has the selected instance_id
        await supabase
          .from("chat_conversations")
          .update({ instance_id: targetInstanceId || null })
          .eq("id", convId);
      }

      if (!targetInstanceId) {
        throw new Error("Nenhuma instância conectada ou selecionada para enviar a mensagem.");
      }

      const { data, error } = await supabase.functions.invoke("chat-send-message", {
        body: {
            conversationId: convId,
            body: payload.body,
            mediaUrl: payload.mediaUrl,
            mediaType: payload.mediaType,
            isInternal: payload.isInternal
        },
      });

      if (error || !data.success) {
        throw new Error(error?.message || data?.error || "Erro ao enviar mensagem.");
      }

      return { message: data.message as ChatMessage, convId, leadId: payload.leadId };
    },
    onSuccess: ({ convId, leadId }) => {
       queryClient.invalidateQueries({ queryKey: ["chat-messages", convId] });
       queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeCompanyId] });
       setDraft(leadId, "");
    },
    onError: (error) => {
      toast.error("Falha ao enviar: " + error.message);
    }
  });

  return {
    resolveConversation: resolveConversationMutation.mutateAsync,
    isResolving: resolveConversationMutation.isPending,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
  };
}
