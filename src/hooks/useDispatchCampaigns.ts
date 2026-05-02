import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface DispatchCampaign {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed";
  instanceId: string | null;
  useExclusiveInstance: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DbDispatchCampaign {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  instance_id: string | null;
  use_exclusive_instance: boolean;
  created_at: string;
  updated_at: string;
}

const transformDbToFrontend = (db: DbDispatchCampaign): DispatchCampaign => ({
  id: db.id,
  name: db.name,
  description: db.description,
  status: (db.status as DispatchCampaign["status"]) || "draft",
  instanceId: db.instance_id,
  useExclusiveInstance: db.use_exclusive_instance,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export function useDispatchCampaigns() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["dispatch_campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as DbDispatchCampaign[]).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (campaign: { name: string; description?: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("dispatch_campaigns")
        .insert({
          user_id: user.id,
          name: campaign.name,
          description: campaign.description || null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return transformDbToFrontend(data as DbDispatchCampaign);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_campaigns"] });
      toast({ title: "Campanha criada", description: "Campanha de disparos criada com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        name: string;
        description: string;
        status: string;
        instanceId: string;
        useExclusiveInstance: boolean;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.instanceId !== undefined) dbUpdates.instance_id = updates.instanceId;
      if (updates.useExclusiveInstance !== undefined) dbUpdates.use_exclusive_instance = updates.useExclusiveInstance;

      const { error } = await supabase
        .from("dispatch_campaigns")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_campaigns"] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dispatch_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_campaigns"] });
      toast({ title: "Campanha removida" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    campaigns,
    isLoading,
    createCampaign: createMutation.mutateAsync,
    updateCampaign: updateMutation.mutateAsync,
    deleteCampaign: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
