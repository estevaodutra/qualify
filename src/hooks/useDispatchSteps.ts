import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

export interface DispatchStep {
  id: string;
  sequenceId: string;
  stepOrder: number;
  stepType: "message" | "delay" | "condition";
  messageType: string | null;
  messageContent: string | null;
  messageMediaUrl: string | null;
  messageButtons: unknown[] | null;
  delayValue: number | null;
  delayUnit: string | null;
  conditionType: string | null;
  conditionConfig: Record<string, unknown> | null;
  createdAt: string;
}

export function useDispatchSteps(sequenceId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: steps = [], isLoading } = useQuery({
    queryKey: ["dispatch_steps", sequenceId],
    queryFn: async () => {
      if (!sequenceId) return [];

      const { data, error } = await supabase
        .from("dispatch_sequence_steps")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("step_order", { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        sequenceId: row.sequence_id,
        stepOrder: row.step_order,
        stepType: row.step_type,
        messageType: row.message_type,
        messageContent: row.message_content,
        messageMediaUrl: row.message_media_url,
        messageButtons: row.message_buttons,
        delayValue: row.delay_value,
        delayUnit: row.delay_unit,
        conditionType: row.condition_type,
        conditionConfig: row.condition_config,
        createdAt: row.created_at,
      })) as DispatchStep[];
    },
    enabled: !!sequenceId,
  });

  const createMutation = useMutation({
    mutationFn: async (step: {
      stepType: string;
      stepOrder: number;
      messageType?: string;
      messageContent?: string;
      messageMediaUrl?: string;
      messageButtons?: unknown[];
      delayValue?: number;
      delayUnit?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !sequenceId) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("dispatch_sequence_steps")
        .insert({
          user_id: user.id,
          sequence_id: sequenceId,
          step_order: step.stepOrder,
          step_type: step.stepType,
          message_type: step.messageType || null,
          message_content: step.messageContent || null,
          message_media_url: step.messageMediaUrl || null,
          message_buttons: (step.messageButtons || null) as Json,
          delay_value: step.delayValue || null,
          delay_unit: step.delayUnit || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_steps", sequenceId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.stepOrder !== undefined) dbUpdates.step_order = updates.stepOrder;
      if (updates.stepType !== undefined) dbUpdates.step_type = updates.stepType;
      if (updates.messageType !== undefined) dbUpdates.message_type = updates.messageType;
      if (updates.messageContent !== undefined) dbUpdates.message_content = updates.messageContent;
      if (updates.messageMediaUrl !== undefined) dbUpdates.message_media_url = updates.messageMediaUrl;
      if (updates.messageButtons !== undefined) dbUpdates.message_buttons = updates.messageButtons;
      if (updates.delayValue !== undefined) dbUpdates.delay_value = updates.delayValue;
      if (updates.delayUnit !== undefined) dbUpdates.delay_unit = updates.delayUnit;

      const { error } = await supabase
        .from("dispatch_sequence_steps")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_steps", sequenceId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dispatch_sequence_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_steps", sequenceId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from("dispatch_sequence_steps")
          .update({ step_order: index })
          .eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_steps", sequenceId] });
    },
  });

  const saveAllMutation = useMutation({
    mutationFn: async (stepsToSave: {
      stepOrder: number;
      stepType: string;
      messageType: string | null;
      messageContent: string | null;
      messageMediaUrl: string | null;
      messageButtons: unknown[] | null;
      delayValue: number | null;
      delayUnit: string | null;
    }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !sequenceId) throw new Error("Not authenticated");

      // Delete all existing steps
      const { error: deleteError } = await supabase
        .from("dispatch_sequence_steps")
        .delete()
        .eq("sequence_id", sequenceId);
      if (deleteError) throw deleteError;

      if (stepsToSave.length === 0) return;

      // Insert all new steps
      const { error: insertError } = await supabase
        .from("dispatch_sequence_steps")
        .insert(
          stepsToSave.map(step => ({
            user_id: user.id,
            sequence_id: sequenceId,
            step_order: step.stepOrder,
            step_type: step.stepType,
            message_type: step.messageType,
            message_content: step.messageContent,
            message_media_url: step.messageMediaUrl,
            message_buttons: (step.messageButtons || null) as Json,
            delay_value: step.delayValue,
            delay_unit: step.delayUnit,
          }))
        );
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_steps", sequenceId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    steps,
    isLoading,
    createStep: createMutation.mutateAsync,
    updateStep: updateMutation.mutateAsync,
    deleteStep: deleteMutation.mutateAsync,
    reorderSteps: reorderMutation.mutateAsync,
    saveAllSteps: saveAllMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isSaving: saveAllMutation.isPending,
  };
}
