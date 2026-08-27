import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useEffect } from "react";
import { toast } from "sonner";

export interface WhatsAppGroupItem {
  id: string;
  companyId: string;
  instanceId: string | null;
  instanceName?: string | null;
  groupJid: string;
  name: string;
  description: string | null;
  pictureUrl: string | null;
  participantsCount: number;
  adminsCount: number;
  status: "active" | "inactive" | "archived";
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupFilters {
  search?: string;
  instanceId?: string;
  status?: string;
  hasDescriptionOnly?: boolean;
  hasPhotoOnly?: boolean;
  sort?: "most_recent" | "oldest" | "name_asc" | "name_desc" | "most_participants" | "least_participants";
  page?: number;
  pageSize?: number;
}

export function useGroups(filters: GroupFilters = {}) {
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const {
    search = "",
    instanceId = "all",
    status = "all",
    hasDescriptionOnly = false,
    hasPhotoOnly = false,
    sort = "most_recent",
    page = 1,
    pageSize = 12,
  } = filters;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["whatsapp_groups", activeCompanyId, search, instanceId, status, hasDescriptionOnly, hasPhotoOnly, sort, page, pageSize],
    queryFn: async () => {
      if (!activeCompanyId) return { groups: [], totalCount: 0, totalPages: 1 };

      // 1. Query dedicated whatsapp_groups
      const { data: wgData } = await supabase
        .from("whatsapp_groups" as any)
        .select("*", { count: "exact" })
        .eq("company_id", activeCompanyId);

      let rawGroups: any[] = wgData || [];

      // 2. Additional source: Query group_campaigns
      const { data: gcData } = await supabase
        .from("group_campaigns")
        .select("id, name, instance_id, group_jid, group_name, group_description, group_photo_url, status, created_at, updated_at")
        .eq("company_id", activeCompanyId);

      if (gcData && gcData.length > 0) {
        gcData.forEach((gc) => {
          const jid = gc.group_jid || `gc_${gc.id}@g.us`;
          if (!rawGroups.some((g) => g.group_jid === jid)) {
            rawGroups.push({
              id: gc.id,
              company_id: activeCompanyId,
              instance_id: gc.instance_id,
              group_jid: jid,
              name: gc.group_name || gc.name || "Grupo WhatsApp",
              description: gc.group_description,
              picture_url: gc.group_photo_url,
              participants_count: 0,
              admins_count: 0,
              status: gc.status || "active",
              created_at: gc.created_at,
              updated_at: gc.updated_at,
            });
          }
        });
      }

      // 3. Additional source: Query chat_conversations
      const { data: convData } = await supabase
        .from("chat_conversations")
        .select("id, instance_id, contact_name, last_message_at, updated_at, lead_id")
        .eq("company_id", activeCompanyId);

      if (convData) {
        const groupConvs = convData.filter((c: any) => c.contact_name?.includes("@g.us") || c.contact_name?.toLowerCase().includes("grupo"));
        groupConvs.forEach((c: any) => {
          const jid = c.contact_name?.includes("@g.us") ? c.contact_name : `${c.id}@g.us`;
          if (!rawGroups.some((g) => g.group_jid === jid)) {
            rawGroups.push({
              id: c.id,
              company_id: activeCompanyId,
              instance_id: c.instance_id,
              group_jid: jid,
              name: c.contact_name?.split("@")[0] || "Grupo WhatsApp",
              description: null,
              picture_url: null,
              participants_count: 0,
              admins_count: 0,
              status: "active",
              last_activity_at: c.last_message_at || c.updated_at,
              created_at: c.updated_at || new Date().toISOString(),
              updated_at: c.updated_at || new Date().toISOString(),
            });
          }
        });
      }

      // 4. Additional source: Check leads table for group entries (e.g. 120363... or @g.us)
      const { data: groupLeads } = await supabase
        .from("leads")
        .select("id, company_id, name, phone, created_at, updated_at")
        .eq("company_id", activeCompanyId);

      if (groupLeads) {
        const fakeGroupLeads = groupLeads.filter(
          (l: any) =>
            (l.name && (l.name.includes("@g.us") || l.name.toLowerCase().includes("grupo whatsapp"))) ||
            (l.phone && (l.phone.startsWith("1203") || l.phone.startsWith("120") || l.phone.includes("@g.us")))
        );

        fakeGroupLeads.forEach((gl: any) => {
          const jid = gl.phone?.includes("@g.us")
            ? gl.phone
            : gl.name?.includes("@g.us")
            ? gl.name
            : `${gl.phone}@g.us`;

          if (!rawGroups.some((g) => g.group_jid === jid)) {
            rawGroups.push({
              id: gl.id,
              company_id: activeCompanyId,
              instance_id: null,
              group_jid: jid,
              name: gl.name && !gl.name.includes("@g.us") ? gl.name : jid,
              description: null,
              picture_url: null,
              participants_count: 0,
              admins_count: 0,
              status: "active",
              last_activity_at: gl.updated_at || gl.created_at,
              created_at: gl.created_at || new Date().toISOString(),
              updated_at: gl.updated_at || new Date().toISOString(),
            });
          }
        });
      }

      // Fetch instance names
      const { data: instances } = await supabase
        .from("instances")
        .select("id, name, phone");
      const instanceMap = new Map((instances || []).map((i) => [i.id, `${i.name}${i.phone ? ` (${i.phone})` : ""}`]));

      // Fetch participant and admin counts from group_members
      const { data: members } = await supabase
        .from("group_members")
        .select("group_campaign_id, is_admin");

      const countsMap = new Map<string, { total: number; admins: number }>();
      (members || []).forEach((m) => {
        const curr = countsMap.get(m.group_campaign_id) || { total: 0, admins: 0 };
        curr.total += 1;
        if (m.is_admin) curr.admins += 1;
        countsMap.set(m.group_campaign_id, curr);
      });

      // Map raw groups to frontend model
      let items: WhatsAppGroupItem[] = rawGroups.map((g) => {
        const counts = countsMap.get(g.id) || { total: g.participants_count || 0, admins: g.admins_count || 0 };
        return {
          id: g.id,
          companyId: g.company_id,
          instanceId: g.instance_id,
          instanceName: g.instance_id ? instanceMap.get(g.instance_id) || "Instância Conectada" : "Instância Geral",
          groupJid: g.group_jid || `${g.id}@g.us`,
          name: g.name || "Grupo sem Nome",
          description: g.description || null,
          pictureUrl: g.picture_url || g.profile_picture_url || null,
          participantsCount: counts.total || g.participants_count || 0,
          adminsCount: counts.admins || g.admins_count || 0,
          status: g.status === "inactive" || g.status === "archived" ? g.status : "active",
          lastActivityAt: g.last_activity_at || g.updated_at || g.created_at,
          createdAt: g.created_at || new Date().toISOString(),
          updatedAt: g.updated_at || new Date().toISOString(),
        };
      });

      // 5. Client-side Filters
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        items = items.filter(
          (g) =>
            g.name.toLowerCase().includes(term) ||
            (g.description && g.description.toLowerCase().includes(term)) ||
            g.groupJid.toLowerCase().includes(term)
        );
      }

      if (instanceId !== "all") {
        items = items.filter((g) => g.instanceId === instanceId);
      }

      if (status !== "all") {
        items = items.filter((g) => g.status === status);
      }

      if (hasDescriptionOnly) {
        items = items.filter((g) => Boolean(g.description && g.description.trim()));
      }

      if (hasPhotoOnly) {
        items = items.filter((g) => Boolean(g.pictureUrl));
      }

      // 6. Sort
      items.sort((a, b) => {
        if (sort === "most_recent") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sort === "name_asc") return a.name.localeCompare(b.name);
        if (sort === "name_desc") return b.name.localeCompare(a.name);
        if (sort === "most_participants") return b.participantsCount - a.participantsCount;
        if (sort === "least_participants") return a.participantsCount - b.participantsCount;
        return 0;
      });

