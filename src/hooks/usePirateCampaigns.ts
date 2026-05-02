import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";

export interface PirateCampaign {
  id: string;
  companyId: string;
  userId: string;
  instanceId: string | null;
  name: string;
  description: string | null;
  webhookUrl: string | null;
  webhookHeaders: Record<string, string>;
  autoCreateLead: boolean;
  ignoreDuplicates: boolean;
  targetCampaignId: string | null;
  status: "active" | "paused" | "stopped";
  totalLeadsCaptured: number;
  captureLink: string | null;
  profilePhotoUrl: string | null;
  profileName: string | null;
  profileDescription: string | null;
  profileStatus: string | null;
  offerText: string | null;
  paymentLink: string | null;
  destinationType: "webhook" | "sequence";
  destinationSequenceId: string | null;
  destinationCampaignId: string | null;
  createdAt: string;
  updatedAt: string;
}

const transform = (row: any): PirateCampaign => ({
  id: row.id,
  companyId: row.company_id,
  userId: row.user_id,
  instanceId: row.instance_id,
  name: row.name,
  description: row.description,
  webhookUrl: row.webhook_url,
  webhookHeaders: row.webhook_headers || {},
  autoCreateLead: row.auto_create_lead ?? true,
  ignoreDuplicates: row.ignore_duplicates ?? false,
  targetCampaignId: row.target_campaign_id,
  status: row.status || "active",
  totalLeadsCaptured: row.total_leads_captured || 0,
  captureLink: row.capture_link,
  profilePhotoUrl: row.profile_photo_url,
  profileName: row.profile_name,
  profileDescription: row.profile_description,
  profileStatus: row.profile_status,
  offerText: row.offer_text,
  paymentLink: row.payment_link,
  destinationType: row.destination_type || "webhook",
  destinationSequenceId: row.destination_sequence_id,
  destinationCampaignId: row.destination_campaign_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function usePirateCampaigns() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["pirate_campaigns", activeCompanyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pirate_campaigns")
        .select("*")
        .eq("company_id", activeCompanyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(transform);
    },
    enabled: !!user && !!activeCompanyId,
  });

  const createCampaign = useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      instanceId?: string;
      webhookUrl?: string;
      webhookHeaders?: Record<string, string>;
      autoCreateLead?: boolean;
      ignoreDuplicates?: boolean;
      targetCampaignId?: string;
      groups?: { jid: string; name: string }[];
    }) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const { data, error } = await (supabase as any)
        .from("pirate_campaigns")
        .insert({
          company_id: activeCompanyId,
          user_id: authUser.id,
          name: input.name,
          description: input.description || null,
          instance_id: input.instanceId || null,
          webhook_url: input.webhookUrl || null,
          webhook_headers: input.webhookHeaders || {},
          auto_create_lead: input.autoCreateLead ?? true,
          ignore_duplicates: input.ignoreDuplicates ?? false,
          target_campaign_id: input.targetCampaignId || null,
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;

      // Add groups if provided
      if (input.groups && input.groups.length > 0) {
        const groupRows = input.groups.map((g) => ({
          campaign_id: data.id,
          user_id: authUser.id,
          group_jid: g.jid,
          group_name: g.name,
        }));
        const { error: gError } = await (supabase as any)
          .from("pirate_campaign_groups")
          .insert(groupRows);
        if (gError) console.error("Error adding groups:", gError);
      }

      return transform(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pirate_campaigns"] }),
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PirateCampaign> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.instanceId !== undefined) dbUpdates.instance_id = updates.instanceId;
      if (updates.webhookUrl !== undefined) dbUpdates.webhook_url = updates.webhookUrl;
      if (updates.webhookHeaders !== undefined) dbUpdates.webhook_headers = updates.webhookHeaders;
      if (updates.autoCreateLead !== undefined) dbUpdates.auto_create_lead = updates.autoCreateLead;
      if (updates.ignoreDuplicates !== undefined) dbUpdates.ignore_duplicates = updates.ignoreDuplicates;
      if (updates.targetCampaignId !== undefined) dbUpdates.target_campaign_id = updates.targetCampaignId;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.captureLink !== undefined) dbUpdates.capture_link = updates.captureLink;
      if (updates.profilePhotoUrl !== undefined) dbUpdates.profile_photo_url = updates.profilePhotoUrl;
      if (updates.profileName !== undefined) dbUpdates.profile_name = updates.profileName;
      if (updates.profileDescription !== undefined) dbUpdates.profile_description = updates.profileDescription;
      if (updates.profileStatus !== undefined) dbUpdates.profile_status = updates.profileStatus;
      if (updates.offerText !== undefined) dbUpdates.offer_text = updates.offerText;
      if (updates.paymentLink !== undefined) dbUpdates.payment_link = updates.paymentLink;
      if (updates.destinationType !== undefined) dbUpdates.destination_type = updates.destinationType;
      if (updates.destinationSequenceId !== undefined) dbUpdates.destination_sequence_id = updates.destinationSequenceId;
      if (updates.destinationCampaignId !== undefined) dbUpdates.destination_campaign_id = updates.destinationCampaignId;

      const { error } = await (supabase as any)
        .from("pirate_campaigns")
        .update(dbUpdates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pirate_campaigns"] }),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("pirate_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pirate_campaigns"] }),
  });

  return {
    campaigns,
    isLoading,
    createCampaign: createCampaign.mutateAsync,
    updateCampaign: updateCampaign.mutateAsync,
    deleteCampaign: deleteCampaign.mutateAsync,
    isCreating: createCampaign.isPending,
  };
}
