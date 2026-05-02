import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface CallCampaign {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed";
  api4comConfig: Record<string, unknown>;
  dialDelayMinutes: number;
  queueExecutionEnabled: boolean;
  queueIntervalSeconds: number;
  queueUnavailableBehavior: "wait" | "pause";
  retryCount: number;
  retryIntervalMinutes: number;
  retryExceededBehavior: "mark_failed" | "execute_action";
  retryExceededActionId: string | null;
  isPriority: boolean;
  priorityPosition: number;
  createdAt: string;
  updatedAt: string;
}

interface DbCallCampaign {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string | null;
  api4com_config: Record<string, unknown> | null;
  dial_delay_minutes: number | null;
  queue_execution_enabled: boolean | null;
  queue_interval_seconds: number | null;
  queue_unavailable_behavior: string | null;
  retry_count: number | null;
  retry_interval_minutes: number | null;
  retry_exceeded_behavior: string | null;
  retry_exceeded_action_id: string | null;
  is_priority: boolean | null;
  priority_position: number | null;
  created_at: string | null;
  updated_at: string | null;
}

const transformDbToFrontend = (db: DbCallCampaign): CallCampaign => ({
  id: db.id,
  name: db.name,
  description: db.description,
  status: (db.status as CallCampaign["status"]) || "draft",
  api4comConfig: db.api4com_config || {},
  dialDelayMinutes: db.dial_delay_minutes ?? 10,
  queueExecutionEnabled: db.queue_execution_enabled ?? false,
  queueIntervalSeconds: db.queue_interval_seconds ?? 30,
  queueUnavailableBehavior: (db.queue_unavailable_behavior as "wait" | "pause") || "wait",
  retryCount: db.retry_count ?? 3,
  retryIntervalMinutes: db.retry_interval_minutes ?? 30,
  retryExceededBehavior: (db.retry_exceeded_behavior as "mark_failed" | "execute_action") || "mark_failed",
  retryExceededActionId: db.retry_exceeded_action_id || null,
  isPriority: db.is_priority ?? false,
  priorityPosition: db.priority_position ?? 3,
  createdAt: db.created_at || new Date().toISOString(),
  updatedAt: db.updated_at || new Date().toISOString(),
});