      const totalCount = items.length;
      const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
      const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

      return {
        groups: paginatedItems,
        totalCount,
        totalPages,
      };
    },
    enabled: Boolean(activeCompanyId),
    staleTime: 1000 * 15,
  });

  // Mutation to migrate group entries out of leads table into whatsapp_groups table
  const migrateGroupsMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) return 0;

      // 1. Fetch leads that are fake groups
      const { data: groupLeads } = await supabase
        .from("leads")
        .select("id, user_id, company_id, name, phone, created_at, updated_at")
        .eq("company_id", activeCompanyId);

      if (!groupLeads || groupLeads.length === 0) return 0;

      const fakeGroupLeads = groupLeads.filter(
        (l: any) =>
          (l.name && (l.name.includes("@g.us") || l.name.toLowerCase().includes("grupo whatsapp"))) ||
          (l.phone && (l.phone.startsWith("1203") || l.phone.startsWith("120") || l.phone.includes("@g.us")))
      );

      if (fakeGroupLeads.length === 0) return 0;

      let migratedCount = 0;

      for (const gl of fakeGroupLeads) {
        const jid = gl.phone?.includes("@g.us")
          ? gl.phone
          : gl.name?.includes("@g.us")
          ? gl.name
          : `${gl.phone}@g.us`;

        const groupName = gl.name && !gl.name.includes("@g.us") ? gl.name : jid;

        // Upsert into whatsapp_groups table
        const { error: upsertErr } = await supabase
          .from("whatsapp_groups" as any)
          .upsert(
            {
              company_id: gl.company_id,
              user_id: gl.user_id,
              group_jid: jid,
              name: groupName,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "company_id,group_jid" }
          );

        if (!upsertErr) {
          // Delete from leads table
          await supabase.from("leads").delete().eq("id", gl.id);
          migratedCount++;
        }
      }

      return migratedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_groups"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      if (count > 0) {
        toast.success(`${count} grupos foram migrados da tabela de Leads para a tabela de Grupos!`);
      } else {
        toast.info("Todos os grupos já estão organizados na tabela de Grupos.");
      }
    },
    onError: (err: any) => {
      toast.error(`Erro ao organizar grupos: ${err.message || String(err)}`);
    },
  });

  // Mutation to sync groups directly from a specific WhatsApp instance/connection
  const syncInstanceGroupsMutation = useMutation({
    mutationFn: async ({ instanceId: targetInstanceId, selectedJids, groups }: { instanceId: string; selectedJids?: string[]; groups?: any[] }) => {
      if (!targetInstanceId) return { syncedCount: 0 };

      // 1. Invoke Edge Function with direct groups array if provided
      const { data: resData, error: resErr } = await supabase.functions.invoke("sync-instance-groups", {
        body: { instanceId: targetInstanceId, companyId: activeCompanyId, selectedJids, groups },
      });

      if (resErr) {
        console.warn("[syncInstanceGroups] Edge function warning:", resErr);
      }

      // 2. Direct client-side dual persistence fallback into whatsapp_groups, chat_conversations, and group_campaigns
      if (activeCompanyId && Array.isArray(groups) && groups.length > 0) {
        for (const g of groups) {
          const jid = g.groupJid || g.id || g.jid;
          if (!jid) continue;

          try {
            await supabase.from("whatsapp_groups" as any).upsert(
              {
                company_id: activeCompanyId,
                instance_id: targetInstanceId,
                group_jid: jid,
                name: g.name || "Grupo WhatsApp",
                description: g.description || null,
                picture_url: g.pictureUrl || null,
                participants_count: g.participantsCount || 0,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "company_id,group_jid" }
            );
          } catch (e) {
            console.warn("Client fallback upsert whatsapp_groups error:", e);
          }

          try {
            await supabase.from("chat_conversations").upsert(
              {
                company_id: activeCompanyId,
                instance_id: targetInstanceId,
                contact_name: jid,
                contact_phone: jid,
                status: "open",
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "company_id,instance_id,contact_name" }
            );
          } catch (e) {
            console.warn("Client fallback upsert chat_conversations error:", e);
          }

          try {
            await supabase.from("group_campaigns").upsert(
              {
                company_id: activeCompanyId,
                instance_id: targetInstanceId,
                group_jid: jid,
                group_name: g.name || "Grupo WhatsApp",
                name: g.name || "Grupo WhatsApp",
                status: "active",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "company_id,group_jid" }
            );
          } catch (e) {
            console.warn("Client fallback upsert group_campaigns error:", e);
          }
        }
      }

      return resData || { syncedCount: groups?.length || 0 };
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_groups"] });
      queryClient.invalidateQueries({ queryKey: ["chat_conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      const count = res?.syncedCount || 0;
      toast.success(count > 0 ? `${count} grupos adicionados com sucesso ao CRM!` : "Sincronização concluída!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao adicionar grupos: ${err.message || String(err)}`);
    },
  });

  // Realtime updates subscription
  useEffect(() => {
    if (!activeCompanyId) return;

    const channel = supabase
      .channel("realtime_groups_channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_groups" }, () => {
        queryClient.invalidateQueries({ queryKey: ["whatsapp_groups"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_campaigns" }, () => {
        queryClient.invalidateQueries({ queryKey: ["whatsapp_groups"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => {
        queryClient.invalidateQueries({ queryKey: ["whatsapp_groups"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCompanyId, queryClient]);

  return {
    groups: data?.groups || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 1,
    isLoading,
    isFetching,
    error,
    refetch,
    migrateGroups: migrateGroupsMutation.mutate,
    isMigrating: migrateGroupsMutation.isPending,
    syncInstanceGroups: syncInstanceGroupsMutation.mutate,
    isSyncingInstance: syncInstanceGroupsMutation.isPending,
  };
}
