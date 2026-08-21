import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SavedChatFilter, AdvancedChatFilters } from "@/types/chatFilterTypes";

export function useSavedChatFilters() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();

  // 1. Fetch saved filters
  const {
    data: savedFilters = [],
    isLoading,
    refetch,
  } = useQuery<SavedChatFilter[]>({
    queryKey: ["chat-saved-filters", activeCompanyId, user?.id],
    queryFn: async () => {
      if (!activeCompanyId || !user?.id) return [];

      const { data, error } = await supabase
        .from("chat_saved_filters")
        .select("*")
        .eq("company_id", activeCompanyId)
        .eq("user_id", user.id)
        .order("last_used_at", { ascending: false });

      if (error) {
        if (error.code === "42P01") return [];
        console.error("Error loading saved filters:", error);
        return [];
      }

      return (data || []) as unknown as SavedChatFilter[];
    },
    enabled: !!activeCompanyId && !!user?.id,
    staleTime: 60000,
  });

  // 2. Create saved filter
  const createSavedFilterMutation = useMutation({
    mutationFn: async (payload: { name: string; filters: AdvancedChatFilters }) => {
      if (!activeCompanyId || !user?.id) throw new Error("Usuário ou empresa não identificado");

      const { data, error } = await supabase
        .from("chat_saved_filters")
        .insert({
          company_id: activeCompanyId,
          user_id: user.id,
          name: payload.name.trim(),
          filters_json: payload.filters,
          last_used_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SavedChatFilter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-saved-filters", activeCompanyId, user?.id] });
      toast.success("Filtro salvo com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar filtro: ${err.message}`);
    },
  });

  // 3. Update saved filter (overwriting filters_json)
  const updateSavedFilterMutation = useMutation({
    mutationFn: async (payload: { id: string; filters: AdvancedChatFilters }) => {
      const { data, error } = await supabase
        .from("chat_saved_filters")
        .update({
          filters_json: payload.filters,
          updated_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SavedChatFilter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-saved-filters", activeCompanyId, user?.id] });
      toast.success("Filtro salvo atualizado!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar filtro salvo: ${err.message}`);
    },
  });

  // 4. Rename saved filter
  const renameSavedFilterMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("chat_saved_filters")
        .update({
          name: payload.name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SavedChatFilter;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-saved-filters", activeCompanyId, user?.id] });
      toast.success("Filtro renomeado!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao renomear filtro: ${err.message}`);
    },
  });

  // 5. Delete saved filter
  const deleteSavedFilterMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("chat_saved_filters")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-saved-filters", activeCompanyId, user?.id] });
      toast.success("Filtro salvo excluído!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao excluir filtro salvo: ${err.message}`);
    },
  });

  // 6. Mark last used
  const markSavedFilterUsedMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("chat_saved_filters")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-saved-filters", activeCompanyId, user?.id] });
    },
  });

  return {
    savedFilters,
    isLoading,
    refetch,
    saveFilter: createSavedFilterMutation.mutateAsync,
    updateFilter: updateSavedFilterMutation.mutateAsync,
    renameFilter: renameSavedFilterMutation.mutateAsync,
    deleteFilter: deleteSavedFilterMutation.mutateAsync,
    markFilterUsed: markSavedFilterUsedMutation.mutateAsync,
  };
}
