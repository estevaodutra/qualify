import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

import { Lead } from "@/types/crm.types";

export interface LeadFilters {
  search?: string;
  tags?: string[];
  status?: string;
  campaignId?: string;
  sourceType?: string;
  campaignType?: string;
  sourceGroupName?: string;
  page?: number;
  limit?: number;
}

export interface LeadStats {
  total: number;
  active: number;
  inCampaign: number;
  inactive: number;
}

const PAGE_SIZE = 20;

export function useLeads(filters: LeadFilters = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompanyId } = useCompany();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? PAGE_SIZE;

  const leadsQuery = useQuery({
    queryKey: ["leads", activeCompanyId, filters],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;

      let query = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (currentUserId) {
        query = query.eq("user_id", currentUserId);
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,lid.ilike.%${filters.search}%`);
      }
      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps("tags", filters.tags);
      }
      if (filters.campaignId) {
        query = query.eq("active_campaign_id", filters.campaignId);
      }
      if (filters.sourceType) {
        query = query.eq("source_type", filters.sourceType);
      }
      if (filters.campaignType) {
        query = query.eq("active_campaign_type", filters.campaignType);
      }
      if (filters.sourceGroupName) {
        query = query.eq("source_group_name", filters.sourceGroupName);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      // Filter out any fake WhatsApp group records from the Leads view
      const realLeads = (data || []).filter((l: any) => {
        const isGroup =
          (l.name && (l.name.includes("@g.us") || l.name.toLowerCase().includes("grupo whatsapp"))) ||
          (l.phone && (l.phone.startsWith("1203") || l.phone.startsWith("120") || l.phone.includes("@g.us")));
        return !isGroup;
      });

      return { data: realLeads as Lead[], count: count || 0 };
    },
  });

  const groupNamesQuery = useQuery({
    queryKey: ["leads-group-names", activeCompanyId],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;

      let query = supabase
        .from("leads")
        .select("source_group_name")
        .not("source_group_name", "is", null);

      if (currentUserId) {
        query = query.eq("user_id", currentUserId);
      }

      const { data } = await query;
      if (!data) return [];
      const names = new Set<string>();
      data.forEach((row: any) => {
        if (row.source_group_name) names.add(row.source_group_name);
      });
      return Array.from(names);
    },
  });

  const statsQuery = useQuery({
    queryKey: ["leads-stats", activeCompanyId],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;

      let baseQuery = supabase.from("leads").select("*", { count: "exact", head: true });
      if (currentUserId) {
        baseQuery = baseQuery.eq("user_id", currentUserId);
      }

      const { count: total } = await baseQuery;
      return {
        total: total || 0,
        active: total || 0,
        inCampaign: 0,
        inactive: 0,
      } as LeadStats;
    },
  });

  const createLead = useMutation({
    mutationFn: async (lead: { name?: string; phone: string; email?: string; lid?: string; tags?: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("leads").insert({
        user_id: user.id,
        name: lead.name || null,
        phone: lead.phone,
        lid: lead.lid || null,
        email: lead.email || null,
        tags: lead.tags || [],
        source_type: "manual",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Lead criado com sucesso" });
    },
    onError: (err: Error) => {
      const msg = err.message.includes("duplicate") ? "Já existe um lead com este telefone" : err.message;
      toast({ title: "Erro ao criar lead", description: msg, variant: "destructive" });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
      const { data, error } = await supabase.from("leads").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead atualizado com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar lead", description: err.message, variant: "destructive" });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Lead removido com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao remover lead", description: err.message, variant: "destructive" });
    },
  });

  return {
    leads: leadsQuery.data?.data || [],
    totalCount: leadsQuery.data?.count || 0,
    pageCount: Math.ceil((leadsQuery.data?.count || 0) / limit),
    isLoading: leadsQuery.isLoading,
    isError: leadsQuery.isError,
    error: leadsQuery.error,
    stats: statsQuery.data,
    isLoadingStats: statsQuery.isLoading,
    groupNames: groupNamesQuery.data || [],
    createLead,
    updateLead,
    deleteLead,
    refetch: leadsQuery.refetch,
  };
}
