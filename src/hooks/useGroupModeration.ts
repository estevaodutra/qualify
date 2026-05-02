import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type RuleType = "banned_words" | "link_block" | "media_block" | "flood_limit";
export type ModerationAction = "delete" | "warn" | "strike" | "mute" | "remove";

export interface ModerationRule {
  id: string;
  groupCampaignId: string;
  ruleType: RuleType;
  config: {
    words?: string[];
    maxMessagesPerMinute?: number;
    adminExempt?: boolean;
    muteMinutes?: number;
    maxStrikes?: number;
    strikeResetDays?: number;
  };
  action: ModerationAction;
  active: boolean;
  createdAt: string;
}

export interface ModerationLog {
  id: string;
  groupCampaignId: string;
  memberId: string | null;
  memberPhone: string | null;
  ruleId: string | null;
  action: string;
  reason: string | null;
  messageContent: string | null;
  createdAt: string;
}

interface DbModerationRule {
  id: string;
  group_campaign_id: string;
  user_id: string;
  rule_type: string;
  config: Record<string, unknown>;
  action: string;
  active: boolean | null;
  created_at: string | null;
}

interface DbModerationLog {
  id: string;
  group_campaign_id: string;
  user_id: string;
  member_id: string | null;
  member_phone: string | null;
  rule_id: string | null;
  action: string;
  reason: string | null;
  message_content: string | null;
  created_at: string | null;
}

const transformRuleToFrontend = (db: DbModerationRule): ModerationRule => ({
  id: db.id,
  groupCampaignId: db.group_campaign_id,
  ruleType: db.rule_type as RuleType,
  config: db.config as ModerationRule["config"],
  action: db.action as ModerationAction,
  active: db.active ?? true,
  createdAt: db.created_at || new Date().toISOString(),
});

const transformLogToFrontend = (db: DbModerationLog): ModerationLog => ({
  id: db.id,
  groupCampaignId: db.group_campaign_id,
  memberId: db.member_id,
  memberPhone: db.member_phone,
  ruleId: db.rule_id,
  action: db.action,
  reason: db.reason,
  messageContent: db.message_content,
  createdAt: db.created_at || new Date().toISOString(),
});

export function useGroupModeration(groupCampaignId: string | null) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch rules
  const { data: rules = [], isLoading: isLoadingRules, refetch: refetchRules } = useQuery({
    queryKey: ["group_moderation_rules", groupCampaignId],
    queryFn: async () => {
      if (!groupCampaignId) return [];

      const { data, error } = await supabase
        .from("group_moderation_rules")
        .select("*")
        .eq("group_campaign_id", groupCampaignId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data as DbModerationRule[]).map(transformRuleToFrontend);
    },
    enabled: !!user && !!groupCampaignId,
  });

  // Fetch logs
  const { data: logs = [], isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["group_moderation_logs", groupCampaignId],
    queryFn: async () => {
      if (!groupCampaignId) return [];

      const { data, error } = await supabase
        .from("group_moderation_logs")
        .select("*")
        .eq("group_campaign_id", groupCampaignId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data as DbModerationLog[]).map(transformLogToFrontend);
    },
    enabled: !!user && !!groupCampaignId,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (rule: {
      ruleType: RuleType;
      config: ModerationRule["config"];
      action: ModerationAction;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      if (!groupCampaignId) throw new Error("No group campaign selected");

      const { data, error } = await supabase
        .from("group_moderation_rules")
        .insert({
          user_id: user.id,
          group_campaign_id: groupCampaignId,
          rule_type: rule.ruleType,
          config: rule.config,
          action: rule.action,
        })
        .select()
        .single();

      if (error) throw error;
      return transformRuleToFrontend(data as DbModerationRule);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_moderation_rules", groupCampaignId] });
      toast({ title: "Regra criada", description: "Regra de moderação configurada." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<{
        config: ModerationRule["config"];
        action: ModerationAction;
        active: boolean;
      }>;
    }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.config !== undefined) dbUpdates.config = updates.config;
      if (updates.action !== undefined) dbUpdates.action = updates.action;
      if (updates.active !== undefined) dbUpdates.active = updates.active;

      const { error } = await supabase
        .from("group_moderation_rules")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_moderation_rules", groupCampaignId] });
      toast({ title: "Atualizado", description: "Regra atualizada com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_moderation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_moderation_rules", groupCampaignId] });
      toast({ title: "Removido", description: "Regra removida com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Get rules by type
  const bannedWordsRule = rules.find((r) => r.ruleType === "banned_words");
  const linkBlockRule = rules.find((r) => r.ruleType === "link_block");
  const mediaBlockRule = rules.find((r) => r.ruleType === "media_block");
  const floodLimitRule = rules.find((r) => r.ruleType === "flood_limit");

  return {
    rules,
    logs,
    bannedWordsRule,
    linkBlockRule,
    mediaBlockRule,
    floodLimitRule,
    isLoading: isLoadingRules || isLoadingLogs,
    refetch: () => {
      refetchRules();
      refetchLogs();
    },
    createRule: createRuleMutation.mutateAsync,
    updateRule: updateRuleMutation.mutateAsync,
    deleteRule: deleteRuleMutation.mutateAsync,
    isCreating: createRuleMutation.isPending,
    isUpdating: updateRuleMutation.isPending,
    isDeleting: deleteRuleMutation.isPending,
  };
}
