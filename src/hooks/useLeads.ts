import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { safeBatchUpsert } from "@/lib/supabase-batch";

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
const SYNC_BATCH_SIZE = 50;

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

  const tagNamesQuery = useQuery({
    queryKey: ["leads-tags", activeCompanyId],
    queryFn: async () => {
      const tagSet = new Set<string>();

      // 1. Fetch system tags from 'tags' table
      try {
        const { data: dbTags } = await supabase
          .from("tags")
          .select("name");
        if (dbTags) {
          dbTags.forEach((t: any) => {
            if (t.name) tagSet.add(t.name);
          });
        }
      } catch (_e) {}

      // 2. Fetch local storage tags fallback
      if (activeCompanyId) {
        try {
          const rawLocal = localStorage.getItem(`qualify_tags_${activeCompanyId}`);
          if (rawLocal) {
            const parsed = JSON.parse(rawLocal);
            if (Array.isArray(parsed)) {
              parsed.forEach((t: any) => {
                if (t.name) tagSet.add(t.name);
              });
            }
          }
        } catch (_e) {}
      }

      // 3. Fetch tags used on existing leads
      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id;

      let query = supabase
        .from("leads")
        .select("tags")
        .not("tags", "is", null);

      if (currentUserId) {
        query = query.eq("user_id", currentUserId);
      }

      const { data: leadRows } = await query;
      if (leadRows) {
        leadRows.forEach((row: any) => {
          if (Array.isArray(row.tags)) {
            row.tags.forEach((t: string) => tagSet.add(t));
          }
        });
      }

      return Array.from(tagSet);
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

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      for (let i = 0; i < ids.length; i += SYNC_BATCH_SIZE) {
        const batch = ids.slice(i, i + SYNC_BATCH_SIZE);
        const { error } = await supabase.from("leads").delete().in("id", batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Leads removidos com sucesso" });
    },
    onError: () => toast({ title: "Erro ao remover leads em massa", variant: "destructive" }),
  });

  const bulkAddTags = useMutation({
    mutationFn: async ({ ids, tags }: { ids: string[]; tags: string[] }) => {
      for (let i = 0; i < ids.length; i += SYNC_BATCH_SIZE) {
        const batch = ids.slice(i, i + SYNC_BATCH_SIZE);
        const { data, error: fetchErr } = await supabase.from("leads").select("id, tags").in("id", batch);
        if (fetchErr) throw fetchErr;

        for (const lead of data || []) {
          const existingTags: string[] = Array.isArray(lead.tags) ? lead.tags : [];
          const merged = Array.from(new Set([...existingTags, ...tags]));
          await supabase.from("leads").update({ tags: merged }).eq("id", lead.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-tags"] });
      toast({ title: "Tags adicionadas aos leads selecionados" });
    },
    onError: () => toast({ title: "Erro ao adicionar tags", variant: "destructive" }),
  });

  const bulkRemoveTags = useMutation({
    mutationFn: async ({ ids, tags }: { ids: string[]; tags: string[] }) => {
      for (let i = 0; i < ids.length; i += SYNC_BATCH_SIZE) {
        const batch = ids.slice(i, i + SYNC_BATCH_SIZE);
        const { data, error: fetchErr } = await supabase.from("leads").select("id, tags").in("id", batch);
        if (fetchErr) throw fetchErr;

        for (const lead of data || []) {
          const existingTags: string[] = Array.isArray(lead.tags) ? lead.tags : [];
          const filtered = existingTags.filter((t) => !tags.includes(t));
          await supabase.from("leads").update({ tags: filtered }).eq("id", lead.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-tags"] });
      toast({ title: "Tags removidas dos leads selecionados" });
    },
    onError: () => toast({ title: "Erro ao remover tags", variant: "destructive" }),
  });

  const bulkAddToCampaign = useMutation({
    mutationFn: async ({ ids, campaignId, campaignType }: { ids: string[]; campaignId: string; campaignType: "ligacao" | "despacho" | "grupos" }) => {
      const toUpdate: string[] = [];
      for (let i = 0; i < ids.length; i += SYNC_BATCH_SIZE) {
        const batch = ids.slice(i, i + SYNC_BATCH_SIZE);
        const { data } = await supabase
          .from("leads").select("id").in("id", batch)
          .or(`active_campaign_id.is.null,active_campaign_id.neq.${campaignId}`);
        if (data) toUpdate.push(...data.map(d => d.id));
      }

      for (let i = 0; i < toUpdate.length; i += SYNC_BATCH_SIZE) {
        const batch = toUpdate.slice(i, i + SYNC_BATCH_SIZE);
        await supabase.from("leads").update({
          active_campaign_id: campaignId,
          active_campaign_type: campaignType,
        }).in("id", batch);
      }

      if (campaignType === "ligacao") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const leadsData: { phone: string; name?: string; email?: string }[] = [];
          for (let i = 0; i < toUpdate.length; i += SYNC_BATCH_SIZE) {
            const batch = toUpdate.slice(i, i + SYNC_BATCH_SIZE);
            const { data } = await supabase.from("leads").select("phone, name, email").in("id", batch);
            if (data) leadsData.push(...data);
          }
          const callRows = leadsData.map(l => ({
            campaign_id: campaignId,
            user_id: user.id,
            phone: l.phone,
            name: l.name,
            email: l.email,
            status: "pending",
          }));
          await safeBatchUpsert("call_leads", callRows, "phone,campaign_id");
        }
      }

      if (campaignType === "despacho") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const dispatchRows = toUpdate.map(leadId => ({
            campaign_id: campaignId,
            user_id: user.id,
            lead_id: leadId,
            status: "active",
          }));
          await safeBatchUpsert("dispatch_campaign_contacts", dispatchRows, "campaign_id,lead_id");
        }
      }

      return { added: toUpdate.length, skipped: ids.length - toUpdate.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      queryClient.invalidateQueries({ queryKey: ["call-leads"] });
      queryClient.invalidateQueries({ queryKey: ["call_leads"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch_contacts"] });
      const msg = result
        ? `${result.added} leads adicionados${result.skipped > 0 ? `, ${result.skipped} ignorados` : ""}`
        : "Leads adicionados à campanha";
      toast({ title: msg });
    },
    onError: () => toast({ title: "Erro ao adicionar à campanha", variant: "destructive" }),
  });

  const importLeads = useMutation({
    mutationFn: async ({ leads, updateExisting, defaultTags, defaultCampaignId, defaultCampaignType }: {
      leads: { name?: string; phone: string; email?: string; lid?: string; tags?: string[]; campaignId?: string; campaignType?: string }[];
      updateExisting: boolean;
      defaultTags: string[];
      defaultCampaignId?: string;
      defaultCampaignType?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imported = 0;
      let updated = 0;
      let skipped = 0;

      for (const lead of leads) {
        const tags = Array.from(new Set([...(lead.tags || []), ...defaultTags]));
        const campaignId = lead.campaignId || defaultCampaignId || null;
        const campaignType = lead.campaignType || defaultCampaignType || null;

        const insertData: Record<string, unknown> = {
          user_id: user.id,
          name: lead.name || null,
          phone: lead.phone,
          lid: lead.lid || null,
          email: lead.email || null,
          tags,
          source_type: "import_csv",
        };
        if (campaignId) {
          insertData.active_campaign_id = campaignId;
          insertData.active_campaign_type = campaignType;
        }

        const { error } = await supabase.from("leads").insert(insertData as any);

        if (error) {
          if (error.message.includes("duplicate") && updateExisting) {
            const updateData: Record<string, unknown> = {
              name: lead.name || undefined,
              email: lead.email || undefined,
              tags,
            };
            if (campaignId) {
              updateData.active_campaign_id = campaignId;
              updateData.active_campaign_type = campaignType;
            }
            await supabase.from("leads").update(updateData as any).eq("phone", lead.phone).eq("user_id", user.id);
            updated++;
          } else {
            skipped++;
          }
        } else {
          imported++;
        }
      }

      return { imported, updated, skipped };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Importação concluída" });
    },
    onError: () => toast({ title: "Erro na importação", variant: "destructive" }),
  });

  return {
    leads: leadsQuery.data?.data || [],
    totalCount: leadsQuery.data?.count || 0,
    stats: statsQuery.data || { total: 0, active: 0, inCampaign: 0, inactive: 0 },
    groupNames: groupNamesQuery.data || [],
    availableTags: tagNamesQuery.data || [],
    isLoading: leadsQuery.isLoading,
    isError: leadsQuery.isError,
    error: leadsQuery.error,
    createLead,
    updateLead,
    deleteLead,
    bulkDelete,
    bulkAddTags,
    bulkRemoveTags,
    bulkAddToCampaign,
    importLeads,
    pageSize: limit,
    refetch: leadsQuery.refetch,
  };
}
