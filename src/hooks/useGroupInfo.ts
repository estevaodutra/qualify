import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChatConversation } from "./useChat";

export interface GroupParticipant {
  phone: string;
  lid?: string | null;
  name?: string | null;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  profilePhoto?: string | null;
  status?: string;
}

export interface GroupInfo {
  jid: string;
  phone: string;
  name: string;
  description: string;
  pictureUrl?: string | null;
  participantsCount: number;
  participants: GroupParticipant[];
  ownerJid?: string | null;
  lastSyncedAt?: string | null;
}

export function useGroupInfo(conversation: ChatConversation | null) {
  const queryClient = useQueryClient();
  const lead = conversation?.lead;
  const customFields = (lead?.custom_fields as Record<string, any>) || {};

  const cleanPhone = lead?.phone || conversation?.contact_phone || "";
  const isGroup =
    cleanPhone.length > 15 ||
    cleanPhone.includes("@g.us") ||
    cleanPhone.includes("-group") ||
    customFields.is_group === true;

  const groupJid = customFields.group_jid || (cleanPhone.includes("@") ? cleanPhone : `${cleanPhone.replace(/\D/g, "")}@g.us`);
  const instanceId = conversation?.instance_id;

  // Initial group data from lead custom_fields if already present
  const initialGroup: GroupInfo = {
    jid: groupJid,
    phone: cleanPhone.replace(/\D/g, ""),
    name: lead?.name || conversation?.contact_name || "Grupo WhatsApp",
    description: customFields.description || "",
    pictureUrl: customFields.profile_picture_url || customFields.pictureUrl || null,
    participantsCount: customFields.participants_count || (customFields.participants?.length || 0),
    participants: customFields.participants || [],
    ownerJid: customFields.owner_jid || null,
    lastSyncedAt: customFields.last_synced_at || null,
  };

  const {
    data: group = initialGroup,
    isLoading,
    isRefetching,
    refetch
  } = useQuery({
    queryKey: ["group-info", conversation?.id, groupJid],
    queryFn: async (): Promise<GroupInfo> => {
      if (!isGroup || !instanceId || !groupJid) return initialGroup;

      try {
        const { data, error } = await supabase.functions.invoke("sync-group-info", {
          body: { instanceId, groupJid }
        });

        if (error) throw error;
        if (data?.success && data.group) {
          return data.group as GroupInfo;
        }
      } catch (err: any) {
        console.warn("[useGroupInfo] Error syncing group:", err.message);
      }
      return initialGroup;
    },
    initialData: initialGroup,
    enabled: !!isGroup && !!instanceId && !!groupJid,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  // Mutação para forçar sincronização
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!instanceId || !groupJid) throw new Error("Instância ou ID do grupo ausente");
      const { data, error } = await supabase.functions.invoke("sync-group-info", {
        body: { instanceId, groupJid }
      });
      if (error) throw error;
      return data?.group;
    },
    onSuccess: (updatedGroup) => {
      if (updatedGroup) {
        queryClient.setQueryData(["group-info", conversation?.id, groupJid], updatedGroup);
        queryClient.invalidateQueries({ queryKey: ["chat_conversations"] });
        toast.success("Dados do grupo sincronizados!");
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao sincronizar: " + err.message);
    }
  });

  // Atualizar Nome do Grupo
  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      if (!instanceId || !groupJid) throw new Error("Parâmetros inválidos");
      const { error } = await supabase.functions.invoke("zapi-proxy", {
        body: {
          instanceId,
          endpoint: "/update-group-name",
          method: "POST",
          body: { phone: groupJid, name: newName }
        }
      });
      if (error) throw error;
      return newName;
    },
    onSuccess: (newName) => {
      queryClient.setQueryData(["group-info", conversation?.id, groupJid], (old: any) => ({
        ...old,
        name: newName
      }));
      toast.success("Nome do grupo atualizado!");
    },
    onError: (err: any) => toast.error("Falha ao renomear grupo: " + err.message)
  });

  // Atualizar Descrição do Grupo
  const updateDescriptionMutation = useMutation({
    mutationFn: async (newDescription: string) => {
      if (!instanceId || !groupJid) throw new Error("Parâmetros inválidos");
      const { error } = await supabase.functions.invoke("zapi-proxy", {
        body: {
          instanceId,
          endpoint: "/update-group-description",
          method: "POST",
          body: { phone: groupJid, description: newDescription }
        }
      });
      if (error) throw error;
      return newDescription;
    },
    onSuccess: (newDesc) => {
      queryClient.setQueryData(["group-info", conversation?.id, groupJid], (old: any) => ({
        ...old,
        description: newDesc
      }));
      toast.success("Descrição atualizada!");
    },
    onError: (err: any) => toast.error("Falha ao atualizar descrição: " + err.message)
  });

  return {
    isGroup,
    group,
    isLoading: isLoading || isRefetching,
    isSyncing: syncMutation.isPending,
    syncGroup: () => syncMutation.mutate(),
    updateName: (name: string) => updateNameMutation.mutate(name),
    isUpdatingName: updateNameMutation.isPending,
    updateDescription: (desc: string) => updateDescriptionMutation.mutate(desc),
    isUpdatingDescription: updateDescriptionMutation.isPending,
    refetch
  };
}
