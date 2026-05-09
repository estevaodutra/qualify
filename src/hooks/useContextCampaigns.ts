import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface ContextCampaign {
  id: string;
  name: string;
  group_jid: string;
  instance_id?: string;
  trigger_type: "manual" | "scheduled" | "keyword" | "first_message";
  trigger_config: {
    keyword?: string;
    duration_minutes?: number;
    daily_time?: string;
    limit_count?: number;
  };
  webhook_url: string;
  opening_message?: string;
  closing_message?: string;
  is_active: boolean;
  created_at: string;
}

export interface ContextExecution {
  id: string;
  campaign_id: string;
  user_id: string;
  company_id: string;
  start_at: string;
  end_at: string;
  status: "collecting" | "completed" | "failed";
  trigger_message: string;
  result_payload: any;
  created_at: string;
  campaign?: {
    name: string;
  };
}

export const useContextCampaigns = () => {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["context-campaigns", activeCompanyId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      const { data, error } = await supabase
        .from("context_campaigns")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContextCampaign[];
    },
    enabled: !!activeCompanyId,
  });

  const createCampaign = useMutation({
    mutationFn: async (newCampaign: Partial<ContextCampaign>) => {
      if (!user || !activeCompanyId) throw new Error("Auth/Company context missing");
      
      const { data, error } = await supabase
        .from("context_campaigns")
        .insert([{
          ...newCampaign,
          user_id: user.id,
          company_id: activeCompanyId,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["context-campaigns"] });
      toast.success("Campanha criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar campanha: ${error.message}`);
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContextCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from("context_campaigns")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["context-campaigns"] });
      toast.success("Campanha atualizada!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar campanha: ${error.message}`);
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("context_campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["context-campaigns"] });
      toast.success("Campanha removida!");
    },
  });

  const triggerContext = useMutation({
    mutationFn: async ({ campaignId, manualCount }: { campaignId: string, manualCount?: number }) => {
      // 1. Create a manual execution
      const campaign = campaigns?.find(c => c.id === campaignId);
      if (!campaign) throw new Error("Campaign not found");

      const duration = 1; // Manual windows are short (just for the compile trigger)
      const startAt = new Date(Date.now() - (manualCount ? 0 : 30) * 60000).toISOString(); // Last 30 mins by default
      const endAt = new Date().toISOString();

      const { data: execution, error: execError } = await supabase
        .from("context_executions")
        .insert({
          campaign_id: campaignId,
          user_id: user?.id,
          company_id: activeCompanyId,
          start_at: startAt,
          end_at: endAt,
          status: "collecting",
          trigger_message: "Manual Trigger"
        })
        .select()
        .single();

      if (execError) throw execError;

      // 2. Call the compile function
      const { data, error } = await supabase.functions.invoke("compile-context", {
        body: { executionId: execution.id }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Contexto gerado e enviado para o webhook!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar contexto: ${error.message}`);
    },
  });

  return {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    triggerContext,
  };
};

export function useContextExecutions(campaignId?: string) {
  const { activeCompanyId } = useCompany();

  const { data: executions, isLoading, refetch } = useQuery({
    queryKey: ["context-executions", activeCompanyId, campaignId],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      
      let query = supabase
        .from("context_executions")
        .select(`
          *,
          campaign:context_campaigns(name)
        `)
        .order("created_at", { ascending: false });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }
      
      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContextExecution[];
    },
    enabled: !!activeCompanyId,
  });

  const deleteExecution = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("context_executions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
      toast.success("Log removido com sucesso");
    }
  });

  return {
    executions,
    isLoading,
    refetch,
    deleteExecution
  };
}
