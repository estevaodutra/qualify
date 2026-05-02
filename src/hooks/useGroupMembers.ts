import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export interface GroupMember {
  id: string;
  groupCampaignId: string;
  phone: string;
  lid: string | null;
  name: string | null;
  profilePhoto: string | null;
  status: "active" | "removed" | "left" | "muted";
  strikes: number;
  lastStrikeAt: string | null;
  joinedAt: string;
  leftAt: string | null;
  isAdmin: boolean;
  messageCount: number;
  lastMessageAt: string | null;
}

interface DbGroupMember {
  id: string;
  group_campaign_id: string;
  user_id: string;
  phone: string;
  lid: string | null;
  name: string | null;
  profile_photo: string | null;
  status: string | null;
  strikes: number | null;
  last_strike_at: string | null;
  joined_at: string | null;
  left_at: string | null;
  is_admin: boolean | null;
  message_count: number | null;
  last_message_at: string | null;
}

const transformDbToFrontend = (db: DbGroupMember): GroupMember => ({
  id: db.id,
  groupCampaignId: db.group_campaign_id,
  phone: db.phone,
  lid: db.lid || null,
  name: db.name,
  profilePhoto: db.profile_photo,
  status: (db.status as GroupMember["status"]) || "active",
  strikes: db.strikes || 0,
  lastStrikeAt: db.last_strike_at,
  joinedAt: db.joined_at || new Date().toISOString(),
  leftAt: db.left_at,
  isAdmin: db.is_admin || false,
  messageCount: db.message_count || 0,
  lastMessageAt: db.last_message_at,
});

export function useGroupMembers(groupCampaignId: string | null) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading, error, refetch } = useQuery({
    queryKey: ["group_members", groupCampaignId],
    queryFn: async () => {
      if (!groupCampaignId) return [];
      
      const { data, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_campaign_id", groupCampaignId)
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return (data as DbGroupMember[]).map(transformDbToFrontend);
    },
    enabled: !!user && !!groupCampaignId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!groupCampaignId) return;

    const channel = supabase
      .channel(`group_members_rt_${groupCampaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_campaign_id=eq.${groupCampaignId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["group_members", groupCampaignId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupCampaignId, queryClient]);

  const addMemberMutation = useMutation({
    mutationFn: async (member: { phone: string; name?: string; isAdmin?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      if (!groupCampaignId) throw new Error("No group campaign selected");

      const { data, error } = await supabase
        .from("group_members")
        .upsert({
          user_id: user.id,
          group_campaign_id: groupCampaignId,
          phone: member.phone,
          name: member.name || null,
          is_admin: member.isAdmin || false,
        }, { onConflict: "group_campaign_id,phone" })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from("leads")
        .upsert({
          user_id: user.id,
          phone: member.phone,
          name: member.name || null,
          active_campaign_id: groupCampaignId,
          active_campaign_type: "grupos",
          status: "active",
        }, { onConflict: "phone,user_id", ignoreDuplicates: false });

      return transformDbToFrontend(data as DbGroupMember);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_members", groupCampaignId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Membro adicionado", description: "Membro adicionado à lista." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const addMembersBulkMutation = useMutation({
    mutationFn: async (members: Array<{ phone: string; name?: string }>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      if (!groupCampaignId) throw new Error("No group campaign selected");

      const records = members.map((m) => ({
        user_id: user.id,
        group_campaign_id: groupCampaignId,
        phone: m.phone,
        name: m.name || null,
      }));

      const { error } = await supabase.from("group_members").upsert(records, { onConflict: "group_campaign_id,phone" });
      if (error) throw error;

      const leadRecords = members.map((m) => ({
        user_id: user.id,
        phone: m.phone,
        name: m.name || null,
        active_campaign_id: groupCampaignId,
        active_campaign_type: "grupos",
        status: "active",
      }));

      await supabase
        .from("leads")
        .upsert(leadRecords, { onConflict: "phone,user_id", ignoreDuplicates: false });

      return members.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["group_members", groupCampaignId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Membros importados", description: `${count} membros adicionados.` });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        name: string;
        status: string;
        strikes: number;
        isAdmin: boolean;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.strikes !== undefined) dbUpdates.strikes = updates.strikes;
      if (updates.isAdmin !== undefined) dbUpdates.is_admin = updates.isAdmin;

      const { error } = await supabase
        .from("group_members")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_members", groupCampaignId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("group_members")
        .update({ status: "removed", left_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_members", groupCampaignId] });
      toast({ title: "Membro removido", description: "Membro marcado como removido." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_members", groupCampaignId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const reactivateMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Fetch member to get phone for history
      const { data: member, error: fetchError } = await supabase
        .from("group_members")
        .select("phone, group_campaign_id")
        .eq("id", id)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("group_members")
        .update({ status: "active", left_at: null })
        .eq("id", id);
      if (error) throw error;

      if (member?.phone && member?.group_campaign_id) {
        await supabase.from("group_member_history").insert({
          group_campaign_id: member.group_campaign_id,
          user_id: user.id,
          member_phone: member.phone,
          action: "join",
          reason: "manual",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_members", groupCampaignId] });
      toast({ title: "Membro reativado", description: "Status atualizado para Ativo." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    removed: members.filter((m) => m.status === "removed" || m.status === "left").length,
    admins: members.filter((m) => m.isAdmin).length,
    withStrikes: members.filter((m) => m.strikes > 0).length,
  };

  return {
    members,
    stats,
    isLoading,
    error,
    refetch,
    addMember: addMemberMutation.mutateAsync,
    addMembersBulk: addMembersBulkMutation.mutateAsync,
    updateMember: updateMemberMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
    deleteMember: deleteMemberMutation.mutateAsync,
    reactivateMember: reactivateMemberMutation.mutateAsync,
    isAdding: addMemberMutation.isPending || addMembersBulkMutation.isPending,
    isUpdating: updateMemberMutation.isPending,
    isRemoving: removeMemberMutation.isPending,
    isReactivating: reactivateMemberMutation.isPending,
  };
}
