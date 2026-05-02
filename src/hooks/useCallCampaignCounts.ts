import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCallCampaignCounts(campaignIds: string[]) {
  return useQuery({
    queryKey: ["call-campaign-counts", campaignIds],
    queryFn: async () => {
      const counts: Record<string, { leads: number; calls: number }> = {};
      campaignIds.forEach(id => { counts[id] = { leads: 0, calls: 0 }; });

      if (campaignIds.length === 0) return counts;

      const { data: leadCounts } = await (supabase as any)
        .rpc("get_call_leads_counts", { p_campaign_ids: campaignIds });
      (leadCounts || []).forEach((r: any) => {
        if (counts[r.campaign_id]) counts[r.campaign_id].leads = Number(r.cnt);
      });

      const { data: logCounts } = await (supabase as any)
        .rpc("get_call_logs_counts", { p_campaign_ids: campaignIds });
      (logCounts || []).forEach((r: any) => {
        if (counts[r.campaign_id]) counts[r.campaign_id].calls = Number(r.cnt);
      });

      return counts;
    },
    enabled: campaignIds.length > 0,
  });
}