export function useCallCampaigns() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, error, refetch } = useQuery({
    queryKey: ["call_campaigns", activeCompanyId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("call_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as DbCallCampaign[]).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: {
      name: string;
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await (supabase as any)
        .from("call_campaigns")
        .insert({
          user_id: user.id,
          company_id: activeCompanyId || null,
          name: campaign.name,
          description: campaign.description || null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return transformDbToFrontend(data as DbCallCampaign);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_campaigns"] });
      toast({ title: "Campanha criada", description: "Campanha de ligação criada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        name: string;
        description: string;
        status: string;
        api4comConfig: Record<string, unknown>;
        dialDelayMinutes: number;
        queueExecutionEnabled: boolean;
        queueIntervalSeconds: number;
        queueUnavailableBehavior: string;
        retryCount: number;
        retryIntervalMinutes: number;
        retryExceededBehavior: string;
        retryExceededActionId: string | null;
        isPriority: boolean;
        priorityPosition: number;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.api4comConfig !== undefined) dbUpdates.api4com_config = updates.api4comConfig;
      if (updates.dialDelayMinutes !== undefined) dbUpdates.dial_delay_minutes = updates.dialDelayMinutes;
      if (updates.queueExecutionEnabled !== undefined) dbUpdates.queue_execution_enabled = updates.queueExecutionEnabled;
      if (updates.queueIntervalSeconds !== undefined) dbUpdates.queue_interval_seconds = updates.queueIntervalSeconds;
      if (updates.queueUnavailableBehavior !== undefined) dbUpdates.queue_unavailable_behavior = updates.queueUnavailableBehavior;
      if (updates.retryCount !== undefined) dbUpdates.retry_count = updates.retryCount;
      if (updates.retryIntervalMinutes !== undefined) dbUpdates.retry_interval_minutes = updates.retryIntervalMinutes;
      if (updates.retryExceededBehavior !== undefined) dbUpdates.retry_exceeded_behavior = updates.retryExceededBehavior;
      if (updates.retryExceededActionId !== undefined) dbUpdates.retry_exceeded_action_id = updates.retryExceededActionId;
      if (updates.isPriority !== undefined) dbUpdates.is_priority = updates.isPriority;
      if (updates.priorityPosition !== undefined) dbUpdates.priority_position = updates.priorityPosition;

      const { data, error } = await (supabase as any)
        .from("call_campaigns")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformDbToFrontend(data as DbCallCampaign);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_campaigns"] });
      toast({ title: "Atualizado", description: "Campanha atualizada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("call_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_campaigns"] });
      toast({ title: "Deletado", description: "Campanha removida com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const duplicateCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // 1. Fetch original campaign
      const { data: original, error: fetchErr } = await (supabase as any)
        .from("call_campaigns").select("*").eq("id", id).single();
      if (fetchErr) throw fetchErr;

      // 2. Insert cloned campaign
      const { data: newCampaign, error: insertErr } = await (supabase as any)
        .from("call_campaigns")
        .insert({
          user_id: user.id,
          company_id: original.company_id || null,
          name: `Cópia de ${original.name}`,
          description: original.description,
          status: "draft",
          api4com_config: original.api4com_config,
          dial_delay_minutes: original.dial_delay_minutes,
          queue_execution_enabled: original.queue_execution_enabled,
          queue_interval_seconds: original.queue_interval_seconds,
          queue_unavailable_behavior: original.queue_unavailable_behavior,
          retry_count: original.retry_count,
          retry_interval_minutes: original.retry_interval_minutes,
          retry_exceeded_behavior: original.retry_exceeded_behavior,
          is_priority: original.is_priority,
          priority_position: original.priority_position,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      // 3. Clone call_script_actions
      const { data: actions } = await (supabase as any)
        .from("call_script_actions").select("*").eq("campaign_id", id).order("sort_order");

      const actionIdMap: Record<string, string> = {};
      if (actions && actions.length > 0) {
        const newActions = actions.map((a: any) => ({
          user_id: user.id,
          campaign_id: newCampaign.id,
          name: a.name,
          color: a.color,
          icon: a.icon,
          action_type: a.action_type,
          action_config: a.action_config,
          sort_order: a.sort_order,
        }));
        const { data: inserted } = await (supabase as any)
          .from("call_script_actions").insert(newActions).select();
        if (inserted) {
          actions.forEach((old: any, i: number) => {
            actionIdMap[old.id] = inserted[i].id;
          });
        }
      }

      // Update retry_exceeded_action_id if mapped
      if (original.retry_exceeded_action_id && actionIdMap[original.retry_exceeded_action_id]) {
        await (supabase as any).from("call_campaigns")
          .update({ retry_exceeded_action_id: actionIdMap[original.retry_exceeded_action_id] })
          .eq("id", newCampaign.id);
      }

      // 4. Clone call_scripts (with actionId remapping in nodes)
      const { data: scripts } = await (supabase as any)
        .from("call_scripts").select("*").eq("campaign_id", id);

      if (scripts && scripts.length > 0) {
        const script = scripts[0];
        let nodes = script.nodes || [];
        if (Array.isArray(nodes)) {
          nodes = nodes.map((node: any) => {
            if (node?.data?.actionId && actionIdMap[node.data.actionId]) {
              return { ...node, data: { ...node.data, actionId: actionIdMap[node.data.actionId] } };
            }
            return node;
          });
        }
        await (supabase as any).from("call_scripts").insert({
          user_id: user.id,
          campaign_id: newCampaign.id,
          name: script.name,
          nodes,
          edges: script.edges || [],
        });
      }

      return transformDbToFrontend(newCampaign as DbCallCampaign);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call_campaigns"] });
      toast({ title: "Duplicado", description: "Campanha duplicada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
    },
  });

  return {
    campaigns,
    isLoading,
    error,
    refetch,
    createCampaign: createCampaignMutation.mutateAsync,
    updateCampaign: updateCampaignMutation.mutateAsync,
    deleteCampaign: deleteCampaignMutation.mutateAsync,
    duplicateCampaign: duplicateCampaignMutation.mutateAsync,
    isCreating: createCampaignMutation.isPending,
    isUpdating: updateCampaignMutation.isPending,
    isDeleting: deleteCampaignMutation.isPending,
    isDuplicating: duplicateCampaignMutation.isPending,
  };
}
