import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

export interface DispatchSequence {
  id: string;
  campaignId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export function useDispatchSequences(campaignId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["dispatch_sequences", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from("dispatch_sequences")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        campaignId: row.campaign_id,
        name: row.name,
        description: row.description,
        isActive: row.is_active ?? true,
        triggerType: row.trigger_type || "manual",
        triggerConfig: row.trigger_config || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as DispatchSequence[];
    },
    enabled: !!campaignId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      triggerType: string;
      triggerConfig?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !campaignId) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("dispatch_sequences")
        .insert({
          user_id: user.id,
          campaign_id: campaignId,
          name: data.name,
          description: data.description || null,
          trigger_type: data.triggerType,
          trigger_config: (data.triggerConfig || {}) as Json,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: result.id,
        campaignId: result.campaign_id,
        name: result.name,
        description: result.description,
        isActive: result.is_active ?? true,
        triggerType: result.trigger_type,
        triggerConfig: (result.trigger_config as Record<string, unknown>) || {},
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      } as DispatchSequence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_sequences", campaignId] });
      toast({ title: "Sequência criada" });
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
        isActive: boolean;
        triggerType: string;
        triggerConfig: Record<string, unknown>;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.triggerType !== undefined) dbUpdates.trigger_type = updates.triggerType;
      if (updates.triggerConfig !== undefined) dbUpdates.trigger_config = updates.triggerConfig;

      const { error } = await supabase
        .from("dispatch_sequences")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_sequences", campaignId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dispatch_sequences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_sequences", campaignId] });
      toast({ title: "Sequência removida" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !campaignId) throw new Error("Not authenticated");

      const { data: original, error: seqError } = await supabase
        .from("dispatch_sequences")
        .select("*")
        .eq("id", id)
        .single();
      if (seqError) throw seqError;

      const { data: newSeq, error: insertError } = await supabase
        .from("dispatch_sequences")
        .insert({
          user_id: user.id,
          campaign_id: campaignId,
          name: `Cópia de ${original.name}`,
          description: original.description,
          trigger_type: original.trigger_type,
          trigger_config: original.trigger_config,
          is_active: false,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      const { data: originalSteps } = await supabase
        .from("dispatch_sequence_steps")
        .select("*")
        .eq("sequence_id", id)
        .order("step_order", { ascending: true });

      if (originalSteps && originalSteps.length > 0) {
        const { error: stepsError } = await supabase
          .from("dispatch_sequence_steps")
          .insert(originalSteps.map((s: any) => ({
            sequence_id: newSeq.id,
            user_id: user.id,
            step_type: s.step_type,
            step_order: s.step_order,
            message_type: s.message_type,
            message_content: s.message_content,
            message_media_url: s.message_media_url,
            message_buttons: s.message_buttons,
            delay_value: s.delay_value,
            delay_unit: s.delay_unit,
            condition_type: s.condition_type,
            condition_config: s.condition_config,
          })));
        if (stepsError) throw stepsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_sequences", campaignId] });
      toast({ title: "Sequência duplicada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
    },
  });

  return {
    sequences,
    isLoading,
    createSequence: createMutation.mutateAsync,
    updateSequence: updateMutation.mutateAsync,
    deleteSequence: deleteMutation.mutateAsync,
    duplicateSequence: duplicateMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
