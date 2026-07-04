import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export type ProspectingStatus =
  | "draft"
  | "queued"
  | "extracting"
  | "validating"
  | "enriching"
  | "awaiting_approval"
  | "preparing_queue"
  | "dispatching"
  | "paused"
  | "completed"
  | "partially_completed"
  | "failed"
  | "cancelled";

export type DestinationMode = "save_only" | "review_before_start" | "auto_start";

export interface QueuePolicy {
  delay_min_seconds: number;
  delay_max_seconds: number;
  hourly_limit: number | null;
  daily_limit: number | null;
  allowed_days: number[];
  start_time: string;
  end_time: string;
  timezone: string;
  pause_on_reply: boolean;
  auto_resume_on_reconnect: boolean;
  allow_reentry: boolean;
}

export const DEFAULT_QUEUE_POLICY: QueuePolicy = {
  delay_min_seconds: 120,
  delay_max_seconds: 240,
  hourly_limit: null,
  daily_limit: null,
  allowed_days: [1, 2, 3, 4, 5],
  start_time: "08:00",
  end_time: "18:00",
  timezone: "America/Sao_Paulo",
  pause_on_reply: true,
  auto_resume_on_reconnect: true,
  allow_reentry: false,
};

export interface ProspectingCampaign {
  id: string;
  name: string;
  status: ProspectingStatus;
  searchTerms: string;
  quantity: number;
  category?: string;
  exactNames: boolean;
  places?: string;
  postActionId?: string;
  enrichmentLayers: string[];
  destinationMode: DestinationMode;
  automationCampaignId?: string;
  automationSequenceId?: string;
  instanceId?: string;
  queuePolicy: QueuePolicy;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface DbProspectingCampaign {
  id: string;
  company_id: string | null;
  user_id: string;
  name: string;
  status: string;
  search_terms: string;
  quantity: number;
  category: string | null;
  exact_names: boolean;
  places: string | null;
  post_action_id: string | null;
  enrichment_layers: string[] | null;
  destination_mode: string;
  automation_campaign_id: string | null;
  automation_sequence_id: string | null;
  instance_id: string | null;
  queue_policy: Record<string, unknown> | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

const transformDbToFrontend = (db: DbProspectingCampaign): ProspectingCampaign => ({
  id: db.id,
  name: db.name,
  status: (db.status as ProspectingStatus) || "draft",
  searchTerms: db.search_terms,
  quantity: db.quantity,
  category: db.category || undefined,
  exactNames: db.exact_names,
  places: db.places || undefined,
  postActionId: db.post_action_id || undefined,
  enrichmentLayers: db.enrichment_layers || ["google_maps"],
  destinationMode: (db.destination_mode as DestinationMode) || "save_only",
  automationCampaignId: db.automation_campaign_id || undefined,
  automationSequenceId: db.automation_sequence_id || undefined,
  instanceId: db.instance_id || undefined,
  queuePolicy: { ...DEFAULT_QUEUE_POLICY, ...(db.queue_policy || {}) } as QueuePolicy,
  approvedAt: db.approved_at || undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export interface CreateProspectingInput {
  name: string;
  searchTerms: string;
  quantity: number;
  category?: string;
  exactNames?: boolean;
  places?: string;
  enrichmentLayers: string[];
  destinationMode: DestinationMode;
  automationCampaignId?: string;
  automationSequenceId?: string;
  instanceId?: string;
  queuePolicy?: Partial<QueuePolicy>;
}

export function useProspectingCampaigns() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["prospecting_campaigns", activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("prospecting_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeCompanyId) {
        query = query.eq("company_id", activeCompanyId);
      } else {
        query = query.eq("user_id", user?.id).is("company_id", null);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === "42P01") {
          return [];
        }
        throw error;
      }
      return (data as DbProspectingCampaign[]).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  const invalidate = (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ["prospecting_campaigns"] });
    if (id) {
      queryClient.invalidateQueries({ queryKey: ["prospecting_queue", id] });
      queryClient.invalidateQueries({ queryKey: ["prospecting_events", id] });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (campaign: CreateProspectingInput) => {
      if (!user) throw new Error("Not authenticated");

      const dbCampaign = {
        user_id: user.id,
        company_id: activeCompanyId,
        name: campaign.name,
        search_terms: campaign.searchTerms,
        quantity: campaign.quantity,
        category: campaign.category || null,
        exact_names: campaign.exactNames || false,
        places: campaign.places || null,
        enrichment_layers: campaign.enrichmentLayers,
        destination_mode: campaign.destinationMode,
        automation_campaign_id: campaign.automationCampaignId || null,
        automation_sequence_id: campaign.automationSequenceId || null,
        instance_id: campaign.instanceId || null,
        queue_policy: { ...DEFAULT_QUEUE_POLICY, ...(campaign.queuePolicy || {}) },
        status: "queued",
      };

      const { data, error } = await supabase
        .from("prospecting_campaigns")
        .insert(dbCampaign)
        .select()
        .single();

      if (error) throw error;

      const created = transformDbToFrontend(data as DbProspectingCampaign);

      const { error: invokeError } = await supabase.functions.invoke("prospecting-start", {
        body: { prospectingCampaignId: created.id },
      });

      if (invokeError) {
        await supabase.from("prospecting_campaigns").update({ status: "failed" }).eq("id", created.id);
        throw invokeError;
      }

      return created;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Prospecção iniciada", { description: "Está sendo executada em segundo plano." });
    },
    onError: (error: Error) => {
      toast.error("Erro ao iniciar prospecção", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prospecting_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Prospecção removida");
    },
    onError: (error: Error) => {
      toast.error("Erro", { description: error.message });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("prospecting_campaigns")
        .update({ status: "paused" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      invalidate(id);
      toast.success("Prospecção pausada");
    },
    onError: (error: Error) => toast.error("Erro ao pausar", { description: error.message }),
  });

  const resumeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("prospecting_campaigns")
        .update({ status: "dispatching" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      invalidate(id);
      toast.success("Prospecção retomada");
    },
    onError: (error: Error) => toast.error("Erro ao retomar", { description: error.message }),
  });

  const cancelPendingLeadsMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("prospecting_queue" as any)
        .update({ status: "cancelled" })
        .eq("prospecting_campaign_id", id)
        .in("status", ["pending", "scheduled"]);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      invalidate(id);
      toast.success("Leads pendentes cancelados");
    },
    onError: (error: Error) => toast.error("Erro", { description: error.message }),
  });

