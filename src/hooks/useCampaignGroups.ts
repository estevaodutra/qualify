import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface CampaignGroup {
  id: string;
  campaignId: string;
  groupJid: string;
  groupName: string;
  instanceId: string | null;
  addedAt: string;
}

interface DbCampaignGroup {
  id: string;
  campaign_id: string;
  user_id: string;
  group_jid: string;
  group_name: string;
  instance_id: string | null;
  added_at: string | null;
}

const transformDbToFrontend = (db: DbCampaignGroup): CampaignGroup => ({
  id: db.id,
  campaignId: db.campaign_id,
  groupJid: db.group_jid,
  groupName: db.group_name,
  instanceId: db.instance_id,
  addedAt: db.added_at || new Date().toISOString(),
});

export function useCampaignGroups(campaignId: string | undefined) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: linkedGroups = [], isLoading, error, refetch } = useQuery({
    queryKey: ["campaign_groups", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from("campaign_groups")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("added_at", { ascending: false });

      if (error) throw error;
      return (data as DbCampaignGroup[]).map(transformDbToFrontend);
    },
    enabled: !!campaignId && !!user,
  });

  const addGroupsMutation = useMutation({
    mutationFn: async (groups: { jid: string; name: string; instanceId?: string }[]) => {
      if (!campaignId || !user) throw new Error("Missing campaign or user");

      const { error } = await supabase
        .from("campaign_groups")
        .insert(
          groups.map((g) => ({
            campaign_id: campaignId,
            user_id: user.id,
            group_jid: g.jid,
            group_name: g.name,
            instance_id: g.instanceId || null,
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign_groups", campaignId] });
      toast({ title: "Sucesso", description: "Grupo(s) adicionado(s) à campanha." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const removeGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("campaign_groups")
        .delete()
        .eq("id", groupId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign_groups", campaignId] });
      toast({ title: "Removido", description: "Grupo removido da campanha." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    linkedGroups,
    isLoading,
    error,
    refetch,
    addGroups: addGroupsMutation.mutateAsync,
    removeGroup: removeGroupMutation.mutateAsync,
    isAdding: addGroupsMutation.isPending,
    isRemoving: removeGroupMutation.isPending,
  };
}
