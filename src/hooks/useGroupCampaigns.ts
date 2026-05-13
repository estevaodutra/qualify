import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

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
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, error, refetch } = useQuery({
    queryKey: ["group_campaigns", activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("group_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      } else {
        // Strict isolation: if no company selected, only show those explicitly with NO company_id
        // and owned by the user. This prevents leakage from other companies.
        query = query.eq("user_id", user?.id).is("company_id", null);
      }

      const { data, error } = await query;

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
          company_id: activeCompanyId,
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

// ── Import campaign from DispatchOne JSON ──────────────────────────────────
interface ImportedCampaignJson {
  version: string;
  type: string;
  campaign: {
    name: string;
    group_description: string | null;
    config: Record<string, unknown>;
    message_permission: string;
    edit_permission: string;
  };
  sequences: Array<{
    _original_id: string;
    name: string;
    description: string | null;
    trigger_type: string;
    trigger_config: Record<string, unknown>;
    active: boolean;
  }>;
  sequence_nodes: Array<{
    _original_id: string;
    sequence_id: string;
    node_type: string;
    position_x: number;
    position_y: number;
    node_order: number;
    config: Record<string, unknown>;
  }>;
  sequence_connections: Array<{
    sequence_id: string;
    source_node_id: string;
    target_node_id: string;
    condition_path?: string | null;
  }>;
}

export function useImportGroupCampaign() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: ImportedCampaignJson) => {
      if (!user) throw new Error("Não autenticado");
      const sb = supabase as any;

      // 1. Campanha
      const { data: campaign, error: campErr } = await sb
        .from("group_campaigns")
        .insert({
          user_id: user.id,
          company_id: activeCompanyId || null,
          name: json.campaign.name,
          group_description: json.campaign.group_description,
          config: json.campaign.config || {},
          message_permission: json.campaign.message_permission || "all",
          edit_permission: json.campaign.edit_permission || "all",
          status: "draft",
        })
        .select()
        .single();
      if (campErr) throw campErr;

      const seqIdMap = new Map<string, string>();

      // 2. Sequences
      for (const seq of json.sequences || []) {
        const { data: newSeq, error: seqErr } = await sb
          .from("message_sequences")
          .insert({
            user_id: user.id,
            group_campaign_id: campaign.id,
            name: seq.name,
            description: seq.description,
            trigger_type: seq.trigger_type,
            trigger_config: seq.trigger_config || {},
            active: seq.active ?? true,
          })
          .select()
          .single();
        if (seqErr) throw seqErr;
        seqIdMap.set(seq._original_id, newSeq.id);
      }

      const nodeIdMap = new Map<string, string>();

      // 3. Nodes
      for (const node of json.sequence_nodes || []) {
        const seqId = seqIdMap.get(node.sequence_id);
        if (!seqId) continue;
        const { data: newNode, error: nodeErr } = await sb
          .from("sequence_nodes")
          .insert({
            user_id: user.id,
            sequence_id: seqId,
            node_type: node.node_type,
            position_x: node.position_x || 0,
            position_y: node.position_y || 0,
            node_order: node.node_order || 0,
            config: node.config || {},
          })
          .select()
          .single();
        if (nodeErr) throw nodeErr;
        nodeIdMap.set(node._original_id, newNode.id);
      }

      // 4. Connections
      for (const conn of json.sequence_connections || []) {
        const seqId = seqIdMap.get(conn.sequence_id);
        const srcId = nodeIdMap.get(conn.source_node_id);
        const tgtId = nodeIdMap.get(conn.target_node_id);
        if (!seqId || !srcId || !tgtId) continue;
        await sb.from("sequence_connections").insert({
          user_id: user.id,
          sequence_id: seqId,
          source_node_id: srcId,
          target_node_id: tgtId,
          condition_path: conn.condition_path || null,
        });
      }

      return campaign;
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ["group_campaigns"] });
      toast({ title: `Campanha "${campaign.name}" importada com sucesso!` });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao importar", description: error.message, variant: "destructive" });
    },
  });
}
