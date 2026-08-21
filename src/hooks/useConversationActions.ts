import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const LOCAL_PINS_KEY = (companyId: string, userId: string) => `qualify_pins_${companyId}_${userId}`;
const LOCAL_ARCHIVED_KEY = (companyId: string) => `qualify_archived_${companyId}`;

export function getLocalPins(companyId: string, userId: string): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_PINS_KEY(companyId, userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalPin(companyId: string, userId: string, convId: string) {
  const current = getLocalPins(companyId, userId);
  if (!current.includes(convId)) {
    localStorage.setItem(LOCAL_PINS_KEY(companyId, userId), JSON.stringify([...current, convId]));
  }
}

export function removeLocalPin(companyId: string, userId: string, convId: string) {
  const current = getLocalPins(companyId, userId);
  localStorage.setItem(LOCAL_PINS_KEY(companyId, userId), JSON.stringify(current.filter(id => id !== convId)));
}

export function getLocalArchived(companyId: string): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_ARCHIVED_KEY(companyId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalArchived(companyId: string, convId: string) {
  const current = getLocalArchived(companyId);
  if (!current.includes(convId)) {
    localStorage.setItem(LOCAL_ARCHIVED_KEY(companyId), JSON.stringify([...current, convId]));
  }
}

export function removeLocalArchived(companyId: string, convId: string) {
  const current = getLocalArchived(companyId);
  localStorage.setItem(LOCAL_ARCHIVED_KEY(companyId), JSON.stringify(current.filter(id => id !== convId)));
}

export function useConversationActions() {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateChatQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["chat-archived-count"] });
    queryClient.invalidateQueries({ queryKey: ["chat-pins"] });
  };

  // 1. Pin Conversation
  const pinMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!activeCompanyId || !user) throw new Error("Usuário ou empresa não selecionada");

      saveLocalPin(activeCompanyId, user.id, conversationId);

      try {
        const { error } = await supabase
          .from("chat_conversation_pins" as any)
          .upsert(
            {
              company_id: activeCompanyId,
              conversation_id: conversationId,
              user_id: user.id,
              created_at: new Date().toISOString(),
            },
            { onConflict: "conversation_id,user_id" }
          );
        if (error) console.warn("DB pin error, fallback to local state:", error);
      } catch (err) {
        console.warn("DB pin exception, fallback to local state:", err);
      }
    },
    onSuccess: () => {
      toast.success("Conversa fixada no topo!");
      invalidateChatQueries();
    },
    onError: (err: any) => {
      console.error("Error pinning conversation:", err);
      toast.error(`Erro ao fixar conversa: ${err.message}`);
    },
  });

  // 2. Unpin Conversation
  const unpinMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!activeCompanyId || !user) throw new Error("Usuário ou empresa não selecionada");

      removeLocalPin(activeCompanyId, user.id, conversationId);

      try {
        const { error } = await supabase
          .from("chat_conversation_pins" as any)
          .delete()
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id);
        if (error) console.warn("DB unpin error, fallback to local state:", error);
      } catch (err) {
        console.warn("DB unpin exception, fallback to local state:", err);
      }
    },
    onSuccess: () => {
      toast.success("Conversa desafixada.");
      invalidateChatQueries();
    },
    onError: (err: any) => {
      console.error("Error unpinning conversation:", err);
      toast.error(`Erro ao desafixar conversa: ${err.message}`);
    },
  });

  // 3. Mark as Unread
  const markUnreadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("chat_conversations")
        .update({ unread_count: 1 })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conversa marcada como não lida.");
      invalidateChatQueries();
    },
    onError: (err: any) => {
      console.error("Error marking unread:", err);
      toast.error("Erro ao marcar conversa como não lida.");
    },
  });

  // 4. Mark as Read
  const markReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("chat_conversations")
        .update({ unread_count: 0 })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateChatQueries();
    },
    onError: (err: any) => {
      console.error("Error marking read:", err);
    },
  });

  // 5. Archive Conversation (with multi-tier schema fallback)
  const archiveMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user || !activeCompanyId) throw new Error("Usuário ou empresa não selecionada");

      // Save to local storage state for instant resilience
      saveLocalArchived(activeCompanyId, conversationId);

      // Tier 1: Try updating with all columns
      let res = await supabase
        .from("chat_conversations")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        } as any)
        .eq("id", conversationId);

      if (res.error) {
        // Tier 2: Try minimal update (is_archived only)
        const res2 = await supabase
          .from("chat_conversations")
          .update({ is_archived: true } as any)
          .eq("id", conversationId);

        if (res2.error) {
          console.warn("DB archive column error, fallback to local storage state:", res2.error);
        }
      }
    },
    onSuccess: () => {
      toast.success("Conversa arquivada.");
      invalidateChatQueries();
    },
    onError: (err: any) => {
      console.error("Error archiving conversation:", err);
      toast.error(`Erro ao arquivar conversa: ${err.message}`);
    },
  });

  // 6. Unarchive Conversation (with multi-tier schema fallback)
  const unarchiveMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!activeCompanyId) return;

      removeLocalArchived(activeCompanyId, conversationId);

      // Tier 1: Try full update
      let res = await supabase
        .from("chat_conversations")
        .update({
          is_archived: false,
          archived_at: null,
          archived_by: null,
        } as any)
        .eq("id", conversationId);

      if (res.error) {
        // Tier 2: Try minimal update
        const res2 = await supabase
          .from("chat_conversations")
          .update({ is_archived: false } as any)
          .eq("id", conversationId);

        if (res2.error) {
          console.warn("DB unarchive column error, fallback to local storage state:", res2.error);
        }
      }
    },
    onSuccess: () => {
      toast.success("Conversa desarquivada.");
      invalidateChatQueries();
    },
    onError: (err: any) => {
      console.error("Error unarchiving conversation:", err);
      toast.error(`Erro ao desarquivar conversa: ${err.message}`);
    },
  });

  // 7. Create Lead from Conversation (Manual creation when lead is not in CRM)
  const createLeadMutation = useMutation({
    mutationFn: async ({ conversationId, phone, name }: { conversationId: string; phone: string; name?: string | null }) => {
      if (!activeCompanyId || !user) throw new Error("Usuário ou empresa não selecionada");
      if (!phone) throw new Error("Telefone do contato é obrigatório");

      const cleanPhone = phone.trim();
      const cleanName = (name && name !== cleanPhone) ? name.trim() : cleanPhone;

      // 1. Check if lead already exists in CRM
      let { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("company_id", activeCompanyId)
        .eq("phone", cleanPhone)
        .maybeSingle();

      let leadId = existingLead?.id;

      if (!leadId) {
        // Insert new lead into CRM
        const { data: newLead, error: insertError } = await supabase
          .from("leads")
          .insert({
            company_id: activeCompanyId,
            user_id: user.id,
            phone: cleanPhone,
            name: cleanName,
            status: "active",
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        leadId = newLead.id;
      }

      // 2. Link conversation with the created lead_id
      const { error: updateConvError } = await supabase
        .from("chat_conversations")
        .update({ lead_id: leadId })
        .eq("id", conversationId);

      if (updateConvError) throw updateConvError;

      return leadId;
    },
    onSuccess: () => {
      toast.success("Lead cadastrado com sucesso no CRM!");
      invalidateChatQueries();
    },
    onError: (err: any) => {
      console.error("Error creating lead from conversation:", err);
      toast.error(`Erro ao cadastrar lead: ${err.message}`);
    },
  });

  return {
    pinConversation: pinMutation.mutateAsync,
    unpinConversation: unpinMutation.mutateAsync,
    markConversationUnread: markUnreadMutation.mutateAsync,
    markConversationRead: markReadMutation.mutateAsync,
    archiveConversation: archiveMutation.mutateAsync,
    unarchiveConversation: unarchiveMutation.mutateAsync,
    createLeadFromConversation: createLeadMutation.mutateAsync,
    isCreatingLead: createLeadMutation.isPending,
    isPending:
      pinMutation.isPending ||
      unpinMutation.isPending ||
      markUnreadMutation.isPending ||
      markReadMutation.isPending ||
      archiveMutation.isPending ||
      unarchiveMutation.isPending ||
      createLeadMutation.isPending,
  };
}
