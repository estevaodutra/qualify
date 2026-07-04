import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface WorkflowFolder {
  id: string;
  name: string;
  description?: string;
  position: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface DbWorkflowFolder {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const transformDbToFrontend = (db: DbWorkflowFolder): WorkflowFolder => ({
  id: db.id,
  name: db.name,
  description: db.description || undefined,
  position: db.position,
  createdBy: db.created_by,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export function useWorkflowFolders() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading } = useQuery({
    queryKey: ["workflow_folders", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("workflow_folders" as any)
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("position", { ascending: true });

      if (error) {
        if ((error as any).code === "42P01") return [];
        throw error;
      }
      return (data as unknown as DbWorkflowFolder[]).map(transformDbToFrontend);
    },
    enabled: !!user && !!activeCompanyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["workflow_folders", activeCompanyId] });

  const createFolder = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      if (!user || !activeCompanyId) throw new Error("Selecione uma empresa ativa");
      const { data, error } = await supabase
        .from("workflow_folders" as any)
        .insert({
          company_id: activeCompanyId,
          name: input.name,
          description: input.description || null,
          position: folders.length,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return transformDbToFrontend(data as unknown as DbWorkflowFolder);
    },
    onSuccess: () => { invalidate(); toast.success("Pasta criada"); },
    onError: (error: Error) => toast.error("Erro ao criar pasta", { description: error.message }),
  });

  const renameFolder = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name?: string; description?: string }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      const { error } = await supabase.from("workflow_folders" as any).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error("Erro ao renomear pasta", { description: error.message }),
  });

  const reorderFolders = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(orderedIds.map((id, index) =>
        supabase.from("workflow_folders" as any).update({ position: index }).eq("id", id)
      ));
    },
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error("Erro ao reordenar pastas", { description: error.message }),
  });

  // mode: "move_to_uncategorized" moves every automation in the folder to
  // "Sem pasta" before deleting it (the default/safe option); "delete_all"
  // removes the workflow_definitions rows first (never the underlying
  // automation/campaign itself -- that always stays in its own engine table).
  const deleteFolder = useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: "move_to_uncategorized" | "delete_all" }) => {
      if (mode === "move_to_uncategorized") {
        await supabase.from("workflow_definitions" as any).update({ folder_id: null }).eq("folder_id", id);
      } else {
        await supabase.from("workflow_definitions" as any).delete().eq("folder_id", id);
      }
      const { error } = await supabase.from("workflow_folders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["workflow_definitions"] });
      toast.success("Pasta removida");
    },
    onError: (error: Error) => toast.error("Erro ao excluir pasta", { description: error.message }),
  });

  return {
    folders,
    isLoading,
    createFolder: createFolder.mutateAsync,
    renameFolder: renameFolder.mutateAsync,
    reorderFolders: reorderFolders.mutateAsync,
    deleteFolder: deleteFolder.mutateAsync,
  };
}
