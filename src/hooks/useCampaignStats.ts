import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CampaignStats {
  despacho: { active: number; total: number };
  grupos: { active: number; total: number };
  pirata: { active: number; total: number };
  ura: { active: number; total: number };
  ligacao: { active: number; total: number };
}

export function useCampaignStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["campaign-stats"],
    queryFn: async (): Promise<CampaignStats> => {
      // Fetch dispatch campaigns (despacho, pirata, ura, ligacao)
      const { data: campaigns, error: campaignsError } = await supabase
        .from("campaigns")
        .select("campaign_type, status");

      if (campaignsError) throw campaignsError;

      // Fetch group campaigns
      const { data: groupCampaigns, error: groupsError } = await supabase
        .from("group_campaigns")
        .select("status");

      if (groupsError) throw groupsError;

      // Count campaigns by type
      const stats: CampaignStats = {
        despacho: { active: 0, total: 0 },
        grupos: { active: 0, total: 0 },
        pirata: { active: 0, total: 0 },
        ura: { active: 0, total: 0 },
        ligacao: { active: 0, total: 0 },
      };

      // Count regular campaigns by type
      campaigns?.forEach((campaign) => {
        const type = (campaign.campaign_type || "despacho") as keyof CampaignStats;
        if (stats[type]) {
          stats[type].total++;
          if (campaign.status === "running" || campaign.status === "active") {
            stats[type].active++;
          }
        }
      });

      // Count group campaigns
      groupCampaigns?.forEach((campaign) => {
        stats.grupos.total++;
        if (campaign.status === "active") {
          stats.grupos.active++;
        }
      });

      return stats;
    },
    enabled: !!user,
  });
}
