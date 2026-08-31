import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export type WorkflowSourceType =
  | "dispatch_sequence" | "group_sequence" | "context_campaign" | "pirate_campaign" | "call_campaign";
export type WorkflowStatus = "draft" | "active" | "paused" | "error";

export interface WorkflowDefinition {
  id: string;
  companyId: string;
  folderId?: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  sourceType: WorkflowSourceType;
  sourceId: string;
  triggerType?: string;
  triggerConfig?: any;
  createdAt: string;
  updatedAt: string;
}

interface DbWorkflowDefinition {
  id: string;
  company_id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  status: string;
  source_type: string;
  source_id: string;
  trigger_type: string | null;
  created_at: string;
  updated_at: string;
}

const transformDbToFrontend = (db: DbWorkflowDefinition, seqConfig?: { trigger_type?: string; trigger_config?: any }): WorkflowDefinition => ({
  id: db.id,
  companyId: db.company_id,
  folderId: db.folder_id || undefined,
  name: db.name,
  description: db.description || undefined,
  status: (db.status as WorkflowStatus) || "draft",
  sourceType: db.source_type as WorkflowSourceType,
  sourceId: db.source_id,
  triggerType: seqConfig?.trigger_type || db.trigger_type || undefined,
  triggerConfig: seqConfig?.trigger_config || undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export function useWorkflowDefinitions(filters?: { folderId?: string | null; status?: WorkflowStatus }) {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: definitions = [], isLoading } = useQuery({
    queryKey: ["workflow_definitions", activeCompanyId, filters?.folderId, filters?.status],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let query = supabase
        .from("workflow_definitions" as any)
        .select("*")
        .or(`company_id.eq.${activeCompanyId},company_id.is.null`)
        .order("created_at", { ascending: false });

      if (filters?.folderId === null) {
        query = query.is("folder_id", null);
      } else if (filters?.folderId) {
        query = query.eq("folder_id", filters.folderId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const [defsRes, seqsRes] = await Promise.all([
        query,
        supabase
          .from("message_sequences")
          .select("id, trigger_type, trigger_config")
          .or(`company_id.eq.${activeCompanyId},company_id.is.null`),
      ]);

      if (defsRes.error) {
        if ((defsRes.error as any).code === "42P01") return [];
        throw defsRes.error;
      }

      const seqsMap = new Map<string, { trigger_type?: string; trigger_config?: any }>();
      if (seqsRes.data) {
        for (const seq of seqsRes.data as any[]) {
          seqsMap.set(seq.id, seq);
        }
      }

      return (defsRes.data as unknown as DbWorkflowDefinition[]).map((d) => 
        transformDbToFrontend(d, seqsMap.get(d.source_id))
      );
    },
    enabled: !!user && !!activeCompanyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["workflow_definitions"] });

  const createWorkflowDefinition = useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      folderId?: string | null;
      sourceType: WorkflowSourceType;
      sourceId: string;
      status?: WorkflowStatus;
      triggerType?: string;
    }) => {
      if (!user || !activeCompanyId) throw new Error("Selecione uma empresa ativa");
      const { data, error } = await supabase
        .from("workflow_definitions" as any)
        .insert({
          company_id: activeCompanyId,
          folder_id: input.folderId || null,
          name: input.name,
          description: input.description || null,
          status: input.status || "draft",
          source_type: input.sourceType,
          source_id: input.sourceId,
          trigger_type: input.triggerType || "manual",
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return transformDbToFrontend(data as unknown as DbWorkflowDefinition);
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error("Erro ao criar automação", { description: error.message }),
  });

  const moveToFolder = useMutation({
    mutationFn: async ({ id, folderId }: { id: string; folderId: string | null }) => {
      const { error } = await supabase.from("workflow_definitions" as any).update({ folder_id: folderId }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error("Erro ao mover automação", { description: error.message }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WorkflowStatus }) => {
      const { error } = await supabase.from("workflow_definitions" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error("Erro ao atualizar status", { description: error.message }),
  });

  const deleteWorkflowDefinition = useMutation({
    mutationFn: async (id: string) => {
      // First, get the workflow definition to find sourceId and sourceType
      const { data: wf } = await supabase
        .from("workflow_definitions" as any)
        .select("source_type, source_id")
        .eq("id", id)
        .maybeSingle();
      
      const { error } = await supabase
        .from("workflow_definitions" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Delete corresponding source if needed
      if (wf) {
        const typedWf = wf as any;
        try {
          if (typedWf.source_type === "group_sequence" || typedWf.source_type === "dispatch_sequence") {
            // Delete message sequence (this will cascade delete nodes and connections)
            await supabase.from("message_sequences").delete().eq("id", typedWf.source_id);
          } else if (typedWf.source_type === "context_campaign") {
            await supabase.from("context_campaigns" as any).delete().eq("id", typedWf.source_id);
          } else if (typedWf.source_type === "pirate_campaign") {
            await supabase.from("pirate_campaigns" as any).delete().eq("id", typedWf.source_id);
          } else if (typedWf.source_type === "call_campaign") {
            await supabase.from("call_campaigns" as any).delete().eq("id", typedWf.source_id);
          }
        } catch (err) {
          console.warn("[deleteWorkflowDefinition] Failed to delete source campaign:", err);
        }
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Automação excluída com sucesso");
    },
    onError: (error: Error) => toast.error("Erro ao excluir automação", { description: error.message }),
  });

  const duplicateWorkflowDefinition = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !activeCompanyId) throw new Error("Selecione uma empresa ativa");

      // 1. Fetch original workflow definition
      const { data: originalWf, error: wfError } = await supabase
        .from("workflow_definitions" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (wfError) throw wfError;

      const typedWf = originalWf as any;
      let newSourceId = typedWf.source_id;

      // 2. Clone the source based on sourceType
      if (typedWf.source_type === "group_sequence" || typedWf.source_type === "dispatch_sequence") {
        // A. Fetch original message_sequence
        const { data: originalSeq } = await supabase
          .from("message_sequences")
          .select("*")
          .eq("id", typedWf.source_id)
          .single();

        if (originalSeq) {
          // B. Duplicate group_campaign if group_campaign_id exists
          let newCampaignId = (originalSeq as any).group_campaign_id;
          if (newCampaignId) {
            const { data: originalCamp } = await supabase
              .from("group_campaigns")
              .select("*")
              .eq("id", newCampaignId)
              .single();
            if (originalCamp) {
              const { data: newCamp } = await supabase
                .from("group_campaigns")
                .insert({
                  user_id: user.id,
                  company_id: activeCompanyId,
                  name: `Cópia de ${originalCamp.name}`,
                  description: originalCamp.description,
                  status: "draft"
                })
                .select()
                .single();
              if (newCamp) newCampaignId = newCamp.id;
            }
          }

          // C. Duplicate message_sequence
          const { data: newSeq, error: seqError } = await supabase
            .from("message_sequences")
            .insert({
              user_id: user.id,
              company_id: activeCompanyId,
              group_campaign_id: newCampaignId,
              name: `Cópia de ${originalSeq.name}`,
              description: originalSeq.description,
              trigger_type: originalSeq.trigger_type,
              trigger_config: originalSeq.trigger_config,
              active: false,
            })
            .select()
            .single();
          if (seqError) throw seqError;
          newSourceId = newSeq.id;

          // D. Fetch and clone nodes and connections
          const { data: originalNodes } = await supabase
            .from("sequence_nodes")
            .select("*")
            .eq("sequence_id", typedWf.source_id)
            .order("node_order", { ascending: true });

          const idMapping: Record<string, string> = {};

          if (originalNodes && originalNodes.length > 0) {
            const { data: newNodes, error: nodesError } = await supabase
              .from("sequence_nodes")
              .insert(originalNodes.map((n: any) => ({
                sequence_id: newSeq.id,
                user_id: user.id,
                company_id: activeCompanyId,
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

            // Clone connections
            const { data: originalConns } = await supabase
              .from("sequence_connections")
              .select("*")
              .eq("sequence_id", typedWf.source_id);

            if (originalConns && originalConns.length > 0) {
              const { error: connsError } = await supabase
                .from("sequence_connections")
                .insert(originalConns.map((c: any) => ({
                  sequence_id: newSeq.id,
                  user_id: user.id,
                  company_id: activeCompanyId,
                  source_node_id: idMapping[c.source_node_id] || c.source_node_id,
                  target_node_id: idMapping[c.target_node_id] || c.target_node_id,
                  condition_path: c.condition_path,
                })));
              if (connsError) throw connsError;
            }
          }
        }
      } else {
        // Fallback or copy other campaign types
        try {
          if (typedWf.source_type === "context_campaign") {
            const { data: original } = await supabase.from("context_campaigns" as any).select("*").eq("id", typedWf.source_id).single();
            if (original) {
              const { data: inserted } = await supabase.from("context_campaigns" as any).insert({ ...original, id: undefined, name: `Cópia de ${original.name}`, company_id: activeCompanyId }).select().single();
              if (inserted) newSourceId = inserted.id;
            }
          } else if (typedWf.source_type === "pirate_campaign") {
            const { data: original } = await supabase.from("pirate_campaigns" as any).select("*").eq("id", typedWf.source_id).single();
            if (original) {
              const { data: inserted } = await supabase.from("pirate_campaigns" as any).insert({ ...original, id: undefined, name: `Cópia de ${original.name}`, company_id: activeCompanyId }).select().single();
              if (inserted) newSourceId = inserted.id;
            }
          } else if (typedWf.source_type === "call_campaign") {
            const { data: original } = await supabase.from("call_campaigns" as any).select("*").eq("id", typedWf.source_id).single();
            if (original) {
              const { data: inserted } = await supabase.from("call_campaigns" as any).insert({ ...original, id: undefined, name: `Cópia de ${original.name}`, company_id: activeCompanyId }).select().single();
              if (inserted) newSourceId = inserted.id;
            }
          }
        } catch (e) {
          console.warn("[duplicateWorkflowDefinition] Failed to duplicate legacy campaign:", e);
        }
      }

      // 3. Insert the new workflow definition
      const { data: newWf, error: newWfError } = await supabase
        .from("workflow_definitions" as any)
        .insert({
          company_id: activeCompanyId,
          folder_id: typedWf.folder_id || null,
          name: `Cópia de ${typedWf.name}`,
          description: typedWf.description || null,
          status: "draft",
          source_type: typedWf.source_type,
          source_id: newSourceId,
          trigger_type: typedWf.trigger_type || "manual",
          created_by: user.id,
        })
        .select()
        .single();

      if (newWfError) throw newWfError;
      return transformDbToFrontend(newWf as unknown as DbWorkflowDefinition);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Automação duplicada com sucesso");
    },
    onError: (error: Error) => toast.error("Erro ao duplicar automação", { description: error.message }),
  });

  return {
    definitions,
    isLoading,
    createWorkflowDefinition: createWorkflowDefinition.mutateAsync,
    moveToFolder: moveToFolder.mutateAsync,
    updateStatus: updateStatus.mutateAsync,
    deleteWorkflowDefinition: deleteWorkflowDefinition.mutateAsync,
    duplicateWorkflowDefinition: duplicateWorkflowDefinition.mutateAsync,
  };
}
