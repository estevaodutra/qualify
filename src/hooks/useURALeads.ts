import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { safeBatchUpsert } from "@/lib/supabase-batch";

export type URALeadStatus =
  | "pending"
  | "calling"
  | "in_progress"
  | "completed"
  | "no_answer"
  | "busy"
  | "failed"
  | "cancelled";

export interface URALead {
  id: string;
  campaignId: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: URALeadStatus;
  attempts: number;
  dtmfPressed: string | null;
  durationSeconds: number | null;
  lastCallAt: string | null;
  customFields: Record<string, any>;
  createdAt: string;
}

interface DbURALead {
  id: string;
  campaign_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: string | null;
  attempts: number | null;
  dtmf_pressed: string | null;
  duration_seconds: number | null;
  last_call_at: string | null;
  custom_fields: Record<string, any> | null;
  created_at: string | null;
}

const transformDbToFrontend = (db: DbURALead): URALead => ({
  id: db.id,
  campaignId: db.campaign_id,
  phone: db.phone,
  name: db.name,
  email: db.email,
  status: (db.status as URALeadStatus) || "pending",
  attempts: db.attempts ?? 0,
  dtmfPressed: db.dtmf_pressed,
  durationSeconds: db.duration_seconds,
  lastCallAt: db.last_call_at,
  customFields: db.custom_fields || {},
  createdAt: db.created_at || new Date().toISOString(),
});

export function useURALeads(campaignId: string, statusFilter?: URALeadStatus) {
  const { toast } = useToast();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

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

      const rows = data as Array<{ status: string | null }>;
      const total = rows.length;
      const pending = rows.filter((r) => r.status === "pending").length;
      const inProgress = rows.filter((r) => r.status === "calling" || r.status === "in_progress").length;
      const completed = rows.filter((r) => r.status === "completed").length;
      const failed = rows.filter((r) =>
        r.status === "no_answer" || r.status === "busy" || r.status === "failed"
      ).length;

      return { total, pending, inProgress, completed, failed };
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

      // Mirror to global leads base
      try {
        const { data: camp } = await (supabase as any)
          .from("ura_campaigns")
          .select("name")
          .eq("id", campaignId)
          .maybeSingle();
        const campaignName = camp?.name ?? null;

        await (supabase as any).from("leads").upsert({
          user_id: user.id,
          company_id: activeCompanyId || null,
          phone: lead.phone,
          name: lead.name || null,
          email: lead.email || null,
          custom_fields: lead.customFields || {},
          active_campaign_id: campaignId,
          active_campaign_type: "ura",
          source_type: "campaign_manual",
          source_campaign_id: campaignId,
          source_name: campaignName,
        }, { onConflict: "user_id,phone" });
      } catch (e) {
        console.warn("[addLead] failed to mirror to leads table:", e);
      }

      return transformDbToFrontend(data as DbURALead);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ura_leads"] });
      queryClient.invalidateQueries({ queryKey: ["ura_leads_stats"] });
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
      name?: string | null;
      email?: string | null;
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
      queryClient.invalidateQueries({ queryKey: ["ura_leads"] });
      queryClient.invalidateQueries({ queryKey: ["ura_leads_stats"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Leads importados", description: `${data.length} leads importados com sucesso.` });
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
      queryClient.invalidateQueries({ queryKey: ["ura_leads"] });
      queryClient.invalidateQueries({ queryKey: ["ura_leads_stats"] });
      toast({ title: "Lead removido", description: "Lead removido com sucesso." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const resetLeadsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("ura_leads")
        .update({
          status: "pending",
          attempts: 0,
          dtmf_pressed: null,
          duration_seconds: null,
          last_call_at: null,
        })
        .eq("campaign_id", campaignId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ura_leads"] });
      queryClient.invalidateQueries({ queryKey: ["ura_leads_stats"] });
      toast({ title: "Campanha reiniciada", description: "Todos os leads voltaram ao status Pendente." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    leads,
    isLoading,
    stats,
    addLead: addLeadMutation.mutateAsync,
    addLeadsBatch: addLeadsBatchMutation.mutateAsync,
    deleteLead: deleteLeadMutation.mutateAsync,
    resetLeads: resetLeadsMutation.mutateAsync,
    isAdding: addLeadMutation.isPending,
    isBatchAdding: addLeadsBatchMutation.isPending,
    isDeleting: deleteLeadMutation.isPending,
    isResetting: resetLeadsMutation.isPending,
  };
}
