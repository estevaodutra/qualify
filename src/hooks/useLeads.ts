import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { safeBatchUpsert } from "@/lib/supabase-batch";

export interface Lead {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  lid: string | null;
  email: string | null;
  tags: string[];
  custom_fields: Record<string, string | number | boolean | null>;
  active_campaign_id: string | null;
  active_campaign_type: string | null;
  source_type: string | null;
  source_name: string | null;
  source_campaign_id: string | null;
  source_group_id: string | null;
  source_group_name: string | null;
  total_calls: number;
  total_messages: number;
  last_contact_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

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

// safeBatchUpsert moved to @/lib/supabase-batch

export function useLeads(filters: LeadFilters = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? PAGE_SIZE;

  const leadsQuery = useQuery({
    queryKey: ["leads", filters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

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
      return { data: (data || []) as Lead[], count: count || 0 };
    },
  });

  const groupNamesQuery = useQuery({
    queryKey: ["leads-group-names"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("source_group_name")
        .not("source_group_name", "is", null)
        .order("source_group_name");
      const names = [...new Set((data || []).map(d => d.source_group_name).filter(Boolean))];
      return names as string[];
    },
  });

  const tagNamesQuery = useQuery({
    queryKey: ["leads-tag-names"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("tags")
        .not("tags", "eq", "{}");
      const allTags = (data || []).flatMap(d => d.tags || []);
      return [...new Set(allTags)].sort() as string[];
    },
  });

  const statsQuery = useQuery({
    queryKey: ["leads-stats"],
    queryFn: async () => {
      const { count: total } = await supabase.from("leads").select("*", { count: "exact", head: true });
      const { count: active } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "active");
      const { count: inCampaign } = await supabase.from("leads").select("*", { count: "exact", head: true }).not("active_campaign_id", "is", null);
      const { count: inactive } = await supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "inactive");
      return {
        total: total || 0,
        active: active || 0,
        inCampaign: inCampaign || 0,
        inactive: inactive || 0,
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
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase.from("leads").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Lead atualizado" });
    },
    onError: () => toast({ title: "Erro ao atualizar lead", variant: "destructive" }),
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Lead excluído" });
    },
    onError: () => toast({ title: "Erro ao excluir lead", variant: "destructive" }),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      for (let i = 0; i < ids.length; i += 200) {
        const batch = ids.slice(i, i + 200);
        const { error } = await supabase.from("leads").delete().in("id", batch);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      toast({ title: "Leads excluídos" });
    },
    onError: () => toast({ title: "Erro ao excluir leads", variant: "destructive" }),
  });

  const bulkAddTags = useMutation({
    mutationFn: async ({ ids, tags }: { ids: string[]; tags: string[] }) => {
      const allLeads: { id: string; tags: string[] }[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const batch = ids.slice(i, i + 200);
        const { data, error: fetchErr } = await supabase.from("leads").select("id, tags").in("id", batch);
        if (fetchErr) throw fetchErr;
        allLeads.push(...(data || []));
      }
      for (const lead of allLeads) {
        const merged = Array.from(new Set([...(lead.tags || []), ...tags]));
        await supabase.from("leads").update({ tags: merged }).eq("id", lead.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Tags adicionadas" });
    },
    onError: () => toast({ title: "Erro ao adicionar tags", variant: "destructive" }),
  });

  const bulkRemoveTags = useMutation({
    mutationFn: async ({ ids, tags }: { ids: string[]; tags: string[] }) => {
      const allLeads: { id: string; tags: string[] }[] = [];
      for (let i = 0; i < ids.length; i += 200) {
        const batch = ids.slice(i, i + 200);
        const { data, error: fetchErr } = await supabase.from("leads").select("id, tags").in("id", batch);
        if (fetchErr) throw fetchErr;
        allLeads.push(...(data || []));
      }
      for (const lead of allLeads) {
        const filtered = (lead.tags || []).filter((t: string) => !tags.includes(t));
        await supabase.from("leads").update({ tags: filtered }).eq("id", lead.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Tags removidas" });
    },
    onError: () => toast({ title: "Erro ao remover tags", variant: "destructive" }),
  });

  const bulkAddToCampaign = useMutation({
    mutationFn: async ({ ids, campaignId, campaignType, skipExisting }: {
      ids: string[];
      campaignId: string;
      campaignType: string;
      skipExisting: boolean;
    }) => {
      let toUpdate = ids;
      if (skipExisting) {
        const existingIds = new Set<string>();
        for (let i = 0; i < ids.length; i += 200) {
          const batch = ids.slice(i, i + 200);
          const { data } = await supabase
            .from("leads").select("id").in("id", batch)
            .eq("active_campaign_id", campaignId);
          (data || []).forEach(e => existingIds.add(e.id));
        }
        toUpdate = ids.filter(id => !existingIds.has(id));
      }
      if (toUpdate.length === 0) return { added: 0, skipped: ids.length };
      for (let i = 0; i < toUpdate.length; i += 200) {
        const batch = toUpdate.slice(i, i + 200);
        const { error } = await supabase
          .from("leads")
          .update({ active_campaign_id: campaignId, active_campaign_type: campaignType })
          .in("id", batch);
        if (error) throw error;
      }
      // Sync to call_leads if campaign type is ligacao
      if (campaignType === "ligacao") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const leadsData: { id: string; phone: string; name: string | null; email: string | null }[] = [];
          for (let i = 0; i < toUpdate.length; i += 200) {
            const batch = toUpdate.slice(i, i + 200);
            const { data } = await supabase
              .from("leads")
              .select("id, phone, name, email")
              .in("id", batch);
            leadsData.push(...(data || []));
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

      // Sync to dispatch_campaign_contacts if campaign type is despacho
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
      // Sync imported leads to call_leads for ligacao campaigns
      const ligacaoLeads = leads.filter(l => {
        const cType = l.campaignType || defaultCampaignType;
        const cId = l.campaignId || defaultCampaignId;
        return cType === "ligacao" && cId;
      });

      let callLeadsSynced = 0;
      let callLeadsFailed = 0;

      if (ligacaoLeads.length > 0) {
        const byCampaign = new Map<string, typeof ligacaoLeads>();
        for (const l of ligacaoLeads) {
          const cId = (l.campaignId || defaultCampaignId)!;
          if (!byCampaign.has(cId)) byCampaign.set(cId, []);
          byCampaign.get(cId)!.push(l);
        }

        for (const [campaignId, campaignLeads] of byCampaign) {
          const rows = campaignLeads.map(l => ({
            campaign_id: campaignId,
            user_id: user.id,
            phone: l.phone,
            name: l.name || null,
            email: l.email || null,
            status: "pending",
          }));
          const result = await safeBatchUpsert("call_leads", rows, "phone,campaign_id");
          callLeadsSynced += result.synced;
          callLeadsFailed += result.failed;
        }
      }

      // Sync imported leads to dispatch_campaign_contacts for despacho campaigns
      const despachoLeads = leads.filter(l => {
        const cType = l.campaignType || defaultCampaignType;
        const cId = l.campaignId || defaultCampaignId;
        return cType === "despacho" && cId;
      });

      let dispatchSynced = 0;
      let dispatchFailed = 0;

      if (despachoLeads.length > 0) {
        const byCampaignD = new Map<string, typeof despachoLeads>();
        for (const l of despachoLeads) {
          const cId = (l.campaignId || defaultCampaignId)!;
          if (!byCampaignD.has(cId)) byCampaignD.set(cId, []);
          byCampaignD.get(cId)!.push(l);
        }

        for (const [dCampaignId, dCampaignLeads] of byCampaignD) {
          const phones = dCampaignLeads.map(l => l.phone);
          const leadIds: string[] = [];
          for (let i = 0; i < phones.length; i += 200) {
            const batch = phones.slice(i, i + 200);
            const { data } = await supabase
              .from("leads").select("id").in("phone", batch).eq("user_id", user.id);
            leadIds.push(...(data || []).map(d => d.id));
          }

          const rows = leadIds.map(leadId => ({
            campaign_id: dCampaignId,
            user_id: user.id,
            lead_id: leadId,
            status: "active",
          }));
          const result = await safeBatchUpsert("dispatch_campaign_contacts", rows, "campaign_id,lead_id");
          dispatchSynced += result.synced;
          dispatchFailed += result.failed;
        }
      }

      return { imported, updated, skipped, callLeadsSynced, callLeadsFailed, dispatchSynced, dispatchFailed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-stats"] });
      queryClient.invalidateQueries({ queryKey: ["call-leads"] });
      queryClient.invalidateQueries({ queryKey: ["call_leads"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch_contacts"] });

      const syncFailed = (result.callLeadsFailed || 0) + (result.dispatchFailed || 0);
      const syncOk = (result.callLeadsSynced || 0) + (result.dispatchSynced || 0);
      let desc = `${result.imported} importados, ${result.updated} atualizados, ${result.skipped} ignorados`;
      if (syncOk > 0) desc += ` • ${syncOk} sincronizados na campanha`;
      if (syncFailed > 0) {
        desc += ` • ${syncFailed} falharam ao sincronizar`;
        toast({ title: "Importação concluída com avisos", description: desc, variant: "destructive" });
      } else {
        toast({ title: "Importação concluída", description: desc });
      }
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
    createLead,
    updateLead,
    deleteLead,
    bulkDelete,
    bulkAddTags,
    bulkRemoveTags,
    bulkAddToCampaign,
    importLeads,
    pageSize: limit,
  };
}
