import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

export interface SequenceNode {
  id: string;
  sequenceId: string;
  nodeType: string;
  positionX: number;
  positionY: number;
  nodeOrder: number;
  config: Record<string, unknown>;
  createdAt: string;
}

export interface SequenceConnection {
  id: string;
  sequenceId: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionPath: string | null;
}

export interface MessageSequence {
  id: string;
  groupCampaignId: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: SequenceNode[];
  connections?: SequenceConnection[];
}

interface DbSequence {
  id: string;
  user_id: string;
  group_campaign_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown> | null;
  active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface DbNode {
  id: string;
  sequence_id: string;
  user_id: string;
  node_type: string;
  position_x: number | null;
  position_y: number | null;
  node_order: number | null;
  config: Record<string, unknown>;
  created_at: string | null;
}

interface DbConnection {
  id: string;
  sequence_id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  condition_path: string | null;
}

const transformSequence = (db: DbSequence): MessageSequence => ({
  id: db.id,
  groupCampaignId: db.group_campaign_id,
  name: db.name,
  description: db.description,
  triggerType: db.trigger_type,
  triggerConfig: db.trigger_config || {},
  active: db.active ?? true,
  createdAt: db.created_at || new Date().toISOString(),
  updatedAt: db.updated_at || new Date().toISOString(),
});

const transformNode = (db: DbNode): SequenceNode => ({
  id: db.id,
  sequenceId: db.sequence_id,
  nodeType: db.node_type,
  positionX: db.position_x ?? 0,
  positionY: db.position_y ?? 0,
  nodeOrder: db.node_order ?? 0,
  config: db.config,
  createdAt: db.created_at || new Date().toISOString(),
});

const transformConnection = (db: DbConnection): SequenceConnection => ({
  id: db.id,
  sequenceId: db.sequence_id,
  sourceNodeId: db.source_node_id,
  targetNodeId: db.target_node_id,
  conditionPath: db.condition_path,
});

// Hook for managing message sequences
export function useSequences(campaignId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sequences = [], isLoading, error, refetch } = useQuery({
    queryKey: ["message_sequences", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from("message_sequences")
        .select("*")
        .eq("group_campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as DbSequence[]).map(transformSequence);
    },
    enabled: !!campaignId,
  });

  const createSequenceMutation = useMutation({
    mutationFn: async (sequence: {
      name: string;
      description?: string;
      triggerType: string;
      triggerConfig?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("message_sequences")
        .insert({
          user_id: user.id,
          group_campaign_id: campaignId!,
          name: sequence.name,
          description: sequence.description || null,
          trigger_type: sequence.triggerType,
          trigger_config: (sequence.triggerConfig || {}) as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return transformSequence(data as DbSequence);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message_sequences", campaignId] });
      toast({ title: "Sequência criada", description: "Sequência criada com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateSequenceMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        name: string;
        description: string;
        triggerType: string;
        triggerConfig: Record<string, unknown>;
        active: boolean;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.triggerType !== undefined) dbUpdates.trigger_type = updates.triggerType;
      if (updates.triggerConfig !== undefined) dbUpdates.trigger_config = updates.triggerConfig;
      if (updates.active !== undefined) dbUpdates.active = updates.active;

      const { error } = await supabase
        .from("message_sequences")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;

      // When deactivating, cancel all paused executions immediately
      if (updates.active === false) {
        await supabase
          .from("sequence_executions")
          .update({ status: "cancelled", error_message: "Sequence deactivated by user", updated_at: new Date().toISOString() })
          .eq("sequence_id", id)
          .eq("status", "paused");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message_sequences", campaignId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteSequenceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("message_sequences")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message_sequences", campaignId] });
      toast({ title: "Deletado", description: "Sequência removida com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const duplicateSequenceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // 1. Fetch original sequence
      const { data: original, error: seqError } = await supabase
        .from("message_sequences")
        .select("*")
        .eq("id", id)
        .single();
      if (seqError) throw seqError;

      // 2. Clone sequence
      const { data: newSeq, error: insertError } = await supabase
        .from("message_sequences")
        .insert({
          user_id: user.id,
          group_campaign_id: original.group_campaign_id,
          name: `Cópia de ${original.name}`,
          description: original.description,
          trigger_type: original.trigger_type,
          trigger_config: original.trigger_config,
          active: false,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // 3. Clone nodes
      const { data: originalNodes } = await supabase
        .from("sequence_nodes")
        .select("*")
        .eq("sequence_id", id)
        .order("node_order", { ascending: true });

      const idMapping: Record<string, string> = {};

      if (originalNodes && originalNodes.length > 0) {
        const { data: newNodes, error: nodesError } = await supabase
          .from("sequence_nodes")
          .insert(originalNodes.map((n: any) => ({
            sequence_id: newSeq.id,
            user_id: user.id,
            node_type: n.node_type,
            position_x: n.position_x,
            position_y: n.position_y,
            node_order: n.node_order,
            config: n.config,
          })))
          .select("id");
        if (nodesError) throw nodesError;

        originalNodes.forEach((n: any, i: number) => {
          if (newNodes?.[i]) idMapping[n.id] = newNodes[i].id;
        });

        // 4. Clone connections
        const { data: originalConns } = await supabase
          .from("sequence_connections")
          .select("*")
          .eq("sequence_id", id);

        if (originalConns && originalConns.length > 0) {
          const { error: connsError } = await supabase
            .from("sequence_connections")
            .insert(originalConns.map((c: any) => ({
              sequence_id: newSeq.id,
              user_id: user.id,
              source_node_id: idMapping[c.source_node_id] || c.source_node_id,
              target_node_id: idMapping[c.target_node_id] || c.target_node_id,
              condition_path: c.condition_path,
            })));
          if (connsError) throw connsError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message_sequences", campaignId] });
      toast({ title: "Sequência duplicada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
    },
  });

  return {
    sequences,
    isLoading,
    error,
    refetch,
    createSequence: createSequenceMutation.mutateAsync,
    updateSequence: updateSequenceMutation.mutateAsync,
    deleteSequence: deleteSequenceMutation.mutateAsync,
    duplicateSequence: duplicateSequenceMutation.mutateAsync,
    isCreating: createSequenceMutation.isPending,
    isUpdating: updateSequenceMutation.isPending,
    isDeleting: deleteSequenceMutation.isPending,
  };
}

export function useSequenceNodes(sequenceId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: nodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ["sequence_nodes", sequenceId],
    queryFn: async () => {
      if (!sequenceId) return [];
      const { data, error } = await supabase
        .from("sequence_nodes")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("node_order", { ascending: true });

      if (error) throw error;
      return (data as DbNode[]).map(transformNode);
    },
    enabled: !!sequenceId,
  });

  const { data: connections = [], isLoading: connectionsLoading } = useQuery({
    queryKey: ["sequence_connections", sequenceId],
    queryFn: async () => {
      if (!sequenceId) return [];
      const { data, error } = await supabase
        .from("sequence_connections")
        .select("*")
        .eq("sequence_id", sequenceId);

      if (error) throw error;
      return (data as DbConnection[]).map(transformConnection);
    },
    enabled: !!sequenceId,
  });

  const saveNodesMutation = useMutation({
    mutationFn: async (nodesToSave: Array<{
      localId: string;
      nodeType: string;
      positionX: number;
      positionY: number;
      nodeOrder: number;
      config: Record<string, unknown>;
    }>): Promise<Record<string, string>> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !sequenceId) throw new Error("Not authenticated");

      // Delete existing nodes
      await supabase
        .from("sequence_nodes")
        .delete()
        .eq("sequence_id", sequenceId);

      // Insert new nodes and get generated IDs
      if (nodesToSave.length > 0) {
        const { data: insertedNodes, error } = await supabase
          .from("sequence_nodes")
          .insert(nodesToSave.map((node, index) => ({
            sequence_id: sequenceId!,
            user_id: user.id,
            node_type: node.nodeType,
            position_x: node.positionX,
            position_y: node.positionY,
            node_order: node.nodeOrder ?? index,
            config: node.config as Json,
          })))
          .select("id");

        if (error) throw error;

        // Create mapping: localId -> dbId (by insertion order)
        const idMapping: Record<string, string> = {};
        nodesToSave.forEach((node, index) => {
          if (insertedNodes && insertedNodes[index]) {
            idMapping[node.localId] = insertedNodes[index].id;
          }
        });

        return idMapping;
      }

      return {};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequence_nodes", sequenceId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const saveConnectionsMutation = useMutation({
    mutationFn: async ({ 
      connectionsToSave, 
      idMapping 
    }: {
      connectionsToSave: Array<{
        sourceNodeId: string;
        targetNodeId: string;
        conditionPath?: string;
      }>;
      idMapping: Record<string, string>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !sequenceId) throw new Error("Not authenticated");

      // Delete existing connections
      await supabase
        .from("sequence_connections")
        .delete()
        .eq("sequence_id", sequenceId);

      // Insert new connections with mapped IDs
      if (connectionsToSave.length > 0) {
        const { error } = await supabase
          .from("sequence_connections")
          .insert(connectionsToSave.map(conn => ({
            sequence_id: sequenceId,
            user_id: user.id,
            source_node_id: idMapping[conn.sourceNodeId] || conn.sourceNodeId,
            target_node_id: idMapping[conn.targetNodeId] || conn.targetNodeId,
            condition_path: conn.conditionPath || null,
          })));

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequence_connections", sequenceId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    nodes,
    connections,
    isLoading: nodesLoading || connectionsLoading,
    saveNodes: saveNodesMutation.mutateAsync,
    saveConnections: saveConnectionsMutation.mutateAsync,
    isSaving: saveNodesMutation.isPending || saveConnectionsMutation.isPending,
  };
}
