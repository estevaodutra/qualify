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

const transformDbToFrontend = (db: DbWorkflowDefinition): WorkflowDefinition => ({
  id: db.id,
  companyId: db.company_id,
  folderId: db.folder_id || undefined,
  name: db.name,
  description: db.description || undefined,
  status: (db.status as WorkflowStatus) || "draft",
  sourceType: db.source_type as WorkflowSourceType,
  sourceId: db.source_id,
  triggerType: db.trigger_type || undefined,
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
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (filters?.folderId === null) {
        query = query.is("folder_id", null);
      } else if (filters?.folderId) {
        query = query.eq("folder_id", filters.folderId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) {
        if ((error as any).code === "42P01") return [];
        throw error;
      }
      return (data as unknown as DbWorkflowDefinition[]).map(transformDbToFrontend);
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

  return {
    definitions,
    isLoading,
    createWorkflowDefinition: createWorkflowDefinition.mutateAsync,
    moveToFolder: moveToFolder.mutateAsync,
    updateStatus: updateStatus.mutateAsync,
  };
}
