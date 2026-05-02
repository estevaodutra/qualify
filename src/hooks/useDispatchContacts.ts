import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DispatchContact {
  id: string;
  campaignId: string;
  leadId: string | null;
  status: "active" | "paused" | "completed" | "unsubscribed";
  currentSequenceId: string | null;
  currentStep: number;
  sequenceStartedAt: string | null;
  sequenceCompletedAt: string | null;
  createdAt: string;
  // Joined from leads
  leadName: string | null;
  leadPhone: string | null;
  leadEmail: string | null;
}

export function useDispatchContacts(campaignId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["dispatch_contacts", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from("dispatch_campaign_contacts")
        .select("*, leads(name, phone, email)")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        campaignId: row.campaign_id,
        leadId: row.lead_id,
        status: row.status || "active",
        currentSequenceId: row.current_sequence_id,
        currentStep: row.current_step || 0,
        sequenceStartedAt: row.sequence_started_at,
        sequenceCompletedAt: row.sequence_completed_at,
        createdAt: row.created_at,
        leadName: row.leads?.name || null,
        leadPhone: row.leads?.phone || null,
        leadEmail: row.leads?.email || null,
      })) as DispatchContact[];
    },
    enabled: !!campaignId,
  });

  const stats = {
    total: contacts.length,
    active: contacts.filter(c => c.status === "active").length,
    inSequence: contacts.filter(c => c.currentSequenceId !== null && c.status === "active").length,
    completed: contacts.filter(c => c.status === "completed").length,
  };

  const addContactsMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !campaignId) throw new Error("Not authenticated");

      const rows = leadIds.map(leadId => ({
        user_id: user.id,
        campaign_id: campaignId,
        lead_id: leadId,
        status: "active",
      }));

      const { error } = await supabase
        .from("dispatch_campaign_contacts")
        .upsert(rows, { onConflict: "campaign_id,lead_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_contacts", campaignId] });
      toast({ title: "Contatos adicionados" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const removeContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("dispatch_campaign_contacts")
        .delete()
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_contacts", campaignId] });
      toast({ title: "Contato removido" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.currentSequenceId !== undefined) dbUpdates.current_sequence_id = updates.currentSequenceId;
      if (updates.currentStep !== undefined) dbUpdates.current_step = updates.currentStep;
      if (updates.sequenceStartedAt !== undefined) dbUpdates.sequence_started_at = updates.sequenceStartedAt;
      if (updates.sequenceCompletedAt !== undefined) dbUpdates.sequence_completed_at = updates.sequenceCompletedAt;

      const { error } = await supabase
        .from("dispatch_campaign_contacts")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch_contacts", campaignId] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  return {
    contacts,
    stats,
    isLoading,
    addContacts: addContactsMutation.mutateAsync,
    removeContact: removeContactMutation.mutateAsync,
    updateContact: updateContactMutation.mutateAsync,
    isAdding: addContactsMutation.isPending,
  };
}
