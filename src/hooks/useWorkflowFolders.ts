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
  parentId?: string | null;
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

interface DbFolderParent {
  folder_id: string;
  parent_id: string;
}

const transformDbToFrontend = (db: DbWorkflowFolder, parentId?: string | null): WorkflowFolder => ({
  id: db.id,
  name: db.name,
  description: db.description || undefined,
  position: db.position,
  parentId: parentId || null,
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

      const [foldersRes, parentsRes] = await Promise.all([
        supabase
          .from("workflow_folders" as any)
          .select("*")
          .eq("company_id", activeCompanyId)
          .order("position", { ascending: true }),
        supabase
          .from("workflow_folder_parents" as any)
          .select("folder_id, parent_id")
      ]);

      if (foldersRes.error) {
        if ((foldersRes.error as any).code === "42P01") return [];
        throw foldersRes.error;
      }

      const parentMap = new Map<string, string>();
      if (parentsRes.data && Array.isArray(parentsRes.data)) {
        for (const row of parentsRes.data as unknown as DbFolderParent[]) {
          parentMap.set(row.folder_id, row.parent_id);
        }
      }

      return (foldersRes.data as unknown as DbWorkflowFolder[]).map((f) =>
        transformDbToFrontend(f, parentMap.get(f.id) || null)
      );
    },
    enabled: !!user && !!activeCompanyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["workflow_folders", activeCompanyId] });

  const createFolder = useMutation({
    mutationFn: async (input: { name: string; description?: string; parentId?: string | null }) => {
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

      const createdFolder = data as unknown as DbWorkflowFolder;

      if (input.parentId) {
        await supabase
          .from("workflow_folder_parents" as any)
          .insert({
            folder_id: createdFolder.id,
            parent_id: input.parentId,
          });
      }

      return transformDbToFrontend(createdFolder, input.parentId || null);
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

  const moveFolder = useMutation({
    mutationFn: async ({ id, parentId }: { id: string; parentId: string | null }) => {
      if (id === parentId) throw new Error("Uma pasta não pode ser subpasta de si mesma");

      if (!parentId) {
        const { error } = await supabase
          .from("workflow_folder_parents" as any)
          .delete()
          .eq("folder_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workflow_folder_parents" as any)
          .upsert(
            { folder_id: id, parent_id: parentId },
            { onConflict: "folder_id" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Pasta movida com sucesso");
    },
    onError: (error: Error) => toast.error("Erro ao mover pasta", { description: error.message }),
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
    moveFolder: moveFolder.mutateAsync,
    reorderFolders: reorderFolders.mutateAsync,
    deleteFolder: deleteFolder.mutateAsync,
  };
}
