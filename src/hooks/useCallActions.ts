import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type CallActionType = "start_sequence" | "add_tag" | "update_status" | "webhook" | "none" | "custom_message";

export interface CallAction {
  id: string;
  campaignId: string;
  name: string;
  color: string;
  icon: string;
  actionType: CallActionType;
  actionConfig: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
}

interface DbCallAction {
  id: string;
  campaign_id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  action_type: string;
  action_config: Record<string, unknown> | null;
  sort_order: number | null;
  created_at: string | null;
}

const transformDbToFrontend = (db: DbCallAction): CallAction => ({
  id: db.id,
  campaignId: db.campaign_id,
  name: db.name,
  color: db.color || "#10b981",
  icon: db.icon || "check",
  actionType: db.action_type as CallActionType,
  actionConfig: db.action_config || {},
  sortOrder: db.sort_order || 0,
  createdAt: db.created_at || new Date().toISOString(),
});

export function useCallActions(campaignId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: actions = [], isLoading, refetch } = useQuery({
    queryKey: ["call_actions", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("call_script_actions")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data as DbCallAction[]).map(transformDbToFrontend);
    },
    enabled: !!campaignId,
  });

  const createActionMutation = useMutation({
    mutationFn: async (action: {
      name: string;
      color?: string;
      icon?: string;
      actionType: CallActionType;
      actionConfig?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const maxOrder = actions.reduce((max, a) => Math.max(max, a.sortOrder), -1);

      const { data, error } = await (supabase as any)
        .from("call_script_actions")
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          name: action.name,
          color: action.color || "#10b981",
          icon: action.icon || "check",
          action_type: action.actionType,
          action_config: action.actionConfig || {},
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return transformDbToFrontend(data as DbCallAction);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_actions", campaignId] });
      toast({ title: "Ação criada", description: "Ação criada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        name: string;
        color: string;
        icon: string;
        actionType: CallActionType;
        actionConfig: Record<string, unknown>;
        sortOrder: number;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      if (updates.actionType !== undefined) dbUpdates.action_type = updates.actionType;
      if (updates.actionConfig !== undefined) dbUpdates.action_config = updates.actionConfig;
      if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

      const { error } = await (supabase as any)
        .from("call_script_actions")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_actions", campaignId] });
      toast({ title: "Atualizado", description: "Ação atualizada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("call_script_actions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_actions", campaignId] });
      toast({ title: "Removido", description: "Ação removida com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const reorderActionsMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await (supabase as any)
          .from("call_script_actions")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_actions", campaignId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    actions,
    isLoading,
    refetch,
    createAction: createActionMutation.mutateAsync,
    updateAction: updateActionMutation.mutateAsync,
    deleteAction: deleteActionMutation.mutateAsync,
    reorderActions: reorderActionsMutation.mutateAsync,
    isCreating: createActionMutation.isPending,
  };
}
