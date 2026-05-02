import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PirateLead {
  id: string;
  campaignId: string;
  groupJid: string;
  phone: string;
  lid: string | null;
  leadId: string | null;
  webhookSent: boolean;
  webhookResponseStatus: number | null;
  joinedAt: string;
}

const transform = (row: any): PirateLead => ({
  id: row.id,
  campaignId: row.campaign_id,
  groupJid: row.group_jid,
  phone: row.phone,
  lid: row.lid,
  leadId: row.lead_id,
  webhookSent: row.webhook_sent ?? false,
  webhookResponseStatus: row.webhook_response_status,
  joinedAt: row.joined_at,
});

export function usePirateLeads(campaignId: string | null) {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["pirate_leads", campaignId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pirate_leads")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("joined_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []).map(transform);
    },
    enabled: !!campaignId,
    refetchInterval: 30000,
  });

  return { leads, isLoading };
}
