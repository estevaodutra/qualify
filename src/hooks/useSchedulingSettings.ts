import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

export interface SchedulingSettings {
  id?: string;
  company_id: string;
  default_timezone: string;
  custom_domain: string | null;
  custom_domain_status: "pending" | "verified" | "error";
  custom_domain_verified_at: string | null;
  hide_branding: boolean;
  webhook_global_enabled: boolean;
  webhook_global_url: string | null;
  default_whatsapp_instance_id: string | null;
  send_email_confirmation: boolean;
  send_ics_invite: boolean;
}

const defaults = (companyId: string): SchedulingSettings => ({
  company_id: companyId,
  default_timezone: "America/Sao_Paulo",
  custom_domain: null,
  custom_domain_status: "pending",
  custom_domain_verified_at: null,
  hide_branding: false,
  webhook_global_enabled: false,
  webhook_global_url: null,
  default_whatsapp_instance_id: null,
  send_email_confirmation: false,
  send_ics_invite: false,
});

export function useSchedulingSettings() {
  const { activeCompanyId } = useCompany();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["scheduling_settings", activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async (): Promise<SchedulingSettings> => {
      const { data, error } = await (supabase as any)
        .from("scheduling_settings")
        .select("*")
        .eq("company_id", activeCompanyId)
        .maybeSingle();
      if (error) throw error;
      return (data as SchedulingSettings) || defaults(activeCompanyId!);
    },
  });

  const upsert = useMutation({
    mutationFn: async (patch: Partial<SchedulingSettings>) => {
      if (!activeCompanyId) throw new Error("No company");
      const current = query.data || defaults(activeCompanyId);
      const merged = { ...current, ...patch, company_id: activeCompanyId };
      const { data, error } = await (supabase as any)
        .from("scheduling_settings")
        .upsert(merged, { onConflict: "company_id" })
        .select()
        .single();
      if (error) throw error;
      return data as SchedulingSettings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduling_settings", activeCompanyId] });
      toast({ title: "Configurações salvas" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  return { ...query, upsert };
}

export function useGlobalIntegrations() {
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["scheduling_global_integrations", activeCompanyId],
    enabled: !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scheduling_global_integrations")
        .select("*")
        .eq("company_id", activeCompanyId);
      if (error) throw error;
      return (data as Array<{ id: string; provider: string; is_connected: boolean; account_email: string | null }>) || [];
    },
  });
}