  const reprocessErrorsMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("prospecting_queue" as any)
        .update({ status: "pending", attempts: 0, scheduled_at: new Date().toISOString(), last_error: null })
        .eq("prospecting_campaign_id", id)
        .eq("status", "failed");
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      invalidate(id);
      toast.success("Erros reprocessados");
    },
    onError: (error: Error) => toast.error("Erro", { description: error.message }),
  });

  const changeSendLimitsMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<QueuePolicy> }) => {
      const campaign = campaigns.find((c) => c.id === id);
      const mergedPolicy = { ...(campaign?.queuePolicy || DEFAULT_QUEUE_POLICY), ...patch };
      const { error } = await supabase
        .from("prospecting_campaigns")
        .update({ queue_policy: mergedPolicy })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, { id }) => {
      invalidate(id);
      toast.success("Configurações da fila atualizadas");
    },
    onError: (error: Error) => toast.error("Erro", { description: error.message }),
  });

  return {
    campaigns,
    isLoading,
    createCampaign: createMutation.mutateAsync,
    deleteCampaign: deleteMutation.mutateAsync,
    pauseProspecting: pauseMutation.mutateAsync,
    resumeProspecting: resumeMutation.mutateAsync,
    cancelPendingLeads: cancelPendingLeadsMutation.mutateAsync,
    reprocessErrors: reprocessErrorsMutation.mutateAsync,
    changeSendLimits: changeSendLimitsMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
