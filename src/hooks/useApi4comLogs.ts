import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Api4comLogItem {
  id: string;
  createdAt: string;
  formattedDate: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  durationFormatted: string;
  status: string;
  hangupCause: string | null;
  hangupCauseCode: string | null;
  audioUrl: string | null;
  externalCallId: string | null;
  api4comMetadata: any;
  operator?: {
    id: string;
    name: string;
    extension: string | null;
    sipDomain: string | null;
  } | null;
  lead?: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  company?: {
    id: string;
    name: string;
  } | null;
  campaign?: {
    id: string;
    name: string;
  } | null;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export function useApi4comLogs() {
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["api4com-logs"],
    refetchInterval: 10000,
    queryFn: async (): Promise<Api4comLogItem[]> => {
      const { data, error } = await (supabase as any)
        .from("call_logs")
        .select(`
          id,
          created_at,
          started_at,
          ended_at,
          duration_seconds,
          call_status,
          hangup_cause,
          hangup_cause_code,
          audio_url,
          external_call_id,
          api4com_metadata,
          lead_id,
          campaign_id,
          call_operators (
            id,
            operator_name,
            extension,
            sip_domain
          ),
          companies (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Erro ao buscar logs da API4COM:", error);
        throw error;
      }

      const rows: any[] = data || [];
      const leadIds = Array.from(new Set(rows.map((c) => c.lead_id).filter(Boolean)));
      const campaignIds = Array.from(new Set(rows.map((c) => c.campaign_id).filter(Boolean)));

      const [leadsRes, campaignsRes] = await Promise.all([
        leadIds.length > 0
          ? (supabase as any).from("leads").select("id, name, phone").in("id", leadIds)
          : Promise.resolve({ data: [] }),
        campaignIds.length > 0
          ? (supabase as any).from("call_campaigns").select("id, name").in("id", campaignIds)
          : Promise.resolve({ data: [] }),
      ]);

      const leadsMap = new Map((leadsRes.data || []).map((l: any) => [l.id, l]));
      const campaignsMap = new Map((campaignsRes.data || []).map((cp: any) => [cp.id, cp]));

      return rows.map((c: any): Api4comLogItem => {
        const rawDate = c.created_at || c.started_at || new Date().toISOString();
        let formattedDate = "-";
        try {
          formattedDate = new Date(rawDate).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        } catch {
          formattedDate = rawDate;
        }

        const duration = Number(c.duration_seconds) || 0;
        const matchedLead = c.lead_id ? leadsMap.get(c.lead_id) : null;
        const matchedCampaign = c.campaign_id ? campaignsMap.get(c.campaign_id) : null;

        const meta = c.api4com_metadata || {};
        const fallbackPhone = meta.destination || meta.phone || meta.to || null;
        const fallbackName = meta.leadName || (fallbackPhone ? `Discagem (${fallbackPhone})` : null);

        return {
          id: c.id,
          createdAt: c.created_at,
          formattedDate,
          startedAt: c.started_at,
          endedAt: c.ended_at,
          durationSeconds: duration,
          durationFormatted: formatDuration(duration),
          status: c.call_status || "dialing",
          hangupCause: c.hangup_cause || null,
          hangupCauseCode: c.hangup_cause_code ? String(c.hangup_cause_code) : null,
          audioUrl: c.audio_url || null,
          externalCallId: c.external_call_id || null,
          api4comMetadata: meta,
          operator: c.call_operators
            ? {
                id: c.call_operators.id,
                name: c.call_operators.operator_name || "Operador",
                extension: c.call_operators.extension || null,
                sipDomain: c.call_operators.sip_domain || null,
              }
            : null,
          lead: matchedLead
            ? {
                id: matchedLead.id,
                name: matchedLead.name || null,
                phone: matchedLead.phone || null,
              }
            : fallbackPhone
            ? {
                id: c.lead_id || "direct",
                name: fallbackName,
                phone: fallbackPhone,
              }
            : null,
          company: c.companies
            ? {
                id: c.companies.id,
                name: c.companies.name,
              }
            : null,
          campaign: matchedCampaign
            ? {
                id: matchedCampaign.id,
                name: matchedCampaign.name,
              }
            : null,
        };
      });
    },
    refetchInterval: 15_000,
  });

  return { logs, isLoading, refetch };
}
