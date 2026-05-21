import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface URACampaign {
  id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "completed";
  serviceId: number | null;
  regraRenitenciaId: number | null;
  costCenterName: string | null;
  dataTermino: string | null;
  agressividade: number;
  limiteCanaisAtivos: number;
  limiteCanais: number;
  audioType: "audio" | "tts" | "ura";
  audioValue: string | null;
  dtmfActions: Record<string, any>;
  smsMessage: string | null;
  smsServiceId: number | null;
  smsRule: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbURACampaign {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  status: string | null;
  service_id: number | null;
  regra_renitencia_id: number | null;
  cost_center_name: string | null;
  data_termino: string | null;
  agressividade: number | null;
  limite_canais_ativos: number | null;
  limite_canais: number | null;
  audio_type: string | null;
  audio_value: string | null;
  dtmf_actions: Record<string, any> | null;
  sms_message: string | null;
  sms_service_id: number | null;
  sms_rule: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const transformDbToFrontend = (db: DbURACampaign): URACampaign => ({
  id: db.id,
  name: db.name,
  description: db.description,
  status: (db.status as URACampaign["status"]) || "draft",
  serviceId: db.service_id,
  regraRenitenciaId: db.regra_renitencia_id,
  costCenterName: db.cost_center_name,
  dataTermino: db.data_termino,
  agressividade: db.agressividade ?? 1,
  limiteCanaisAtivos: db.limite_canais_ativos ?? 0,
  limiteCanais: db.limite_canais ?? 0,
  audioType: (db.audio_type as URACampaign["audioType"]) || "audio",
  audioValue: db.audio_value,
  dtmfActions: db.dtmf_actions || {},
  smsMessage: db.sms_message,
  smsServiceId: db.sms_service_id,
  smsRule: db.sms_rule,
  createdAt: db.created_at || new Date().toISOString(),
  updatedAt: db.updated_at || new Date().toISOString(),
});

export function useURACampaigns() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, error, refetch } = useQuery({
    queryKey: ["ura_campaigns", activeCompanyId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("ura_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as DbURACampaign[]).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: {
      name: string;
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await (supabase as any)
        .from("ura_campaigns")
        .insert({
          user_id: user.id,
          company_id: activeCompanyId || null,
          name: campaign.name,
          description: campaign.description || null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return transformDbToFrontend(data as DbURACampaign);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ura_campaigns"] });
      toast({ title: "Campanha criada", description: "Campanha de URA criada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<Omit<URACampaign, "id" | "createdAt" | "updatedAt">>;
    }) => {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.serviceId !== undefined) dbUpdates.service_id = updates.serviceId;
      if (updates.regraRenitenciaId !== undefined) dbUpdates.regra_renitencia_id = updates.regraRenitenciaId;
      if (updates.costCenterName !== undefined) dbUpdates.cost_center_name = updates.costCenterName;
      if (updates.dataTermino !== undefined) dbUpdates.data_termino = updates.dataTermino;
      if (updates.agressividade !== undefined) dbUpdates.agressividade = updates.agressividade;
      if (updates.limiteCanaisAtivos !== undefined) dbUpdates.limite_canais_ativos = updates.limiteCanaisAtivos;
      if (updates.limiteCanais !== undefined) dbUpdates.limite_canais = updates.limiteCanais;
      if (updates.audioType !== undefined) dbUpdates.audio_type = updates.audioType;
      if (updates.audioValue !== undefined) dbUpdates.audio_value = updates.audioValue;
      if (updates.dtmfActions !== undefined) dbUpdates.dtmf_actions = updates.dtmfActions;
      if (updates.smsMessage !== undefined) dbUpdates.sms_message = updates.smsMessage;
      if (updates.smsServiceId !== undefined) dbUpdates.sms_service_id = updates.smsServiceId;
      if (updates.smsRule !== undefined) dbUpdates.sms_rule = updates.smsRule;

      const { data, error } = await (supabase as any)
        .from("ura_campaigns")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return transformDbToFrontend(data as DbURACampaign);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ura_campaigns"] });
      toast({ title: "Atualizado", description: "Campanha de URA atualizada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ura_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ura_campaigns"] });
      toast({ title: "Deletado", description: "Campanha de URA removida com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const duplicateCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: original, error: fetchErr } = await (supabase as any)
        .from("ura_campaigns").select("*").eq("id", id).single();
      if (fetchErr) throw fetchErr;

      const { data: newCampaign, error: insertErr } = await (supabase as any)
        .from("ura_campaigns")
        .insert({
          user_id: user.id,
          company_id: original.company_id || null,
          name: `Cópia de ${original.name}`,
          description: original.description,
          status: "draft",
          service_id: original.service_id,
          regra_renitencia_id: original.regra_renitencia_id,
          cost_center_name: original.cost_center_name,
          data_termino: original.data_termino,
          agressividade: original.agressividade,
          limite_canais_ativos: original.limite_canais_ativos,
          limite_canais: original.limite_canais,
          audio_type: original.audio_type,
          audio_value: original.audio_value,
          dtmf_actions: original.dtmf_actions,
          sms_message: original.sms_message,
          sms_service_id: original.sms_service_id,
          sms_rule: original.sms_rule,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;

      return transformDbToFrontend(newCampaign as DbURACampaign);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ura_campaigns"] });
      toast({ title: "Duplicado", description: "Campanha de URA duplicada com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao duplicar", description: error.message, variant: "destructive" });
    },
  });

  return {
    campaigns,
    isLoading,
    error,
    refetch,
    createCampaign: createCampaignMutation.mutateAsync,
    updateCampaign: updateCampaignMutation.mutateAsync,
    deleteCampaign: deleteCampaignMutation.mutateAsync,
    duplicateCampaign: duplicateCampaignMutation.mutateAsync,
    isCreating: createCampaignMutation.isPending,
    isUpdating: updateCampaignMutation.isPending,
    isDeleting: deleteCampaignMutation.isPending,
    isDuplicating: duplicateCampaignMutation.isPending,
  };
}
