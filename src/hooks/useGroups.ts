import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
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

function normalizeJidKey(jid: string | null | undefined): string {
  if (!jid) return "";
  const str = String(jid).trim().toLowerCase();
  if (str.includes("@g.us")) return str;
  const digits = str.replace(/\D/g, "");
  return digits ? `${digits}@g.us` : str;
}

export function useGroups(filters: GroupFilters = {}) {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const queryClient = useQueryClient();

  const {
    search = "",
    instanceId = "all",
    status = "all",
    hasDescriptionOnly = false,
    hasPhotoOnly = false,
    sort = "most_recent",
    page = 1,
    pageSize = 15,
  } = filters;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["whatsapp_groups", activeCompanyId, search, instanceId, status, hasDescriptionOnly, hasPhotoOnly, sort, page, pageSize],
    queryFn: async () => {
      if (!activeCompanyId) return { groups: [], totalCount: 0, totalPages: 1 };

      const rawGroups: any[] = [];
      const seenJids = new Set<string>();

      // 1. Query dedicated whatsapp_groups
      try {
        const { data: wgData } = await supabase
          .from("whatsapp_groups" as any)
          .select("*", { count: "exact" })
          .eq("company_id", activeCompanyId);

        if (wgData) {
          wgData.forEach((g: any) => {
            const jid = g.group_jid || `${g.id}@g.us`;
            const key = normalizeJidKey(jid);
            if (key && !seenJids.has(key)) {
              seenJids.add(key);
              rawGroups.push(g);
            }
          });
        }
      } catch (e) {
        console.warn("[useGroups] whatsapp_groups query error:", e);
      }

      // 2. Additional source: Query group_campaigns
      try {
        const { data: gcData } = await supabase
          .from("group_campaigns")
          .select("id, name, instance_id, group_jid, group_name, group_description, group_photo_url, status, created_at, updated_at")
          .eq("company_id", activeCompanyId);

        if (gcData) {
          gcData.forEach((gc: any) => {
            const jid = gc.group_jid || `gc_${gc.id}@g.us`;
            const key = normalizeJidKey(jid);
            if (key && !seenJids.has(key)) {
              seenJids.add(key);
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
      } catch (e) {
        console.warn("[useGroups] group_campaigns query error:", e);
      }

      // 3. Additional source: Query chat_conversations
      try {
        const { data: convData } = await supabase
          .from("chat_conversations")
          .select("id, instance_id, contact_name, last_message_at, updated_at")
          .eq("company_id", activeCompanyId);

        if (convData) {
          const groupConvs = convData.filter((c: any) => c.contact_name?.includes("@g.us") || c.contact_name?.toLowerCase().includes("grupo"));
          groupConvs.forEach((c: any) => {
            const jid = c.contact_name?.includes("@g.us") ? c.contact_name : `${c.id}@g.us`;
            const key = normalizeJidKey(jid);
            if (key && !seenJids.has(key)) {
              seenJids.add(key);
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
      } catch (e) {
        console.warn("[useGroups] chat_conversations query error:", e);
      }

      // Fetch instance names
      const { data: instances } = await supabase
        .from("instances")
        .select("id, name, phone");
      const instanceMap = new Map((instances || []).map((i) => [i.id, `${i.name}${i.phone ? ` (${i.phone})` : ""}`]));

      // Fetch participant and admin counts from group_members
      const { data: members } = await supabase
        .from("group_members")
        .select("group_jid, is_admin");

      const countsMap = new Map<string, { total: number; admins: number }>();
      (members || []).forEach((m: any) => {
        const key = normalizeJidKey(m.group_jid);
        if (key) {
          const curr = countsMap.get(key) || { total: 0, admins: 0 };
          curr.total += 1;
          if (m.is_admin) curr.admins += 1;
          countsMap.set(key, curr);
        }
      });

      // Map raw groups to frontend model
      let items: WhatsAppGroupItem[] = rawGroups.map((g) => {
        const key = normalizeJidKey(g.group_jid || g.id);
        const counts = countsMap.get(key) || { total: g.participants_count || 0, admins: g.admins_count || 0 };
        return {
          id: g.id || g.group_jid,
          companyId: g.company_id || activeCompanyId,
          instanceId: g.instance_id,
          instanceName: g.instance_id ? instanceMap.get(g.instance_id) || "Instância Conectada" : "Instância Geral",
          groupJid: g.group_jid || `${g.id}@g.us`,
          name: g.name || "Grupo WhatsApp",
          description: g.description || null,
          pictureUrl: g.picture_url || g.profile_picture_url || null,
          participantsCount: Math.max(counts.total, g.participants_count || 0),
          adminsCount: counts.admins || g.admins_count || 0,
          status: g.status === "inactive" || g.status === "archived" ? g.status : "active",
          lastActivityAt: g.last_activity_at || g.updated_at || g.created_at,
          createdAt: g.created_at || new Date().toISOString(),
          updatedAt: g.updated_at || new Date().toISOString(),
        };
      });

      // Filters
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

      // Sort
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
    staleTime: 5000,
  });

  // Mutation to migrate group entries out of leads table into whatsapp_groups table
  const migrateGroupsMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompanyId) return { migratedCount: 0 };

      const { data: leads } = await supabase
        .from("leads")
        .select("id, name, phone, created_at, updated_at")
        .eq("company_id", activeCompanyId);

      if (!leads || leads.length === 0) return { migratedCount: 0 };

      const fakeGroupLeads = leads.filter(
        (l: any) =>
          (l.name && (l.name.includes("@g.us") || l.name.toLowerCase().includes("grupo whatsapp"))) ||
          (l.phone && (l.phone.startsWith("1203") || l.phone.startsWith("120") || l.phone.includes("@g.us")))
      );

      if (fakeGroupLeads.length === 0) return { migratedCount: 0 };

      let migratedCount = 0;

      for (const lead of fakeGroupLeads) {
        const jid = lead.phone?.includes("@g.us")
          ? lead.phone
          : lead.name?.includes("@g.us")
          ? lead.name
          : `${lead.phone || lead.id}@g.us`;

        const groupName = lead.name && !lead.name.includes("@g.us") ? lead.name : "Grupo WhatsApp";

        await supabase
          .from("whatsapp_groups" as any)
          .upsert(
            {
              company_id: activeCompanyId,
              user_id: currentUserId || activeCompanyId,
              group_jid: jid,
              name: groupName,
              updated_at: lead.updated_at || new Date().toISOString(),
            },
            { onConflict: "company_id,group_jid" }
          )
          .catch(() => {});

        await supabase.from("leads").delete().eq("id", lead.id).catch(() => {});
        migratedCount++;
      }

      return { migratedCount };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_groups"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      if (res.migratedCount > 0) {
        toast.success(`${res.migratedCount} grupos reorganizados da tabela de leads para Grupos!`);
      }
    },
  });

  // Mutation to sync groups directly from a specific WhatsApp instance/connection
  const syncInstanceGroupsMutation = useMutation({
    mutationFn: async ({ instanceId: targetInstanceId, selectedJids, groups }: { instanceId: string; selectedJids?: string[]; groups?: any[] }) => {
      if (!targetInstanceId) return { syncedCount: 0 };

      // 1. Invoke Edge Function with direct groups array and userId
      const { data: resData, error: resErr } = await supabase.functions.invoke("sync-instance-groups", {
        body: {
          instanceId: targetInstanceId,
          companyId: activeCompanyId,
          userId: currentUserId,
          selectedJids,
          groups,
        },
      });

      if (resErr) {
        console.warn("[syncInstanceGroups] Edge function error:", resErr);
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
                user_id: currentUserId || activeCompanyId,
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
                user_id: currentUserId || activeCompanyId,
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
                user_id: currentUserId || activeCompanyId,
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
      queryClient.invalidateQueries({ queryKey: ["group_campaigns"] });
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
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => {
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
