import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ExportSchedule {
  id: string;
  user_id: string;
  group_campaign_id: string;
  webhook_url: string;
  status_filter: string[];
  schedule_type: string;
  schedule_time: string;
  schedule_day_of_week: number | null;
  next_run_at: string | null;
  last_run_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function useExportSchedules(groupCampaignId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["export-schedules", groupCampaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_export_schedules" as any)
        .select("*")
        .eq("group_campaign_id", groupCampaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ExportSchedule[];
    },
    enabled: !!groupCampaignId,
  });

  const createSchedule = useMutation({
    mutationFn: async (schedule: {
      webhook_url: string;
      status_filter: string[];
      schedule_type: string;
      schedule_time?: string;
      schedule_day_of_week?: number;
    }) => {
      let nextRunAt: string | null = null;
      const now = new Date();

      if (schedule.schedule_type === "daily") {
        const [h, m] = (schedule.schedule_time || "08:00").split(":").map(Number);
        const next = new Date(now);
        next.setHours(h, m, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        nextRunAt = next.toISOString();
      } else if (schedule.schedule_type === "weekly") {
        const [h, m] = (schedule.schedule_time || "08:00").split(":").map(Number);
        const targetDay = schedule.schedule_day_of_week ?? 1;
        const next = new Date(now);
        const currentDay = next.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        next.setDate(next.getDate() + daysUntil);
        next.setHours(h, m, 0, 0);
        nextRunAt = next.toISOString();
      }

      const { error } = await supabase
        .from("member_export_schedules" as any)
        .insert({
          user_id: user!.id,
          group_campaign_id: groupCampaignId,
          webhook_url: schedule.webhook_url,
          status_filter: schedule.status_filter,
          schedule_type: schedule.schedule_type,
          schedule_time: schedule.schedule_time || "08:00",
          schedule_day_of_week: schedule.schedule_day_of_week ?? null,
          next_run_at: nextRunAt,
          is_active: schedule.schedule_type !== "once",
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["export-schedules", groupCampaignId] });
      toast.success("Agendamento salvo com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar agendamento: ${err.message}`);
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("member_export_schedules" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["export-schedules", groupCampaignId] });
      toast.success("Agendamento removido.");
    },
  });

  const exportNow = useMutation({
    mutationFn: async (params: { webhook_url: string; status_filter: string[] }) => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/export-members-webhook`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            group_campaign_id: groupCampaignId,
            webhook_url: params.webhook_url,
            status_filter: params.status_filter,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Falha na exportação");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`${data.total} membros exportados com sucesso!`);
    },
    onError: (err: Error) => {
      toast.error(`Erro na exportação: ${err.message}`);
    },
  });

  return {
    schedules,
    isLoading,
    createSchedule: createSchedule.mutateAsync,
    deleteSchedule: deleteSchedule.mutate,
    exportNow: exportNow.mutateAsync,
    isExporting: exportNow.isPending,
    isCreating: createSchedule.isPending,
  };
}
