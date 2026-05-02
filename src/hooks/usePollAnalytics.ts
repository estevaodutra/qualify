import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PollOptionStat {
  index: number;
  text: string;
  votes: number;
  percentage: number;
}

export interface PollAnalyticsData {
  pollMessageId: string;
  questionText: string;
  options: string[];
  sentAt: string;
  totalVotes: number;
  uniqueRespondents: number;
  responseRate: number;
  optionsStats: PollOptionStat[];
}

export function usePollAnalytics(campaignId: string | null, totalMembers: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["poll_analytics", campaignId, totalMembers],
    queryFn: async (): Promise<PollAnalyticsData[]> => {
      // 1. Fetch poll messages for the campaign
      const { data: polls, error: pollsError } = await supabase
        .from("poll_messages")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("sent_at", { ascending: false });

      if (pollsError) throw pollsError;
      if (!polls || polls.length === 0) return [];

      // 2. For each poll, get analytics via RPC
      const results: PollAnalyticsData[] = [];

      for (const poll of polls) {
        const { data, error } = await supabase.rpc("get_poll_analytics", {
          p_poll_message_id: poll.id,
          p_total_members: totalMembers,
        });

        if (error) continue;

        const row = data?.[0];
        if (!row) continue;

        results.push({
          pollMessageId: poll.id,
          questionText: (poll as any).question_text || "",
          options: ((poll as any).options as string[]) || [],
          sentAt: (poll as any).sent_at || new Date().toISOString(),
          totalVotes: Number(row.total_votes) || 0,
          uniqueRespondents: Number(row.unique_respondents) || 0,
          responseRate: Number(row.response_rate) || 0,
          optionsStats: (row.options_stats as unknown as PollOptionStat[]) || [],
        });
      }

      return results;
    },
    enabled: !!user && !!campaignId,
  });
}
