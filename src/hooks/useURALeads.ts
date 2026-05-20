import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { safeBatchUpsert } from "@/lib/supabase-batch";

export type URALeadStatus = "pending" | "calling" | "in_progress" | "completed" | "no_answer" | "busy" | "failed" | "cancelled";

export interface URALead {
  id: string;
  campaignId: string;
  phone: string;
  name: string | null;
  email: string | null;
  customFields: Record<string, any>;
  status: URALeadStatus;
  attempts: number;
  lastAttemptAt: string | null;
  durationSeconds: number | null;
  causeId: number | null;
  causeName: string | null;
  dtmfPressed: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbURALead {
  id: string;
  campaign_id: string;
  user_id: string;
  company_id: string | null;
  phone: string;
  name: string | null;
  email: string | null;
  custom_fields: Record<string, any> | null;
  status: string | null;
  attempts: number | null;
  last_attempt_at: string | null;
  duration_seconds: number | null;
  cause_id: number | null;
  cause_name: string | null;
  dtmf_pressed: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const transformDbToFrontend = (db: DbURALead): URALead => ({
  id: db.id,
  campaignId: db.campaign_id,
  phone: db.phone,
  name: db.name,
  email: db.email,
  customFields: db.custom_fields || {},
  status: (db.status as URALeadStatus) || "pending",
  attempts: db.attempts || 0,
  lastAttemptAt: db.last_attempt_at,
  durationSeconds: db.duration_seconds,
  causeId: db.cause_id,
  causeName: db.cause_name,
  dtmfPressed: db.dtmf_pressed,
  createdAt: db.created_at || new Date().toISOString(),
  updatedAt: db.updated_at || new Date().toISOString(),
});

export interface URALeadStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export function useURALeads(campaignId: string, statusFilter?: URALeadStatus) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ["ura_leads", campaignId, statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("ura_leads")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as DbURALead[]).map(transformDbToFrontend);
    },
    enabled: !!campaignId,
  });

  const { data: stats } = useQuery({
    queryKey: ["ura_leads_stats", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ura_leads")
        .select("status")
        .eq("campaign_id", campaignId);

      if (error) throw error;

      const statusList = data as Array<{ status: string | null }>;
      const result: URALeadStats = {
        total: statusList.length,
        pending: statusList.filter((l) => l.status === "pending").length,
        inProgress: statusList.filter((l) => ["calling", "in_progress"].includes(l.status || "")).length,
        completed: statusList.filter((l) => l.status === "completed").length,
        failed: statusList.filter((l) => ["no_answer", "busy", "failed"].includes(l.status || "")).length,
      };

      return result;
    },
    enabled: !!campaignId,
  });

  const addLeadMutation = useMutation({
    mutationFn: async (lead: {
      phone: string;
      name?: string;
      email?: string;
      customFields?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await (supabase as any)
        .from("ura_leads")
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          company_id: activeCompanyId || null,
          phone: lead.phone,
          name: lead.name || null,
          email: lead.email || null,
          custom_fields: lead.customFields || {},
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Mirror leads table
      try {
        const { data: camp } = await (supabase as any)
          .from("ura_campaigns")
          .select("name")
          .eq("id", campaignId)
          .maybeSingle();

        await (supabase as any).from("leads").upsert({
          user_id: user.id,
          phone: lead.phone,
          name: lead.name || null,
          email: lead.email || null,
          custom_fields: lead.customFields || {},
          active_campaign_id: campaignId,
          active_campaign_type: "ura",
          source_type: "campaign_manual",
          source_campaign_id: campaignId,
          source_name: camp?.name ?? null,
        }, { onConflict: "user_id,phone" });
      } catch (e) {
        console.warn("[addLead] failed to mirror to leads table:", e);
      }

      return transformDbToFrontend(data as DbURALead);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ura_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["ura_leads_stats", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Lead adicionado", description: "Lead adicionado com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const addLeadsBatchMutation = useMutation({
    mutationFn: async (leadsData: Array<{
      phone: string;
      name?: string;
      email?: string;
      customFields?: Record<string, any>;
    }>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const inserts = leadsData.map((lead) => ({
        campaign_id: campaignId,
        user_id: user.id,
        company_id: activeCompanyId || null,
        phone: lead.phone,
        name: lead.name || null,
        email: lead.email || null,
        custom_fields: lead.customFields || {},
        status: "pending",
      }));

      const { data, error } = await (supabase as any)
        .from("ura_leads")
        .insert(inserts)
        .select();

      if (error) throw error;

      // Mirror to global leads base
      try {
        const { data: camp } = await (supabase as any)
          .from("ura_campaigns")
          .select("name")
          .eq("id", campaignId)
          .maybeSingle();
        const campaignName = camp?.name ?? null;

        const leadsRows = leadsData.map((lead) => ({
          user_id: user.id,
          phone: lead.phone,
          name: lead.name || null,
          email: lead.email || null,
          custom_fields: lead.customFields || {},
          active_campaign_id: campaignId,
          active_campaign_type: "ura",
          source_type: "campaign_manual",
          source_campaign_id: campaignId,
          source_name: campaignName,
        }));

        await safeBatchUpsert("leads", leadsRows, "user_id,phone");
      } catch (e) {
        console.warn("[addLeadsBatch] failed to mirror to leads table:", e);
      }

      return (data as DbURALead[]).map(transformDbToFrontend);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ura_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["ura_leads_stats", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Leads importados", description: ${data.length} leads importados com sucesso. });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        phone: string;
        name: string;
        email: string;
        customFields: Record<string, any>;
        status: URALeadStatus;
        attempts: number;
        durationSeconds: number;
        causeId: number;
        causeName: string;
        dtmfPressed: string;
      }>;
    }) => {
      const dbUpdates: Record<string, any> = {};
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.customFields !== undefined) dbUpdates.custom_fields = updates.customFields;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.attempts !== undefined) dbUpdates.attempts = updates.attempts;
      if (updates.durationSeconds !== undefined) dbUpdates.duration_seconds = updates.durationSeconds;
      if (updates.causeId !== undefined) dbUpdates.cause_id = updates.causeId;
      if (updates.causeName !== undefined) dbUpdates.cause_name = updates.causeName;
      if (updates.dtmfPressed !== undefined) dbUpdates.dtmf_pressed = updates.dtmfPressed;

      const { error } = await (supabase as any)
        .from("ura_leads")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ura_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["ura_leads_stats", campaignId] });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ura_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ura_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["ura_leads_stats", campaignId] });
      toast({ title: "Lead removido", description: "Lead removido com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover lead", description: error.message, variant: "destructive" });
    },
  });

  const resetLeadsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("ura_leads")
        .update({
          status: "pending",
          attempts: 0,
          last_attempt_at: null,
          duration_seconds: null,
          cause_id: null,
          cause_name: null,
          dtmf_pressed: null,
        })
        .eq("campaign_id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ura_leads", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["ura_leads_stats", campaignId] });
      toast({ title: "Campanha reiniciada", description: "Todos os leads voltaram para o estado pendente." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao reiniciar", description: error.message, variant: "destructive" });
    },
  });

  return {
    leads,
    isLoading,
    stats,
    refetch,
    addLead: addLeadMutation.mutateAsync,
    addLeadsBatch: addLeadsBatchMutation.mutateAsync,
    updateLead: updateLeadMutation.mutateAsync,
    deleteLead: deleteLeadMutation.mutateAsync,
    resetLeads: resetLeadsMutation.mutateAsync,
    isAdding: addLeadMutation.isPending,
    isBatchAdding: addLeadsBatchMutation.isPending,
    isUpdating: updateLeadMutation.isPending,
    isDeleting: deleteLeadMutation.isPending,
    isResetting: resetLeadsMutation.isPending,
  };
}
