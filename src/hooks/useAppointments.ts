import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

export interface Appointment {
  id: string;
  companyId: string;
  calendarId: string;
  attendantId: string | null;
  leadId: string | null;
  status: "confirmed" | "cancelled" | "completed" | "no_show" | "rescheduled";
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string | null;
  customFields: Record<string, any>;
  answers: Record<string, any>;
  meetingUrl: string | null;
  locationSnapshot: any;
  cancelToken: string;
  cancelReason: string | null;
  cancelComment: string | null;
  cancelledAt: string | null;
  internalNotes: string | null;
  createdAt: string;
  calendar?: { id: string; name: string; color: string; modality: string };
  attendant?: { id: string; name: string; photo_url: string | null } | null;
}

export interface AppointmentFilters {
  search?: string;
  calendarId?: string;
  attendantId?: string;
  status?: string;
  range?: "today" | "week" | "all";
}

const transform = (r: any): Appointment => ({
  id: r.id,
  companyId: r.company_id,
  calendarId: r.calendar_id,
  attendantId: r.attendant_id,
  leadId: r.lead_id,
  status: r.status,
  scheduledStart: r.scheduled_start,
  scheduledEnd: r.scheduled_end,
  timezone: r.timezone,
  leadName: r.lead_name,
  leadPhone: r.lead_phone,
  leadEmail: r.lead_email,
  customFields: r.custom_fields || {},
  answers: r.answers || {},
  meetingUrl: r.meeting_url,
  locationSnapshot: r.location_snapshot,
  cancelToken: r.cancel_token,
  cancelReason: r.cancel_reason,
  cancelComment: r.cancel_comment,
  cancelledAt: r.cancelled_at,
  internalNotes: r.internal_notes,
  createdAt: r.created_at,
  calendar: r.calendar ? { id: r.calendar.id, name: r.calendar.name, color: r.calendar.color, modality: r.calendar.modality } : undefined,
  attendant: r.attendant ? { id: r.attendant.id, name: r.attendant.name, photo_url: r.attendant.photo_url } : null,
});

export function useAppointments(filters: AppointmentFilters = {}) {
  const { activeCompanyId } = useCompany();
  const { toast } = useToast();
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: ["scheduling_appointments", activeCompanyId, filters],
    queryFn: async () => {
      if (!activeCompanyId) return [];
      let q = (supabase as any)
        .from("scheduling_appointments")
        .select("*, calendar:scheduling_calendars(id,name,color,modality), attendant:scheduling_attendants(id,name,photo_url)")
        .eq("company_id", activeCompanyId)
        .order("scheduled_start", { ascending: true })
        .limit(200);

      if (filters.calendarId) q = q.eq("calendar_id", filters.calendarId);
      if (filters.attendantId) q = q.eq("attendant_id", filters.attendantId);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.range === "today") {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 1);
        q = q.gte("scheduled_start", start.toISOString()).lt("scheduled_start", end.toISOString());
      } else if (filters.range === "week") {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(end.getDate() + 7);
        q = q.gte("scheduled_start", start.toISOString()).lt("scheduled_start", end.toISOString());
      }
      if (filters.search) {
        const s = filters.search.trim();
        q = q.or(`lead_name.ilike.%${s}%,lead_phone.ilike.%${s}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(transform);
    },
    enabled: !!activeCompanyId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: Appointment["status"]; note?: string }) => {
      const { error } = await (supabase as any)
        .from("scheduling_appointments")
        .update({ status, ...(status === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}) })
        .eq("id", id);
      if (error) throw error;
      await (supabase as any).from("scheduling_appointment_events").insert({
        appointment_id: id,
        event_type: "status_changed",
        payload: { to: status, note: note || null, by: "admin" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduling_appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment_events"] });
      toast({ title: "Status atualizado" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await (supabase as any)
        .from("scheduling_appointments")
        .update({ internal_notes: notes })
        .eq("id", id);
      if (error) throw error;
      await (supabase as any).from("scheduling_appointment_events").insert({
        appointment_id: id,
        event_type: "note_added",
        payload: { notes },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduling_appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment_events"] });
      toast({ title: "Nota salva" });
    },
  });

  return { appointments: listQ.data || [], isLoading: listQ.isLoading, updateStatus, updateNotes };
}

export function useAppointmentEvents(appointmentId: string | null) {
  return useQuery({
    queryKey: ["appointment_events", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return [];
      const { data, error } = await (supabase as any)
        .from("scheduling_appointment_events")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!appointmentId,
  });
}
