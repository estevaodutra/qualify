import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { QueuePolicy } from "./useProspectingCampaigns";

export interface ApproveProspectingInput {
  prospectingCampaignId: string;
  selectedLeadIds: string[];
  automationCampaignId: string;
  automationSequenceId: string;
  instanceId?: string;
  queuePolicy?: Partial<QueuePolicy>;
}

export function useProspectingApproval() {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async (input: ApproveProspectingInput) => {
      const { data, error } = await supabase.functions.invoke("prospecting-approve", {
        body: {
          prospectingCampaignId: input.prospectingCampaignId,
          selectedLeadIds: input.selectedLeadIds,
          automationCampaignId: input.automationCampaignId,
          automationSequenceId: input.automationSequenceId,
          instanceId: input.instanceId,
          queuePolicy: input.queuePolicy,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; queued: number };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["prospecting_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["prospecting_queue", variables.prospectingCampaignId] });
      toast.success("Automação iniciada", { description: `${data.queued} leads foram adicionados à fila.` });
    },
    onError: (error: Error) => {
      toast.error("Erro ao aprovar prospecção", { description: error.message });
    },
  });

  return {
    approve: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
  };
}
