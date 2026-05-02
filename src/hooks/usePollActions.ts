import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PollMessage {
  id: string;
  messageId: string;
  zaapId: string | null;
  nodeId: string;
  sequenceId: string;
  campaignId: string;
  groupJid: string;
  instanceId: string;
  questionText: string;
  options: string[];
  optionActions: Record<string, unknown>;
  sentAt: string;
  expiresAt: string | null;
}

export interface PollResponse {
  id: string;
  pollMessageId: string;
  respondentPhone: string;
  respondentName: string | null;
  respondentJid: string | null;
  optionIndex: number;
  optionText: string;
  actionType: string | null;
  actionExecuted: boolean;
  actionResult: Record<string, unknown>;
  respondedAt: string;
  executedAt: string | null;
}

interface DbPollMessage {
  id: string;
  user_id: string;
  message_id: string;
  zaap_id: string | null;
  node_id: string;
  sequence_id: string;
  campaign_id: string;
  group_jid: string;
  instance_id: string;
  question_text: string;
  options: string[];
  option_actions: Record<string, unknown>;
  sent_at: string | null;
  expires_at: string | null;
}

interface DbPollResponse {
  id: string;
  user_id: string;
  poll_message_id: string;
  respondent_phone: string;
  respondent_name: string | null;
  respondent_jid: string | null;
  option_index: number;
  option_text: string;
  action_type: string | null;
  action_executed: boolean | null;
  action_result: Record<string, unknown> | null;
  responded_at: string | null;
  executed_at: string | null;
}

const transformPollMessage = (db: DbPollMessage): PollMessage => ({
  id: db.id,
  messageId: db.message_id,
  zaapId: db.zaap_id,
  nodeId: db.node_id,
  sequenceId: db.sequence_id,
  campaignId: db.campaign_id,
  groupJid: db.group_jid,
  instanceId: db.instance_id,
  questionText: db.question_text,
  options: db.options || [],
  optionActions: db.option_actions || {},
  sentAt: db.sent_at || new Date().toISOString(),
  expiresAt: db.expires_at,
});

const transformPollResponse = (db: DbPollResponse): PollResponse => ({
  id: db.id,
  pollMessageId: db.poll_message_id,
  respondentPhone: db.respondent_phone,
  respondentName: db.respondent_name,
  respondentJid: db.respondent_jid,
  optionIndex: db.option_index,
  optionText: db.option_text,
  actionType: db.action_type,
  actionExecuted: db.action_executed || false,
  actionResult: db.action_result || {},
  respondedAt: db.responded_at || new Date().toISOString(),
  executedAt: db.executed_at,
});

export function usePollMessages(campaignId: string | null) {
  const { user } = useAuth();

  const { data: pollMessages = [], isLoading, error, refetch } = useQuery({
    queryKey: ["poll_messages", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from("poll_messages")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return (data as DbPollMessage[]).map(transformPollMessage);
    },
    enabled: !!user && !!campaignId,
  });

  return {
    pollMessages,
    isLoading,
    error,
    refetch,
  };
}

export function usePollResponses(pollMessageId: string | null) {
  const { user } = useAuth();

  const { data: responses = [], isLoading, error, refetch } = useQuery({
    queryKey: ["poll_responses", pollMessageId],
    queryFn: async () => {
      if (!pollMessageId) return [];
      
      const { data, error } = await supabase
        .from("poll_responses")
        .select("*")
        .eq("poll_message_id", pollMessageId)
        .order("responded_at", { ascending: false });

      if (error) throw error;
      return (data as DbPollResponse[]).map(transformPollResponse);
    },
    enabled: !!user && !!pollMessageId,
  });

  // Calculate stats
  const stats = {
    totalResponses: responses.length,
    uniqueRespondents: new Set(responses.map((r) => r.respondentPhone)).size,
    actionsExecuted: responses.filter((r) => r.actionExecuted).length,
    responsesByOption: responses.reduce((acc, r) => {
      acc[r.optionIndex] = (acc[r.optionIndex] || 0) + 1;
      return acc;
    }, {} as Record<number, number>),
  };

  return {
    responses,
    stats,
    isLoading,
    error,
    refetch,
  };
}

// Get existing tags from group members for suggestions
export function useExistingTags() {
  const { user } = useAuth();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["existing_tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("tags");

      if (error) throw error;
      
      // Extract unique tags
      const allTags = new Set<string>();
      (data || []).forEach((member) => {
        const memberTags = member.tags as string[] | null;
        if (memberTags) {
          memberTags.forEach((tag) => allTags.add(tag));
        }
      });
      
      return Array.from(allTags).sort();
    },
    enabled: !!user,
  });

  return { tags, isLoading };
}
