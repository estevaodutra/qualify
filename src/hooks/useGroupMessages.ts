import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Instance } from "@/hooks/useInstances";
import { GroupCampaign } from "@/hooks/useGroupCampaigns";
import { CampaignGroup } from "@/hooks/useCampaignGroups";
import { WebhookConfig } from "@/hooks/useWebhookConfigs";

// Message type definition

export type MessageType = "welcome" | "farewell" | "scheduled" | "keyword_response";

export interface GroupMessage {
  id: string;
  groupCampaignId: string;
  type: MessageType;
  triggerKeyword: string | null;
  content: string;
  variables: Record<string, unknown>;
  schedule: {
    days?: number[];
    times?: string[];
    delaySeconds?: number;
    mode?: "manual" | "interval";
    intervalConfig?: {
      start: string;
      end: string;
      minutes: number;
    };
  } | null;
  sendPrivate: boolean;
  mentionMember: boolean;
  sequenceOrder: number;
  delaySeconds: number;
  active: boolean;
  createdAt: string;
  sequenceId: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaCaption: string | null;
}

interface DbGroupMessage {
  id: string;
  group_campaign_id: string;
  user_id: string;
  type: string;
  trigger_keyword: string | null;
  content: string;
  variables: Record<string, unknown> | null;
  schedule: Record<string, unknown> | null;
  send_private: boolean | null;
  mention_member: boolean | null;
  sequence_order: number | null;
  delay_seconds: number | null;
  active: boolean | null;
  created_at: string | null;
  sequence_id: string | null;
  media_url: string | null;
  media_type: string | null;
  media_caption: string | null;
}

const transformDbToFrontend = (db: DbGroupMessage): GroupMessage => ({
  id: db.id,
  groupCampaignId: db.group_campaign_id,
  type: db.type as MessageType,
  triggerKeyword: db.trigger_keyword,
  content: db.content,
  variables: db.variables || {},
  schedule: db.schedule as GroupMessage["schedule"],
  sendPrivate: db.send_private || false,
  mentionMember: db.mention_member || false,
  sequenceOrder: db.sequence_order || 0,
  delaySeconds: db.delay_seconds || 0,
  active: db.active ?? true,
  createdAt: db.created_at || new Date().toISOString(),
  sequenceId: db.sequence_id,
  mediaUrl: db.media_url,
  mediaType: db.media_type,
  mediaCaption: db.media_caption,
});

export interface SequenceNode {
  id: string;
  nodeType: string;
  nodeOrder: number;
  config: Record<string, unknown>;
}

export interface GroupResult {
  groupName: string;
  groupJid: string;
  nodesSuccess: number;
  nodesFailed: number;
  completed: boolean;
}

export interface SendProgress {
  currentNode: number;
  totalNodes: number;
  currentGroup: number;
  totalGroups: number;
  groupName: string;
  nodeType: string;
  status: "sending" | "waiting" | "completed" | "error";
  errorMessage?: string;
  // Extended progress tracking
  groupsCompleted: number;
  nodesProcessedTotal: number;
  nodesFailed: number;
  groupResults: GroupResult[];
}

