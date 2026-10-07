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
  groupJid: string | null;
  hasValidJid: boolean;
  folderId?: string | null;
  folderName?: string | null;
  name: string;
  description: string | null;
  pictureUrl: string | null;
  participantsCount: number;
  adminsCount: number;
  status: "active" | "inactive" | "archived";
  lastActivityAt: string | null;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupsResponse {
  groups: WhatsAppGroupItem[];
  totalCount: number;
  totalPages: number;
  allRegisteredJids?: string[];
  globalTotalCount?: number;
}

export interface GroupFilters {
  search?: string;
  instanceId?: string;
  status?: string;
  folderId?: string | null | undefined; // undefined = "Todas", null = "Sem pasta", string = folderId
  hasDescriptionOnly?: boolean;
  hasPhotoOnly?: boolean;
  sort?: "most_recent" | "oldest" | "name_asc" | "name_desc" | "most_participants" | "least_participants";
  page?: number;
  pageSize?: number;
}

/**
 * Validates and normalizes WhatsApp group JIDs.
 * Returns null if the string is just a database UUID, gc_<uuid>, or invalid.
 */
export function cleanAndValidateJid(rawJid: string | null | undefined): string | null {
  if (!rawJid) return null;
  let str = String(rawJid).trim();

  // Reject database UUIDs or pseudo-keys like gc_<uuid>
  if (str.startsWith("gc_") || (!str.includes("@") && !str.startsWith("1203") && str.length > 25)) {
    return null;
  }

  // Handle -group suffix
  if (str.endsWith("-group")) {
    str = str.replace(/-group$/, "@g.us");
  }

  if (str.includes("@g.us")) {
    return str.toLowerCase();
  }

  const digits = str.replace(/\D/g, "");
  if (digits.startsWith("1203") || digits.length >= 15) {
    return `${digits}@g.us`;
  }

  return null;
}

