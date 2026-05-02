import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CalendarQuestion {
  id: string;
  calendarId: string;
  questionText: string;
  questionType: "short_text" | "long_text" | "number" | "multiple_choice";
  options: string[];
  isRequired: boolean;
  sortOrder: number;
}

export interface CalendarLeadField {
  id: string;
  calendarId: string;
  fieldName: string;
  fieldType: "text" | "phone" | "email" | "number";
  isRequired: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export interface CalendarNotifications {
  whatsappEnabled: boolean;
  whatsappInstanceId: string | null;
  confirmationMessage: string;
  reminder1dayEnabled: boolean;
  reminder1dayMessage: string;
  reminder1hourEnabled: boolean;
  reminder1hourMessage: string;
  reminder15minEnabled: boolean;
  reminder15minMessage: string;
  notifyOnCancel: boolean;
  notifyOnReschedule: boolean;
}

export interface CalendarIntegrations {
  callCampaignEnabled: boolean;
  callCampaignId: string | null;
  callCampaignTiming: "immediate" | "scheduled";
  videoProvider: "google_meet" | "zoom" | null;
  videoAutoLink: boolean;
  videoIncludeInConfirmation: boolean;
  inPersonAddress: string;
  inPersonMapsUrl: string;
  webhookCreatedUrl: string;
  webhookCreatedEnabled: boolean;
  webhookCancelledUrl: string;
  webhookCancelledEnabled: boolean;
  webhookRescheduledUrl: string;
  webhookRescheduledEnabled: boolean;
  webhookCompletedUrl: string;
  webhookCompletedEnabled: boolean;
}

export interface CalendarDetails {
  attendantIds: string[];
  questions: CalendarQuestion[];
  leadFields: CalendarLeadField[];
  notifications: CalendarNotifications | null;
  integrations: CalendarIntegrations | null;
}

const defaultNotifications: CalendarNotifications = {
  whatsappEnabled: false,
  whatsappInstanceId: null,
  confirmationMessage: "Olá {{lead.name}}, seu agendamento foi confirmado para {{appointment.date}} às {{appointment.time}}.",
  reminder1dayEnabled: false,
  reminder1dayMessage: "Lembrete: você tem um agendamento amanhã às {{appointment.time}}.",
  reminder1hourEnabled: false,
  reminder1hourMessage: "Seu agendamento é em 1 hora.",
  reminder15minEnabled: false,
  reminder15minMessage: "Seu agendamento começa em 15 minutos.",
  notifyOnCancel: true,
  notifyOnReschedule: true,
};

const defaultIntegrations: CalendarIntegrations = {
  callCampaignEnabled: false,
  callCampaignId: null,
  callCampaignTiming: "scheduled",
  videoProvider: null,
  videoAutoLink: true,
  videoIncludeInConfirmation: true,
  inPersonAddress: "",
  inPersonMapsUrl: "",
  webhookCreatedUrl: "",
  webhookCreatedEnabled: false,
  webhookCancelledUrl: "",
  webhookCancelledEnabled: false,
  webhookRescheduledUrl: "",
  webhookRescheduledEnabled: false,
  webhookCompletedUrl: "",
  webhookCompletedEnabled: false,
};

export function useCalendarDetails(calendarId: string | null) {
  return useQuery({
    queryKey: ["scheduling_calendar_details", calendarId],
    queryFn: async (): Promise<CalendarDetails> => {
      if (!calendarId) {
        return {
          attendantIds: [],
          questions: [],
          leadFields: [],
          notifications: defaultNotifications,
          integrations: defaultIntegrations,
        };
      }

      const [attRes, qRes, lfRes, nRes, iRes] = await Promise.all([
        (supabase as any).from("scheduling_calendar_attendants").select("attendant_id").eq("calendar_id", calendarId),
        (supabase as any).from("scheduling_questions").select("*").eq("calendar_id", calendarId).order("sort_order"),
        (supabase as any).from("scheduling_lead_fields").select("*").eq("calendar_id", calendarId).order("sort_order"),
        (supabase as any).from("scheduling_notifications").select("*").eq("calendar_id", calendarId).maybeSingle(),
        (supabase as any).from("scheduling_integrations").select("*").eq("calendar_id", calendarId).maybeSingle(),
      ]);

      const notifications: CalendarNotifications = nRes.data
        ? {
            whatsappEnabled: nRes.data.whatsapp_enabled,
            whatsappInstanceId: nRes.data.whatsapp_instance_id,
            confirmationMessage: nRes.data.confirmation_message ?? defaultNotifications.confirmationMessage,
            reminder1dayEnabled: nRes.data.reminder_1day_enabled,
            reminder1dayMessage: nRes.data.reminder_1day_message ?? defaultNotifications.reminder1dayMessage,
            reminder1hourEnabled: nRes.data.reminder_1hour_enabled,
            reminder1hourMessage: nRes.data.reminder_1hour_message ?? defaultNotifications.reminder1hourMessage,
            reminder15minEnabled: nRes.data.reminder_15min_enabled,
            reminder15minMessage: nRes.data.reminder_15min_message ?? defaultNotifications.reminder15minMessage,
            notifyOnCancel: nRes.data.notify_on_cancel,
            notifyOnReschedule: nRes.data.notify_on_reschedule,
          }
        : defaultNotifications;

      const integrations: CalendarIntegrations = iRes.data
        ? {
            callCampaignEnabled: iRes.data.call_campaign_enabled,
            callCampaignId: iRes.data.call_campaign_id,
            callCampaignTiming: iRes.data.call_campaign_timing,
            videoProvider: iRes.data.video_provider,
            videoAutoLink: iRes.data.video_auto_link,
            videoIncludeInConfirmation: iRes.data.video_include_in_confirmation,
            inPersonAddress: iRes.data.in_person_address ?? "",
            inPersonMapsUrl: iRes.data.in_person_maps_url ?? "",
            webhookCreatedUrl: iRes.data.webhook_created_url ?? "",
            webhookCreatedEnabled: iRes.data.webhook_created_enabled,
            webhookCancelledUrl: iRes.data.webhook_cancelled_url ?? "",
            webhookCancelledEnabled: iRes.data.webhook_cancelled_enabled,
            webhookRescheduledUrl: iRes.data.webhook_rescheduled_url ?? "",
            webhookRescheduledEnabled: iRes.data.webhook_rescheduled_enabled,
            webhookCompletedUrl: iRes.data.webhook_completed_url ?? "",
            webhookCompletedEnabled: iRes.data.webhook_completed_enabled,
          }
        : defaultIntegrations;

      return {
        attendantIds: (attRes.data || []).map((r: { attendant_id: string }) => r.attendant_id),
        questions: (qRes.data || []).map((q: any) => ({
          id: q.id,
          calendarId: q.calendar_id,
          questionText: q.question_text,
          questionType: q.question_type,
          options: q.options || [],
          isRequired: q.is_required,
          sortOrder: q.sort_order,
        })),
        leadFields: (lfRes.data || []).map((f: any) => ({
          id: f.id,
          calendarId: f.calendar_id,
          fieldName: f.field_name,
          fieldType: f.field_type,
          isRequired: f.is_required,
          isDefault: f.is_default,
          sortOrder: f.sort_order,
        })),
        notifications,
        integrations,
      };
    },
    enabled: !!calendarId,
  });
}

export { defaultNotifications, defaultIntegrations };
