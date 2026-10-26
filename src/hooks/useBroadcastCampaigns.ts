import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import {
  BroadcastCampaign,
  BroadcastRecipient,
  CreateBroadcastInput,
} from "@/types/broadcast.types";
import { calculateBroadcastSchedule } from "@/utils/broadcastUtils";

export function useBroadcastCampaigns() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  // 1. Fetch all broadcast campaigns for this company
  const {
    data: campaigns = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["broadcast_campaigns", activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("broadcast_campaigns")
        .select(`
          *,
          workflow:message_sequences(id, name, description),
          instance:instances(id, name, phone_number)
        `)
        .order("created_at", { ascending: false });

      if (activeCompanyId) {
        query = query.or(`company_id.eq.${activeCompanyId},user_id.eq.${user?.id}`);
      } else if (user) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as BroadcastCampaign[];
    },
    enabled: !!user,
    refetchInterval: 10000, // Poll periodically for live progress updates
  });

  // 2. Create Broadcast Campaign Mutation
  const createBroadcastMutation = useMutation({
    mutationFn: async (input: CreateBroadcastInput) => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!input.workflowId) throw new Error("Selecione um fluxo para o disparo");
      if (!input.selectedLeadIds || input.selectedLeadIds.length === 0) {
        throw new Error("Nenhum lead selecionado para a audiência");
      }

      const totalLeads = input.selectedLeadIds.length;
      const startDate = input.scheduledAt ? new Date(input.scheduledAt) : new Date();

      // Calculate schedule & completion date
      const schedule = calculateBroadcastSchedule({
        totalLeads,
        dailyLimit: input.distributionMode === "immediate" ? totalLeads : input.dailyLimit,
        startDate,
        workdaysOnly: input.workdaysOnly,
        sendTimeEnd: input.sendTimeEnd,
      });

      const initialStatus =
        input.distributionMode === "immediate" ? "running" : "scheduled";

      // Insert broadcast campaign record
      const { data: campaign, error: campaignError } = await supabase
        .from("broadcast_campaigns")
        .insert({
          company_id: activeCompanyId || null,
          user_id: user.id,
          name: input.name,
          description: input.description || null,
          workflow_id: input.workflowId,
          instance_id: input.instanceId || null,
          status: initialStatus,
          scheduled_at: startDate.toISOString(),
          distribution_mode: input.distributionMode,
          daily_limit: input.dailyLimit,
          send_time_start: input.sendTimeStart,
          send_time_end: input.sendTimeEnd,
          workdays_only: input.workdaysOnly,
          audience_filters: input.filters,
          total_leads: totalLeads,
          pending_count: totalLeads,
          sent_count: 0,
          failed_count: 0,
          estimated_completion_at: schedule.estimatedCompletionDate.toISOString(),
          started_at: input.distributionMode === "immediate" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (campaignError || !campaign) {
        throw new Error(`Erro ao criar disparo: ${campaignError?.message}`);
      }

      // Generate recipients rows with calculated batch dates
      const recipientRows: any[] = [];
      let leadIndex = 0;

      for (const batch of schedule.batches) {
        const batchLeads = input.selectedLeadIds.slice(leadIndex, leadIndex + batch.count);
        leadIndex += batch.count;

        const dateStr = batch.date.toISOString().split("T")[0];

        for (const leadId of batchLeads) {
          recipientRows.push({
            broadcast_id: campaign.id,
            company_id: activeCompanyId || null,
            lead_id: leadId,
            batch_index: batch.batchIndex,
            scheduled_date: dateStr,
            status: "pending",
          });
        }
      }

      // Insert recipients in chunks of 500 to avoid payload limits
      const chunkSize = 500;
      for (let i = 0; i < recipientRows.length; i += chunkSize) {
        const chunk = recipientRows.slice(i, i + chunkSize);
        const { error: batchInsertErr } = await supabase
          .from("broadcast_recipients")
          .insert(chunk);

        if (batchInsertErr) {
          console.error("Erro ao inserir destinatários:", batchInsertErr);
          throw new Error(`Erro ao gerar fila de disparos: ${batchInsertErr.message}`);
        }
      }

      // If immediate mode, trigger the execution right away via edge function
      if (input.distributionMode === "immediate") {
        try {
          await supabase.functions.invoke("process-broadcast-campaign", {
            body: {
              broadcastId: campaign.id,
              action: "run_now",
            },
          });
        } catch (execErr) {
          console.warn("Disparo agendado para execução imediata em background:", execErr);
        }
      }

      return campaign;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["broadcast_campaigns"] });
      if (variables.distributionMode === "immediate") {
        toast.success("Disparo iniciado com sucesso para todos os contatos!");
      } else {
        toast.success("Campanha de disparo criada e agendada com proteção Anti-Ban!");
      }
    },
    onError: (err: any) => {
      toast.error(`Falha ao criar disparo: ${err.message}`);
    },
  });

  // 3. Trigger immediate batch execution
  const dispatchBatchMutation = useMutation({
    mutationFn: async ({ broadcastId, explicitLimit }: { broadcastId: string; explicitLimit?: number }) => {
      const { data, error } = await supabase.functions.invoke("process-broadcast-campaign", {
        body: {
          broadcastId,
          action: "run_batch",
          limit: explicitLimit,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["broadcast_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["broadcast_recipients"] });
      toast.success(data?.message || "Lote disparado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao disparar lote: ${err.message}`);
    },
  });

  // 4. Status management mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ broadcastId, action }: { broadcastId: string; action: "pause" | "resume" | "cancel" }) => {
      const { data, error } = await supabase.functions.invoke("process-broadcast-campaign", {
        body: { broadcastId, action },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["broadcast_campaigns"] });
      toast.success(data?.message || "Status atualizado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar status: ${err.message}`);
    },
  });

  // 5. Delete Campaign
  const deleteBroadcastMutation = useMutation({
    mutationFn: async (broadcastId: string) => {
      const { error } = await supabase
        .from("broadcast_campaigns")
        .delete()
        .eq("id", broadcastId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcast_campaigns"] });
      toast.success("Campanha de disparo excluída com sucesso.");
    },
    onError: (err: any) => {
      toast.error(`Erro ao excluir disparo: ${err.message}`);
    },
  });

  return {
    campaigns,
    isLoading,
    refetch,
    createBroadcast: createBroadcastMutation.mutateAsync,
    isCreating: createBroadcastMutation.isPending,
    dispatchBatch: dispatchBatchMutation.mutateAsync,
    isDispatching: dispatchBatchMutation.isPending,
    pauseBroadcast: (broadcastId: string) => updateStatusMutation.mutateAsync({ broadcastId, action: "pause" }),
    resumeBroadcast: (broadcastId: string) => updateStatusMutation.mutateAsync({ broadcastId, action: "resume" }),
    cancelBroadcast: (broadcastId: string) => updateStatusMutation.mutateAsync({ broadcastId, action: "cancel" }),
    deleteBroadcast: deleteBroadcastMutation.mutateAsync,
    isDeleting: deleteBroadcastMutation.isPending,
  };
}

// Hook for detailed campaign recipient analytics
export function useBroadcastDetails(broadcastId: string | null) {
  const queryClient = useQueryClient();

  const recipientsQuery = useQuery({
    queryKey: ["broadcast_recipients", broadcastId],
    queryFn: async () => {
      if (!broadcastId) return [];
      const { data, error } = await supabase
        .from("broadcast_recipients")
        .select(`
          *,
          lead:leads(id, name, phone, email, tags, status)
        `)
        .eq("broadcast_id", broadcastId)
        .order("batch_index", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as BroadcastRecipient[];
    },
    enabled: !!broadcastId,
  });

  return {
    recipients: recipientsQuery.data || [],
    isLoadingRecipients: recipientsQuery.isLoading,
    refetchRecipients: recipientsQuery.refetch,
  };
}
