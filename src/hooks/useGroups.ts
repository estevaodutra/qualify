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
    queryKey: ["groups_list", activeCompanyId, search, instanceId, status, hasDescriptionOnly, hasPhotoOnly, sort, page, pageSize],
    queryFn: async () => {
      if (!activeCompanyId) return { groups: [], totalCount: 0, totalPages: 1 };

      const rawGroups: any[] = [];
      const seenJids = new Set<string>();

      // 1. Primary source: Query group_campaigns
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

      // 2. Secondary source: Query chat_conversations
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

      // Map raw groups to frontend model
      let items: WhatsAppGroupItem[] = rawGroups.map((g) => {
        return {
          id: g.id || g.group_jid,
          companyId: g.company_id || activeCompanyId,
          instanceId: g.instance_id,
          instanceName: g.instance_id ? instanceMap.get(g.instance_id) || "Instância Conectada" : "Instância Geral",
          groupJid: g.group_jid || `${g.id}@g.us`,
          name: g.name || "Grupo WhatsApp",
          description: g.description || null,
          pictureUrl: g.picture_url || g.profile_picture_url || null,
          participantsCount: g.participants_count || 0,
          adminsCount: g.admins_count || 0,
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

  // Dummy migrate function for backward compatibility
  const migrateGroupsMutation = useMutation({
    mutationFn: async () => ({ migratedCount: 0 }),
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
        console.warn("[syncInstanceGroups] Edge function warning:", resErr);
      }

      // 2. Direct client-side dual persistence fallback into group_campaigns and chat_conversations using safe select->update/insert
      if (activeCompanyId && Array.isArray(groups) && groups.length > 0) {
        const targetUserId = currentUserId || activeCompanyId;

        for (const g of groups) {
          const jid = g.groupJid || g.id || g.jid;
          if (!jid) continue;

          const groupName = g.name || "Grupo WhatsApp";
          const groupDesc = g.description || null;

          // Fallback A: group_campaigns
          try {
            const { data: existingGc } = await supabase
              .from("group_campaigns")
              .select("id")
              .eq("company_id", activeCompanyId)
              .eq("group_jid", jid)
              .maybeSingle();

            if (existingGc?.id) {
              await supabase
                .from("group_campaigns")
                .update({
                  instance_id: targetInstanceId,
                  user_id: targetUserId,
                  group_name: groupName,
                  name: groupName,
                  group_description: groupDesc,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingGc.id);
            } else {
              await supabase.from("group_campaigns").insert({
                company_id: activeCompanyId,
                user_id: targetUserId,
                instance_id: targetInstanceId,
                group_jid: jid,
                group_name: groupName,
                name: groupName,
                group_description: groupDesc,
                status: "active",
                updated_at: new Date().toISOString(),
              });
            }
          } catch (e) {
            console.warn("Client fallback group_campaigns error:", e);
          }

          // Fallback B: chat_conversations
          try {
            const { data: existingConv } = await supabase
              .from("chat_conversations")
              .select("id")
              .eq("company_id", activeCompanyId)
              .eq("contact_name", jid)
              .maybeSingle();

            if (existingConv?.id) {
              await supabase
                .from("chat_conversations")
                .update({
                  instance_id: targetInstanceId,
                  user_id: targetUserId,
                  last_message_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingConv.id);
            } else {
              await supabase.from("chat_conversations").insert({
                company_id: activeCompanyId,
                user_id: targetUserId,
                instance_id: targetInstanceId,
                contact_name: jid,
                contact_phone: jid,
                status: "open",
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          } catch (e) {
            console.warn("Client fallback chat_conversations error:", e);
          }
        }
      }

      return resData || { syncedCount: groups?.length || 0 };
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["groups_list"] });
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
      .on("postgres_changes", { event: "*", schema: "public", table: "group_campaigns" }, () => {
        queryClient.invalidateQueries({ queryKey: ["groups_list"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["groups_list"] });
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
