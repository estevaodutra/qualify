import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface GroupFolder {
  id: string;
  name: string;
  color?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export function useGroupFolders() {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch folders
  const { data: folders = [], isLoading: isLoadingFolders } = useQuery({
    queryKey: ["group_folders", activeCompanyId],
    queryFn: async () => {
      const targetUserId = user?.id;
      if (!activeCompanyId && !targetUserId) return [];
      
      let query = supabase
        .from("group_folders" as any)
        .select("*")
        .order("position", { ascending: true });
        
      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      } else {
        query = query.eq("user_id", targetUserId);
      }
      
      const { data, error } = await query;

      if (error) {
        console.warn("[useGroupFolders] fetch error:", error);
        return [];
      }

      return (data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        color: f.color || "#6366f1",
        position: f.position ?? 0,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })) as GroupFolder[];
    },
    enabled: !!activeCompanyId,
  });

  // Fetch assignments (group_id -> folder_id)
  const { data: assignments = {}, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["group_folder_assignments", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return {};
      const { data, error } = await supabase
        .from("group_folder_assignments" as any)
        .select("group_id, folder_id")
        .eq("company_id", activeCompanyId);

      if (error) {
        console.warn("[useGroupFolders] assignments error:", error);
        return {};
      }

      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        if (row.group_id && row.folder_id) {
          map[row.group_id] = row.folder_id;
        }
      });
      return map;
    },
    enabled: !!activeCompanyId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["group_folders", activeCompanyId] });
    queryClient.invalidateQueries({ queryKey: ["group_folder_assignments", activeCompanyId] });
  };

  // Create folder
  const createFolderMutation = useMutation({
    mutationFn: async ({ name, color = "#6366f1" }: { name: string; color?: string }) => {
      if (!activeCompanyId) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("group_folders" as any)
        .insert({
          company_id: activeCompanyId,
          name: name.trim(),
          color,
          position: folders.length,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Pasta criada com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao criar pasta: ${err.message || String(err)}`);
    },
  });

  // Rename folder
  const renameFolderMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name.trim();
      if (color !== undefined) updates.color = color;

      const { error } = await supabase
        .from("group_folders" as any)
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Pasta atualizada!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar pasta: ${err.message || String(err)}`);
    },
  });

  // Delete folder
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      // Assignments are deleted automatically by ON DELETE CASCADE
      const { error } = await supabase
        .from("group_folders" as any)
        .delete()
        .eq("id", folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Pasta removida!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao excluir pasta: ${err.message || String(err)}`);
    },
  });

  // Move group to folder (or remove from folder if folderId is null)
  const assignGroupToFolderMutation = useMutation({
    mutationFn: async ({ groupId, folderId }: { groupId: string; folderId: string | null }) => {
      if (!activeCompanyId) throw new Error("Empresa não selecionada");

      if (!folderId) {
        // Remove assignment
        const { error } = await supabase
          .from("group_folder_assignments" as any)
          .delete()
          .eq("company_id", activeCompanyId)
          .eq("group_id", groupId);

        if (error) throw error;
        return { groupId, folderId: null };
      }

      // Upsert assignment
      const { error } = await supabase
        .from("group_folder_assignments" as any)
        .upsert(
          {
            company_id: activeCompanyId,
            group_id: groupId,
            folder_id: folderId,
            created_at: new Date().toISOString(),
          },
          { onConflict: "company_id,group_id" }
        );

      if (error) throw error;
      return { groupId, folderId };
    },
    onSuccess: (_, vars) => {
      invalidate();
      toast.success(vars.folderId ? "Grupo movido para a pasta!" : "Grupo removido da pasta!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao mover grupo: ${err.message || String(err)}`);
    },
  });

  // Reorder folders
  const reorderFoldersMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase
            .from("group_folders" as any)
            .update({ position: index })
            .eq("id", id)
        )
      );
    },
    onSuccess: () => invalidate(),
    onError: (err: any) => {
      toast.error(`Erro ao reordenar pastas: ${err.message || String(err)}`);
    },
  });

  return {
    folders,
    assignments,
    isLoading: isLoadingFolders || isLoadingAssignments,
    createFolder: createFolderMutation.mutateAsync,
    isCreatingFolder: createFolderMutation.isPending,
    renameFolder: renameFolderMutation.mutateAsync,
    deleteFolder: deleteFolderMutation.mutateAsync,
    assignGroupToFolder: assignGroupToFolderMutation.mutateAsync,
    isAssigning: assignGroupToFolderMutation.isPending,
    reorderFolders: reorderFoldersMutation.mutateAsync,
    invalidate,
  };
}