export function useGroupMessages(groupCampaignId: string | null) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, error, refetch } = useQuery({
    queryKey: ["group_messages", groupCampaignId],
    queryFn: async () => {
      if (!groupCampaignId) return [];

      const { data, error } = await supabase
        .from("group_messages")
        .select("*")
        .eq("group_campaign_id", groupCampaignId)
        .order("sequence_order", { ascending: true });

      if (error) throw error;
      return (data as DbGroupMessage[]).map(transformDbToFrontend);
    },
    enabled: !!user && !!groupCampaignId,
  });

  const createMessageMutation = useMutation({
    mutationFn: async (message: {
      type: MessageType;
      content: string;
      triggerKeyword?: string;
      schedule?: GroupMessage["schedule"];
      sendPrivate?: boolean;
      mentionMember?: boolean;
      sequenceOrder?: number;
      delaySeconds?: number;
      sequenceId?: string;
      mediaUrl?: string;
      mediaType?: string;
      mediaCaption?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      if (!groupCampaignId) throw new Error("No group campaign selected");

      const { data, error } = await supabase
        .from("group_messages")
        .insert({
          user_id: user.id,
          group_campaign_id: groupCampaignId,
          type: message.type,
          content: message.content,
          trigger_keyword: message.triggerKeyword || null,
          schedule: message.schedule || null,
          send_private: message.sendPrivate || false,
          mention_member: message.mentionMember || false,
          sequence_order: message.sequenceOrder || 0,
          delay_seconds: message.delaySeconds || 0,
          sequence_id: message.sequenceId || null,
          media_url: message.mediaUrl || null,
          media_type: message.mediaType || null,
          media_caption: message.mediaCaption || null,
        })
        .select()
        .single();

      if (error) throw error;
      return transformDbToFrontend(data as DbGroupMessage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_messages", groupCampaignId] });
      toast({ title: "Mensagem criada", description: "Mensagem automática configurada." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        type: MessageType;
        content: string;
        triggerKeyword: string | null;
        schedule: GroupMessage["schedule"];
        sendPrivate: boolean;
        mentionMember: boolean;
        sequenceOrder: number;
        delaySeconds: number;
        active: boolean;
        sequenceId: string | null;
        mediaUrl: string | null;
        mediaType: string | null;
        mediaCaption: string | null;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.triggerKeyword !== undefined) dbUpdates.trigger_keyword = updates.triggerKeyword;
      if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule;
      if (updates.sendPrivate !== undefined) dbUpdates.send_private = updates.sendPrivate;
      if (updates.mentionMember !== undefined) dbUpdates.mention_member = updates.mentionMember;
      if (updates.sequenceOrder !== undefined) dbUpdates.sequence_order = updates.sequenceOrder;
      if (updates.delaySeconds !== undefined) dbUpdates.delay_seconds = updates.delaySeconds;
      if (updates.active !== undefined) dbUpdates.active = updates.active;
      if (updates.sequenceId !== undefined) dbUpdates.sequence_id = updates.sequenceId;
      if (updates.mediaUrl !== undefined) dbUpdates.media_url = updates.mediaUrl;
      if (updates.mediaType !== undefined) dbUpdates.media_type = updates.mediaType;
      if (updates.mediaCaption !== undefined) dbUpdates.media_caption = updates.mediaCaption;

      const { error } = await supabase
        .from("group_messages")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_messages", groupCampaignId] });
      toast({ title: "Atualizado", description: "Mensagem atualizada com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_messages", groupCampaignId] });
      toast({ title: "Removido", description: "Mensagem removida com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Server-side message execution via Edge Function
  const sendMessageMutation = useMutation({
    mutationFn: async (params: {
      message: GroupMessage;
      campaign: GroupCampaign;
      instance: Instance;
      groups: CampaignGroup[];
      trigger?: { phone?: string; name?: string };
      sequenceNodes?: SequenceNode[];
      onProgress?: (progress: SendProgress) => void;
      abortSignal?: AbortSignal;
      webhookConfigs?: WebhookConfig[];
    }) => {
      const { message, campaign, groups, sequenceNodes, onProgress } = params;
      
      // Report starting status
      onProgress?.({
        currentNode: 1,
        totalNodes: sequenceNodes?.length || 1,
        currentGroup: 1,
        totalGroups: groups.length,
        groupName: "Iniciando execução no servidor...",
        nodeType: "starting",
        status: "sending",
        groupsCompleted: 0,
        nodesProcessedTotal: 0,
        nodesFailed: 0,
        groupResults: [],
      });

      // Call Edge Function for server-side execution
      const { data, error } = await supabase.functions.invoke("execute-message", {
        body: {
          messageId: message.id,
          campaignId: campaign.id,
          sequenceId: message.sequenceId,
        },
      });

      if (error) {
        throw new Error(error.message || "Erro ao executar mensagem");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Report completion
      const result = data as { 
        success: boolean; 
        nodesProcessed: number; 
        nodesFailed: number; 
        groupsProcessed: number;
        totalTimeMs: number;
      };

      onProgress?.({
        currentNode: result.nodesProcessed,
        totalNodes: result.nodesProcessed,
        currentGroup: result.groupsProcessed,
        totalGroups: result.groupsProcessed,
        groupName: "Concluído",
        nodeType: "completed",
        status: "completed",
        groupsCompleted: result.groupsProcessed,
        nodesProcessedTotal: result.nodesProcessed,
        nodesFailed: result.nodesFailed,
        groupResults: [],
      });

      return { 
        success: result.success, 
        nodesProcessed: result.nodesProcessed, 
        nodesFailed: result.nodesFailed, 
        groupsProcessed: result.groupsProcessed 
      };
    },
    onSuccess: (result) => {
      if (result.nodesProcessed > 0) {
        const failedText = result.nodesFailed > 0 ? ` (${result.nodesFailed} falhou)` : "";
        toast({ 
          title: result.nodesFailed === 0 ? "Sequência enviada" : "Sequência enviada com erros", 
          description: `${result.nodesProcessed} nodes processados para ${result.groupsProcessed} grupo(s)${failedText}.`,
          variant: result.nodesFailed > 0 ? "destructive" : "default",
        });
      } else {
        toast({ title: "Enviado", description: "Mensagem enviada com sucesso!" });
      }
    },
    onError: (error) => {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    },
  });

  // Group messages by type
  const welcomeMessages = messages.filter((m) => m.type === "welcome");
  const farewellMessages = messages.filter((m) => m.type === "farewell");
  const scheduledMessages = messages.filter((m) => m.type === "scheduled");
  const keywordResponses = messages.filter((m) => m.type === "keyword_response");

  return {
    messages,
    welcomeMessages,
    farewellMessages,
    scheduledMessages,
    keywordResponses,
    isLoading,
    error,
    refetch,
    createMessage: createMessageMutation.mutateAsync,
    updateMessage: updateMessageMutation.mutateAsync,
    deleteMessage: deleteMessageMutation.mutateAsync,
    sendMessage: sendMessageMutation.mutateAsync,
    isCreating: createMessageMutation.isPending,
    isUpdating: updateMessageMutation.isPending,
    isDeleting: deleteMessageMutation.isPending,
    isSending: sendMessageMutation.isPending,
  };
}
