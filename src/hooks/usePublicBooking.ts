import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicAttendant {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
}

export interface PublicQuestion {
  id: string;
  question_text: string;
  question_type: "short_text" | "long_text" | "number" | "multiple_choice";
  options: string[];
  is_required: boolean;
  sort_order: number;
}

export interface PublicLeadField {
  id: string;
  field_name: string;
  field_type: "text" | "phone" | "email" | "number";
  is_required: boolean;
  is_default: boolean;
  sort_order: number;
}

export interface PublicCalendar {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  modality: "call" | "video" | "in_person";
  duration_minutes: number;
  color: string;
  distribution: "round_robin" | "lead_choice";
  branding: Record<string, any>;
  texts: Record<string, any>;
  layout: Record<string, any>;
  advanced: Record<string, any>;
  attendants: PublicAttendant[];
  questions: PublicQuestion[];
  lead_fields: PublicLeadField[];
}

export function usePublicCalendar(slug: string | undefined) {
  return useQuery({
    queryKey: ["public_calendar", slug],
    queryFn: async (): Promise<PublicCalendar | null> => {
      if (!slug) return null;
      const { data, error } = await (supabase as any).rpc("get_public_calendar", { p_slug: slug });
      if (error) throw error;
      return data as PublicCalendar | null;
    },
    enabled: !!slug,
  });
}

export function usePublicAvailability(
  calendarId: string | undefined,
  attendantId: string | null,
  fromDate: string,
  toDate: string,
) {
  return useQuery({
    queryKey: ["public_availability", calendarId, attendantId, fromDate, toDate],
    queryFn: async (): Promise<Array<{ date: string; slots: string[] }>> => {
      if (!calendarId) return [];
      const { data, error } = await (supabase as any).rpc("get_calendar_availability", {
        p_calendar_id: calendarId,
        p_attendant_id: attendantId,
        p_from_date: fromDate,
        p_to_date: toDate,
      });
      if (error) throw error;
      return (data as any) || [];
    },
    enabled: !!calendarId,
  });
}

export function useCreatePublicAppointment() {
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data, error } = await (supabase as any).rpc("create_public_appointment", { p_payload: payload });
      if (error) throw error;
      return data as { id: string; cancel_token: string; attendant_id: string; scheduled_start: string; scheduled_end: string };
    },
  });
}

export function useAppointmentByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["appointment_by_token", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await (supabase as any).rpc("get_appointment_by_token", { p_token: token });
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });
}

export function useCancelByToken() {
  return useMutation({
    mutationFn: async (input: { token: string; reason: string; comment: string }) => {
      const { data, error } = await (supabase as any).rpc("cancel_appointment_by_token", {
        p_token: input.token,
        p_reason: input.reason,
        p_comment: input.comment,
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useRescheduleByToken() {
  return useMutation({
    mutationFn: async (input: { token: string; newStart: string }) => {
      const { data, error } = await (supabase as any).rpc("reschedule_appointment_by_token", {
        p_token: input.token,
        p_new_start: input.newStart,
      });
      if (error) throw error;
      return data as { ok: boolean; id: string; cancel_token: string };
    },
  });
}
