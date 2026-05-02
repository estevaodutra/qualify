import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface GroupCampaign {
  id: string;
  name: string;
  instanceId: string | null;
  groupJid: string | null;
  groupName: string | null;
  groupDescription: string | null;
  groupPhotoUrl: string | null;
  inviteLink: string | null;
  status: "draft" | "active" | "paused" | "archived";
  messagePermission: "all" | "admins";
  editPermission: "all" | "admins";
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface DbGroupCampaign {
  id: string;
  user_id: string;
  instance_id: string | null;
  name: string;
  group_jid: string | null;
  group_name: string | null;
  group_description: string | null;
  group_photo_url: string | null;
  invite_link: string | null;
  status: string | null;
  message_permission: string | null;
  edit_permission: string | null;
  config: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

const transformDbToFrontend = (db: DbGroupCampaign): GroupCampaign => ({
  id: db.id,
  name: db.name,
  instanceId: db.instance_id,
  groupJid: db.group_jid,
  groupName: db.group_name,
  groupDescription: db.group_description,
  groupPhotoUrl: db.group_photo_url,
  inviteLink: db.invite_link,
  status: (db.status as GroupCampaign["status"]) || "draft",
  messagePermission: (db.message_permission as GroupCampaign["messagePermission"]) || "all",
  editPermission: (db.edit_permission as GroupCampaign["editPermission"]) || "all",
  config: db.config || {},
  createdAt: db.created_at || new Date().toISOString(),
  updatedAt: db.updated_at || new Date().toISOString(),
});

export function useGroupCampaigns() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, error, refetch } = useQuery({
    queryKey: ["group_campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as DbGroupCampaign[]).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: {
      name: string;
      instanceId?: string;
      groupName?: string;
      groupDescription?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("group_campaigns")
        .insert({
          user_id: user.id,
          name: campaign.name,
          instance_id: campaign.instanceId || null,
          group_name: campaign.groupName || null,
          group_description: campaign.groupDescription || null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return transformDbToFrontend(data as DbGroupCampaign);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_campaigns"] });
      toast({ title: "Campanha criada", description: "Campanha de grupo criada com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        name: string;
        instanceId: string;
        groupJid: string;
        groupName: string;
        groupDescription: string;
        groupPhotoUrl: string;
        inviteLink: string;
        status: string;
        messagePermission: string;
        editPermission: string;
        config: Record<string, unknown>;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.instanceId !== undefined) dbUpdates.instance_id = updates.instanceId;
      if (updates.groupJid !== undefined) dbUpdates.group_jid = updates.groupJid;
      if (updates.groupName !== undefined) dbUpdates.group_name = updates.groupName;
      if (updates.groupDescription !== undefined) dbUpdates.group_description = updates.groupDescription;
      if (updates.groupPhotoUrl !== undefined) dbUpdates.group_photo_url = updates.groupPhotoUrl;
      if (updates.inviteLink !== undefined) dbUpdates.invite_link = updates.inviteLink;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.messagePermission !== undefined) dbUpdates.message_permission = updates.messagePermission;
      if (updates.editPermission !== undefined) dbUpdates.edit_permission = updates.editPermission;
      if (updates.config !== undefined) dbUpdates.config = updates.config;

      const { error } = await supabase
        .from("group_campaigns")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_campaigns"] });
      toast({ title: "Atualizado", description: "Campanha atualizada com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_campaigns"] });
      toast({ title: "Deletado", description: "Campanha removida com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
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
    isCreating: createCampaignMutation.isPending,
    isUpdating: updateCampaignMutation.isPending,
    isDeleting: deleteCampaignMutation.isPending,
  };
}
