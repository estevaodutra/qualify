import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { QuickReplyGroup, QuickReply, QuickReplyContentType, QuickReplyContentPayload } from "@/types/quickReplyTypes";

export function useQuickReplies() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();

  // 1. Fetch Groups
  const {
    data: groups = [],
    isLoading: isGroupsLoading,
    refetch: refetchGroups,
  } = useQuery<QuickReplyGroup[]>({
    queryKey: ["quick-reply-groups", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("quick_reply_groups")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        // Table might not exist yet in DB if migration hasn't run; return empty gracefully
        if (error.code === "42P01" || error.code === "PGRST202") return [];
        console.error("Error fetching quick reply groups:", error);
        return [];
      }

      return (data || []) as QuickReplyGroup[];
    },
    enabled: !!activeCompanyId && !!user,
    staleTime: 60000,
  });

  // 2. Fetch Quick Replies
  const {
    data: quickReplies = [],
    isLoading: isRepliesLoading,
    refetch: refetchReplies,
  } = useQuery<QuickReply[]>({
    queryKey: ["quick-replies", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];

      const { data, error } = await supabase
        .from("quick_replies")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        if (error.code === "42P01" || error.code === "PGRST202") return [];
        console.error("Error fetching quick replies:", error);
        return [];
      }

      return (data || []) as QuickReply[];
    },
    enabled: !!activeCompanyId && !!user,
    staleTime: 60000,
  });

  // Helper function to normalize shortcut
  const normalizeShortcut = (shortcut: string) => {
    return shortcut
      .trim()
      .replace(/^\/+/, "") // Remove leading slashes
      .toLowerCase();
  };

  // Group Mutations
  const createGroupMutation = useMutation({
    mutationFn: async (payload: { name: string; color?: string }) => {
      if (!activeCompanyId) throw new Error("Sem empresa ativa");
      const nextPos = groups.length > 0 ? Math.max(...groups.map(g => g.position)) + 1 : 0;

      const { data, error } = await supabase
        .from("quick_reply_groups")
        .insert({
          company_id: activeCompanyId,
          name: payload.name,
          color: payload.color || "#10B981",
          position: nextPos,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuickReplyGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-reply-groups", activeCompanyId] });
      toast.success("Grupo criado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao criar grupo: ${err.message}`);
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; color?: string; position?: number }) => {
      const { data, error } = await supabase
        .from("quick_reply_groups")
        .update({
          name: payload.name,
          color: payload.color,
          ...(payload.position !== undefined && { position: payload.position }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;
      return data as QuickReplyGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-reply-groups", activeCompanyId] });
      toast.success("Grupo atualizado!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar grupo: ${err.message}`);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async ({ id, targetGroupId }: { id: string; targetGroupId: string | null }) => {
      // First, reassign existing replies in this group to targetGroupId (or null)
      const { error: updateErr } = await supabase
        .from("quick_replies")
        .update({ group_id: targetGroupId })
        .eq("group_id", id);

      if (updateErr) throw updateErr;

      // Delete group
      const { error: delErr } = await supabase
        .from("quick_reply_groups")
        .delete()
        .eq("id", id);

      if (delErr) throw delErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-reply-groups", activeCompanyId] });
      queryClient.invalidateQueries({ queryKey: ["quick-replies", activeCompanyId] });
      toast.success("Grupo excluído com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao excluir grupo: ${err.message}`);
    },
  });

  const reorderGroupsMutation = useMutation({
    mutationFn: async (items: { id: string; position: number }[]) => {
      for (const item of items) {
        await supabase
          .from("quick_reply_groups")
          .update({ position: item.position })
          .eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-reply-groups", activeCompanyId] });
    },
  });

  // Quick Reply Mutations
  const createQuickReplyMutation = useMutation({
    mutationFn: async (payload: {
      group_id?: string | null;
      name: string;
      shortcut: string;
      content_type: QuickReplyContentType;
      content_json: QuickReplyContentPayload;
    }) => {
      if (!activeCompanyId) throw new Error("Sem empresa ativa");
      
      const normalized = normalizeShortcut(payload.shortcut);
      if (!normalized) throw new Error("Atalho é obrigatório.");

      // Check unique shortcut for this company
      const existing = quickReplies.find(
        (r) => r.normalized_shortcut === normalized
      );
      if (existing) {
        throw new Error(`O atalho "/${normalized}" já está em uso por outra resposta.`);
      }

      const nextPos = quickReplies.length > 0 ? Math.max(...quickReplies.map(r => r.position)) + 1 : 0;

      const { data, error } = await supabase
        .from("quick_replies")
        .insert({
          company_id: activeCompanyId,
          group_id: payload.group_id || null,
          name: payload.name,
          shortcut: normalized,
          normalized_shortcut: normalized,
          content_type: payload.content_type,
          content_json: payload.content_json,
          position: nextPos,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuickReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies", activeCompanyId] });
      toast.success("Resposta rápida criada com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar resposta rápida");
    },
  });

  const updateQuickReplyMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      group_id?: string | null;
      name?: string;
      shortcut?: string;
      content_type?: QuickReplyContentType;
      content_json?: QuickReplyContentPayload;
      position?: number;
      active?: boolean;
    }) => {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (payload.group_id !== undefined) updates.group_id = payload.group_id;
      if (payload.name !== undefined) updates.name = payload.name;
      if (payload.content_type !== undefined) updates.content_type = payload.content_type;
      if (payload.content_json !== undefined) updates.content_json = payload.content_json;
      if (payload.position !== undefined) updates.position = payload.position;
      if (payload.active !== undefined) updates.active = payload.active;

      if (payload.shortcut !== undefined) {
        const normalized = normalizeShortcut(payload.shortcut);
        if (!normalized) throw new Error("Atalho é obrigatório.");
        
        // Check uniqueness
        const existing = quickReplies.find(
          (r) => r.normalized_shortcut === normalized && r.id !== payload.id
        );
        if (existing) {
          throw new Error(`O atalho "/${normalized}" já está em uso por outra resposta.`);
        }

        updates.shortcut = normalized;
        updates.normalized_shortcut = normalized;
      }

      const { data, error } = await supabase
        .from("quick_replies")
        .update(updates)
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;
      return data as QuickReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies", activeCompanyId] });
      toast.success("Resposta rápida atualizada!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar resposta rápida");
    },
  });

  const duplicateQuickReplyMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!activeCompanyId) throw new Error("Sem empresa ativa");
      
      const target = quickReplies.find((r) => r.id === id);
      if (!target) throw new Error("Resposta não encontrada.");

      // Find unique copy shortcut
      let copyShortcut = `${target.normalized_shortcut}-copia`;
      let counter = 1;
      while (quickReplies.some((r) => r.normalized_shortcut === copyShortcut)) {
        copyShortcut = `${target.normalized_shortcut}-copia-${counter}`;
        counter++;
      }

      const nextPos = quickReplies.length > 0 ? Math.max(...quickReplies.map(r => r.position)) + 1 : 0;

      const { data, error } = await supabase
        .from("quick_replies")
        .insert({
          company_id: activeCompanyId,
          group_id: target.group_id,
          name: `${target.name} (cópia)`,
          shortcut: copyShortcut,
          normalized_shortcut: copyShortcut,
          content_type: target.content_type,
          content_json: target.content_json,
          position: nextPos,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuickReply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies", activeCompanyId] });
      toast.success("Resposta duplicada com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao duplicar resposta");
    },
  });

  const deleteQuickReplyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quick_replies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies", activeCompanyId] });
      toast.success("Resposta rápida removida!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao remover resposta: ${err.message}`);
    },
  });

  const reorderQuickRepliesMutation = useMutation({
    mutationFn: async (items: { id: string; group_id: string | null; position: number }[]) => {
      for (const item of items) {
        await supabase
          .from("quick_replies")
          .update({
            group_id: item.group_id,
            position: item.position,
          })
          .eq("id", item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies", activeCompanyId] });
    },
  });

  const incrementUsageMutation = useMutation({
    mutationFn: async (id: string) => {
      // Call RPC if available or update directly
      const target = quickReplies.find(r => r.id === id);
      const currentCount = target ? target.usage_count + 1 : 1;

      const { error } = await supabase
        .from("quick_replies")
        .update({
          usage_count: currentCount,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        // Fallback RPC attempt
        await supabase.rpc("increment_quick_reply_usage", { reply_id: id }).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies", activeCompanyId] });
    },
  });

  return {
    groups,
    quickReplies,
    isLoading: isGroupsLoading || isRepliesLoading,
    refetchGroups,
    refetchReplies,
    createGroup: createGroupMutation.mutateAsync,
    updateGroup: updateGroupMutation.mutateAsync,
    deleteGroup: deleteGroupMutation.mutateAsync,
    reorderGroups: reorderGroupsMutation.mutateAsync,
    createQuickReply: createQuickReplyMutation.mutateAsync,
    updateQuickReply: updateQuickReplyMutation.mutateAsync,
    duplicateQuickReply: duplicateQuickReplyMutation.mutateAsync,
    deleteQuickReply: deleteQuickReplyMutation.mutateAsync,
    reorderQuickReplies: reorderQuickRepliesMutation.mutateAsync,
    incrementUsage: incrementUsageMutation.mutateAsync,
  };
}