function normalizeJidKey(jid: string | null | undefined): string {
  const valid = cleanAndValidateJid(jid);
  if (valid) return valid;
  return jid ? String(jid).trim().toLowerCase() : "";
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
    folderId = undefined,
    hasDescriptionOnly = false,
    hasPhotoOnly = false,
    sort = "most_recent",
    page = 1,
    pageSize = 15,
  } = filters;

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [
      "groups_list",
      activeCompanyId,
      currentUserId,
      search,
      instanceId,
      status,
      folderId,
      hasDescriptionOnly,
      hasPhotoOnly,
      sort,
      page,
      pageSize,
    ],
    queryFn: async () => {
      if (!activeCompanyId) return { groups: [], totalCount: 0, totalPages: 1, globalTotalCount: 0 };

      const rawGroups: any[] = [];
      const seenKeys = new Set<string>();

      let foldersQuery = supabase.from("group_folders" as any).select("id, name");
      if (activeCompanyId) foldersQuery = foldersQuery.eq("company_id", activeCompanyId);
      else if (currentUserId) foldersQuery = foldersQuery.eq("user_id", currentUserId);

      let assignmentsQuery = supabase.from("group_folder_assignments" as any).select("group_id, folder_id");
      if (activeCompanyId) assignmentsQuery = assignmentsQuery.eq("company_id", activeCompanyId);
      else if (currentUserId) assignmentsQuery = assignmentsQuery.eq("user_id", currentUserId);

      // 0. Pre-fetch campaign_groups, sequences, folders, folder assignments, and group members count
      const [cgRes, seqRes, folderRes, assignRes, memberRes] = await Promise.all([
        supabase
          .from("campaign_groups")
          .select("campaign_id, group_jid, group_name"),
        supabase
          .from("message_sequences")
          .select("id, group_campaign_id, name"),
        foldersQuery,
        assignmentsQuery,
        supabase
          .from("group_members")
          .select("group_campaign_id, is_admin"),
      ]);

      const campaignGroups = cgRes?.data || [];
      const messageSequences = seqRes?.data || [];
      const groupFolders = (folderRes?.data || []) as { id: string; name: string }[];
      const folderAssignments = (assignRes?.data || []) as { group_id: string; folder_id: string }[];
      const memberList = (memberRes?.data || []) as { group_campaign_id: string; is_admin: boolean }[];

      // Build member count lookup per group campaign
      const memberCountMap = new Map<string, { total: number; admins: number }>();
      memberList.forEach((m) => {
        if (!m.group_campaign_id) return;
        const curr = memberCountMap.get(m.group_campaign_id) || { total: 0, admins: 0 };
        curr.total++;
        if (m.is_admin) curr.admins++;
        memberCountMap.set(m.group_campaign_id, curr);
      });

      // Build folder lookup maps
      const folderNameMap = new Map<string, string>();
      groupFolders.forEach((f) => folderNameMap.set(f.id, f.name));

      const groupToFolderMap = new Map<string, string>();
      folderAssignments.forEach((a) => {
        if (a.group_id && a.folder_id) {
          groupToFolderMap.set(a.group_id, a.folder_id);
        }
      });

      // Build campaign_groups JID lookup
      const cgMap = new Map<string, string>();
      campaignGroups.forEach((cg: any) => {
        const valid = cleanAndValidateJid(cg.group_jid);
        if (valid) {
          cgMap.set(cg.campaign_id, valid);
        }
      });

      const seqToCampaign = new Map<string, string>();
      messageSequences.forEach((s: any) => {
        if (s.group_campaign_id) {
          seqToCampaign.set(s.id, s.group_campaign_id);
        }
      });

      // 1. Primary source: Query group_campaigns that are explicitly registered in CRM
      try {
        let gcQuery = supabase
          .from("group_campaigns")
          .select("id, name, instance_id, group_jid, group_name, group_description, group_photo_url, status, created_at, updated_at, config");
          
        if (activeCompanyId) {
          gcQuery = gcQuery.eq("company_id", activeCompanyId);
        } else if (currentUserId) {
          gcQuery = gcQuery.eq("user_id", currentUserId);
        }

        const { data: gcData } = await gcQuery;

        if (gcData) {
          gcData.forEach((gc: any) => {
            const validJid = cleanAndValidateJid(gc.group_jid);
            const cfg = (gc.config as any) || {};
            const isExplicitCrmGroup = cfg.is_crm_group === true || cfg.registered_in_crm === true || groupToFolderMap.has(gc.id);

            // A group ONLY appears in CRM if it has a real valid WhatsApp JID AND was explicitly added to CRM
            if (!validJid || !isExplicitCrmGroup) {
              return;
            }

            const dedupKey = validJid;
            if (!seenKeys.has(dedupKey)) {
              seenKeys.add(dedupKey);

              const memStats = memberCountMap.get(gc.id);
              const pCount = memStats?.total || (typeof cfg.participants_count === "number" ? cfg.participants_count : 0);
              const aCount = memStats?.admins || 0;
              const lastSynced = cfg.last_synced_at || gc.updated_at || gc.created_at;

              rawGroups.push({
                id: gc.id,
                company_id: activeCompanyId,
                instance_id: gc.instance_id,
                group_jid: validJid,
                has_valid_jid: true,
                name: gc.group_name || gc.name || "Grupo WhatsApp",
                description: gc.group_description,
                picture_url: gc.group_photo_url,
                participants_count: pCount,
                admins_count: aCount,
                status: gc.status || "active",
                last_synced_at: lastSynced,
                created_at: gc.created_at,
                updated_at: gc.updated_at,
              });
            }
          });
        }
      } catch (e) {
        console.warn("[useGroups] group_campaigns query error:", e);
      }

      // Fetch instance names
      const { data: instances } = await supabase
        .from("instances")
        .select("id, name, phone");
      const instanceMap = new Map((instances || []).map((i) => [i.id, `${i.name}${i.phone ? ` (${i.phone})` : ""}`]));

      // Map raw groups to frontend model with folder info
      let items: WhatsAppGroupItem[] = rawGroups.map((g) => {
        // Resolve folder assignment by group id or group jid
        const assignedFolderId = groupToFolderMap.get(g.id) || (g.group_jid ? groupToFolderMap.get(g.group_jid) : null) || null;
        const assignedFolderName = assignedFolderId ? folderNameMap.get(assignedFolderId) || null : null;

        return {
          id: g.id,
          companyId: g.company_id || activeCompanyId,
          instanceId: g.instance_id,
          instanceName: g.instance_id ? instanceMap.get(g.instance_id) || "Instância Conectada" : "Instância Geral",
          groupJid: g.group_jid || null,
          hasValidJid: !!g.has_valid_jid,
          folderId: assignedFolderId,
          folderName: assignedFolderName,
          name: g.name || "Grupo WhatsApp",
          description: g.description || null,
          pictureUrl: g.picture_url || g.profile_picture_url || null,
          participantsCount: g.participants_count || 0,
          adminsCount: g.admins_count || 0,
          status: g.status === "inactive" || g.status === "archived" ? g.status : "active",
          lastActivityAt: g.last_activity_at || g.updated_at || g.created_at,
          lastSyncedAt: g.last_synced_at || null,
          createdAt: g.created_at || new Date().toISOString(),
          updatedAt: g.updated_at || new Date().toISOString(),
        };
      });

      // Filter: Search term
      if (search.trim()) {
        const term = search.toLowerCase().trim();
        items = items.filter(
          (g) =>
            g.name.toLowerCase().includes(term) ||
            (g.description && g.description.toLowerCase().includes(term)) ||
            (g.groupJid && g.groupJid.toLowerCase().includes(term))
        );
      }

      // Filter: Instance
      if (instanceId !== "all") {
        items = items.filter((g) => g.instanceId === instanceId);
      }

      // Filter: Status
      if (status !== "all") {
        items = items.filter((g) => g.status === status);
      }

      // Filter: Folder
      if (folderId !== undefined) {
        if (folderId === null) {
          // "Sem pasta"
          items = items.filter((g) => !g.folderId);
        } else {
          // Specific folder
          items = items.filter((g) => g.folderId === folderId);
        }
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

      const allRegisteredJidSet = new Set<string>();
      rawGroups.forEach((g) => {
        if (g.group_jid) allRegisteredJidSet.add(g.group_jid.toLowerCase());
      });

      return {
        groups: paginatedItems,
        totalCount,
        totalPages,
        allRegisteredJids: Array.from(allRegisteredJidSet),
        globalTotalCount: rawGroups.length,
      };
    },
    staleTime: 5000,
  });

  // Dummy migrate function for backward compatibility
  const migrateGroupsMutation = useMutation({
    mutationFn: async () => ({ migratedCount: 0 }),
  });

  // Mutation to sync and register groups directly from a specific WhatsApp instance/connection
  const syncInstanceGroupsMutation = useMutation({
    mutationFn: async ({
      instanceId: targetInstanceId,
      selectedJids,
      groups,
      targetFolderId,
    }: {
      instanceId: string;
      selectedJids?: string[];
      groups?: any[];
      targetFolderId?: string | null;
    }) => {
      if (!targetInstanceId || !activeCompanyId) return { syncedCount: 0 };
      const targetUserId = currentUserId || activeCompanyId;

      // 1. Immediately persist group headers and folder assignments in Supabase (fast, <300ms)
      if (Array.isArray(groups) && groups.length > 0) {
        for (const g of groups) {
          const rawJid = g.groupJid || g.id || g.jid;
          const jid = cleanAndValidateJid(rawJid);
          if (!jid) continue;

          const groupName = g.name || "Grupo WhatsApp";
          const groupDesc = g.description || null;
          const participants = Array.isArray(g.participants) ? g.participants : [];
          const participantsCount = g.participantsCount || participants.length || 0;

          let savedCampaignId: string | null = null;

          try {
            const { data: existingGc } = await supabase
              .from("group_campaigns")
              .select("id")
              .eq("company_id", activeCompanyId)
              .eq("group_jid", jid)
              .maybeSingle();

            const configPayload = {
              participants_count: participantsCount,
              is_crm_group: true,
              registered_in_crm: true,
              last_synced_at: new Date().toISOString(),
            };

            if (existingGc?.id) {
              savedCampaignId = existingGc.id;
              await supabase
                .from("group_campaigns")
                .update({
                  instance_id: targetInstanceId,
                  user_id: targetUserId,
                  group_name: groupName,
                  name: groupName,
                  group_description: groupDesc,
                  group_photo_url: g.pictureUrl || null,
                  config: configPayload,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingGc.id);
            } else {
              const { data: insertedGc } = await supabase
                .from("group_campaigns")
                .insert({
                  company_id: activeCompanyId,
                  user_id: targetUserId,
                  instance_id: targetInstanceId,
                  group_jid: jid,
                  group_name: groupName,
                  name: groupName,
                  group_description: groupDesc,
                  group_photo_url: g.pictureUrl || null,
                  status: "active",
                  config: configPayload,
                  updated_at: new Date().toISOString(),
                })
                .select("id")
                .maybeSingle();

              if (insertedGc?.id) {
                savedCampaignId = insertedGc.id;
              }
            }
          } catch (e) {
            console.warn("Client group_campaigns error:", e);
          }

          // If target folder is specified, assign group to folder with correct Postgres constraint
          if (savedCampaignId && targetFolderId) {
            try {
              await supabase.from("group_folder_assignments" as any).upsert(
                {
                  company_id: activeCompanyId,
                  group_id: savedCampaignId,
                  folder_id: targetFolderId,
                  created_at: new Date().toISOString(),
                },
                { onConflict: "company_id,group_id" }
              );
            } catch (e) {
              console.warn("Error assigning group to folder:", e);
            }
          }
        }
      }

      // 2. Background participant sync: run non-blocking bulk upsert and invoke Edge Function
      const runBackgroundParticipantSync = async () => {
        try {
          // Trigger Edge Function in background
          supabase.functions
            .invoke("sync-instance-groups", {
              body: {
                instanceId: targetInstanceId,
                companyId: activeCompanyId,
                userId: targetUserId,
                selectedJids,
                groups,
              },
            })
            .catch((err) => console.warn("Background edge function warning:", err));

          // Also perform bulk upsert for participants on client in chunks of 50
          if (Array.isArray(groups)) {
            for (const g of groups) {
              const rawJid = g.groupJid || g.id || g.jid;
              const jid = cleanAndValidateJid(rawJid);
              if (!jid) continue;

              const participants = Array.isArray(g.participants) ? g.participants : [];
              if (participants.length === 0) continue;

              const { data: gc } = await supabase
                .from("group_campaigns")
                .select("id")
                .eq("company_id", activeCompanyId)
                .eq("group_jid", jid)
                .maybeSingle();

              if (!gc?.id) continue;
              const campaignId = gc.id;

              const memberRows: any[] = [];
              for (const p of participants) {
                const rawPhone = p.phoneNumber || p.phone || p.phoneNumberPn || p.pn || p.jid || p.id || "";
                let cleanPhone: string | null = null;
                const phoneStr = String(rawPhone);
                if (
                  phoneStr.includes("@s.whatsapp.net") ||
                  phoneStr.includes("@c.us") ||
                  (!phoneStr.includes("@lid") && phoneStr.replace(/\D/g, "").length >= 10)
                ) {
                  const digits = phoneStr.split("@")[0].replace(/\D/g, "");
                  if (digits.length >= 10) cleanPhone = digits;
                }

                const rawLid = p.lid || p.subjectOwner || p.owner || p.id || "";
                const lidVal = String(rawLid).includes("@lid") ? String(rawLid).trim() : null;

                if (cleanPhone || lidVal) {
                  const isAdmin = p.admin === "admin" || p.admin === "superadmin" || p.isAdmin === true;
                  const memberName = p.name || p.pushName || null;
                  memberRows.push({
                    group_campaign_id: campaignId,
                    user_id: targetUserId,
                    phone: cleanPhone || lidVal,
                    lid: lidVal,
                    name: memberName,
                    is_admin: isAdmin,
                  });
                }
              }

              // Bulk upsert group members in chunks of 50
              const CHUNK_SIZE = 50;
              for (let i = 0; i < memberRows.length; i += CHUNK_SIZE) {
                const chunk = memberRows.slice(i, i + CHUNK_SIZE);
                await supabase
                  .from("group_members")
                  .upsert(chunk, { onConflict: "group_campaign_id,phone" })
                  .catch((err) => console.warn("group_members batch upsert error:", err));
              }
            }
          }
        } catch (bgErr) {
          console.warn("Background participant sync error:", bgErr);
        }
      };

      // Fire background worker asynchronously
      runBackgroundParticipantSync().catch(() => {});

      return { syncedCount: groups?.length || 0 };
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["groups_list"] });
      queryClient.invalidateQueries({ queryKey: ["chat_conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["group_campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["group_folders"] });
      queryClient.invalidateQueries({ queryKey: ["group_folder_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      const count = res?.syncedCount || 0;
      toast.success(
        count > 0 ? `${count} grupos registrados com sucesso no CRM!` : "Sincronização concluída!"
      );
    },
    onError: (err: any) => {
      toast.error(`Erro ao registrar grupos: ${err.message || String(err)}`);
    },
  });

  // Remove group from CRM
  const removeGroupFromCrmMutation = useMutation({
    mutationFn: async ({ groupId, groupJid }: { groupId: string; groupJid?: string | null }) => {
      if (!activeCompanyId) throw new Error("Empresa não selecionada");

      // 1. Remove folder assignment
      await supabase
        .from("group_folder_assignments" as any)
        .delete()
        .eq("company_id", activeCompanyId)
        .eq("group_id", groupId);

      // 2. Unmark or delete from group_campaigns
      const { data: seqs } = await supabase
        .from("message_sequences")
        .select("id")
        .eq("group_campaign_id", groupId)
        .limit(1);

      if (!seqs || seqs.length === 0) {
        await supabase
          .from("group_campaigns")
          .delete()
          .eq("company_id", activeCompanyId)
          .eq("id", groupId);
      } else {
        await supabase
          .from("group_campaigns")
          .update({
            config: { is_crm_group: false, registered_in_crm: false },
            updated_at: new Date().toISOString(),
          })
          .eq("id", groupId);
      }

      return { groupId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups_list"] });
      queryClient.invalidateQueries({ queryKey: ["group_folders"] });
      queryClient.invalidateQueries({ queryKey: ["group_folder_assignments"] });
      toast.success("Grupo removido do CRM com sucesso!");
    },
    onError: (err: any) => {
      toast.error(`Erro ao remover grupo do CRM: ${err.message || String(err)}`);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "group_folder_assignments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["groups_list"] });
        queryClient.invalidateQueries({ queryKey: ["group_folder_assignments"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCompanyId, queryClient]);

  return {
    groups: data?.groups || [],
    totalCount: data?.totalCount || 0,
    globalTotalCount: data?.globalTotalCount ?? (data?.totalCount || 0),
    allRegisteredJids: data?.allRegisteredJids || [],
    totalPages: data?.totalPages || 1,
    isLoading,
    isFetching,
    error,
    refetch,
    migrateGroups: migrateGroupsMutation.mutate,
    isMigrating: migrateGroupsMutation.isPending,
    syncInstanceGroups: syncInstanceGroupsMutation.mutate,
    syncInstanceGroupsAsync: syncInstanceGroupsMutation.mutateAsync,
    isSyncingInstance: syncInstanceGroupsMutation.isPending,
    removeGroupFromCrm: removeGroupFromCrmMutation.mutate,
    removeGroupFromCrmAsync: removeGroupFromCrmMutation.mutateAsync,
    isRemovingFromCrm: removeGroupFromCrmMutation.isPending,
  };
}
