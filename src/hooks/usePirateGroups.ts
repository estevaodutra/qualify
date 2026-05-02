import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PirateGroup {
  id: string;
  campaignId: string;
  groupJid: string;
  groupName: string | null;
  isActive: boolean;
  leadsCaptured: number;
  createdAt: string;
}

const transform = (row: any): PirateGroup => ({
  id: row.id,
  campaignId: row.campaign_id,
  groupJid: row.group_jid,
  groupName: row.group_name,
  isActive: row.is_active ?? true,
  leadsCaptured: row.leads_captured || 0,
  createdAt: row.created_at,
});

export function usePirateGroups(campaignId: string | null) {
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["pirate_campaign_groups", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pirate_campaign_groups")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(transform);
    },
    enabled: !!campaignId,
  });

  const addGroups = useMutation({
    mutationFn: async (input: { jid: string; name: string }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !campaignId) throw new Error("Missing data");

      const rows = input.map((g) => ({
        campaign_id: campaignId,
        user_id: user.id,
        group_jid: g.jid,
        group_name: g.name,
      }));

      const { error } = await (supabase as any)
        .from("pirate_campaign_groups")
        .insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pirate_campaign_groups", campaignId] });
    },
  });

  const removeGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await (supabase as any)
        .from("pirate_campaign_groups")
        .delete()
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pirate_campaign_groups", campaignId] });
    },
  });

  const toggleGroup = useMutation({
    mutationFn: async ({ groupId, isActive }: { groupId: string; isActive: boolean }) => {
      const { error } = await (supabase as any)
        .from("pirate_campaign_groups")
        .update({ is_active: isActive })
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pirate_campaign_groups", campaignId] });
    },
  });

  return {
    groups,
    isLoading,
    addGroups: addGroups.mutateAsync,
    removeGroup: removeGroup.mutateAsync,
    toggleGroup: toggleGroup.mutateAsync,
    isAdding: addGroups.isPending,
  };
}
