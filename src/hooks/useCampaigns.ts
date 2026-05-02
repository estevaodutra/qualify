import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface Campaign {
  id: string;
  name: string;
  channel: "whatsapp" | "voice";
  campaignType: "despacho" | "pirata" | "ura" | "ligacao";
  status: "draft" | "running" | "paused" | "completed" | "terminated";
  sent: number;
  total: number;
  successRate: number;
  createdAt: string;
}

interface DbCampaign {
  id: string;
  name: string;
  channel: string;
  campaign_type: string | null;
  status: string | null;
  sent: number | null;
  total: number | null;
  success_rate: number | null;
  created_at: string | null;
  user_id: string | null;
}

function transformDbToFrontend(dbCampaign: DbCampaign): Campaign {
  return {
    id: dbCampaign.id,
    name: dbCampaign.name,
    channel: (dbCampaign.channel || "whatsapp") as Campaign["channel"],
    campaignType: (dbCampaign.campaign_type || "despacho") as Campaign["campaignType"],
    status: (dbCampaign.status || "draft") as Campaign["status"],
    sent: dbCampaign.sent || 0,
    total: dbCampaign.total || 0,
    successRate: Number(dbCampaign.success_rate) || 0,
    createdAt: dbCampaign.created_at 
      ? new Date(dbCampaign.created_at).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0],
  };
}

export function useCampaigns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data as DbCampaign[]).map(transformDbToFrontend);
    },
    enabled: !!user,
  });

  const { mutateAsync: createCampaign, isPending: isCreating } = useMutation({
    mutationFn: async (campaign: { name: string; channel: string; total: number }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          name: campaign.name,
          channel: campaign.channel,
          total: campaign.total,
          status: "draft",
          sent: 0,
          success_rate: 0,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campanha criada", description: "A campanha foi criada com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const { mutateAsync: updateCampaign, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: updates.name,
          channel: updates.channel,
          status: updates.status,
          sent: updates.sent,
          total: updates.total,
          success_rate: updates.successRate,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });

  const { mutateAsync: deleteCampaign, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({ title: "Campanha removida" });
    },
  });

  return {
    campaigns,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
}
