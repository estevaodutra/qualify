import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCalendars, slugify, type SchedulingCalendar } from "@/hooks/useCalendars";
import { useCalendarDetails, defaultNotifications, defaultIntegrations, type CalendarNotifications, type CalendarIntegrations } from "@/hooks/useCalendarDetails";
import { BasicTab, type BasicTabState } from "./calendar-form/BasicTab";
import { ScheduleTab, defaultScheduleState, type ScheduleTabState } from "./calendar-form/ScheduleTab";
import { AppearanceTab, defaultAppearance, type AppearanceTabState } from "./calendar-form/AppearanceTab";
import { QualificationTab, type QuestionDraft } from "./calendar-form/QualificationTab";
import { NotificationsTab } from "./calendar-form/NotificationsTab";
import { IntegrationsTab, type LeadFieldDraft } from "./calendar-form/IntegrationsTab";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: SchedulingCalendar | null;
}

const defaultBasic: BasicTabState = {
  name: "",
  slug: "",
  description: "",
  modality: "call",
  duration: 30,
  customDuration: false,
  color: "#3b82f6",
  distribution: "round_robin",
  attendantIds: [],
};

const defaultLeadFields: LeadFieldDraft[] = [
  { id: "default-name", fieldName: "Nome", fieldType: "text", isRequired: true, isDefault: true },
  { id: "default-phone", fieldName: "Telefone", fieldType: "phone", isRequired: true, isDefault: true },
];

export function CalendarFormDialog({ open, onOpenChange, editing }: Props) {
  const { toast } = useToast();
  const { create, update } = useCalendars();
  const { data: details } = useCalendarDetails(editing?.id ?? null);

  const [basic, setBasic] = useState<BasicTabState>(defaultBasic);
  const [schedule, setSchedule] = useState<ScheduleTabState>(defaultScheduleState);
  const [appearance, setAppearance] = useState<AppearanceTabState>(defaultAppearance);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [notifications, setNotifications] = useState<CalendarNotifications>(defaultNotifications);
  const [integrations, setIntegrations] = useState<CalendarIntegrations>(defaultIntegrations);
  const [leadFields, setLeadFields] = useState<LeadFieldDraft[]>(defaultLeadFields);
  const [saving, setSaving] = useState(false);

  // Hydrate when editing
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setBasic({
        name: editing.name,
        slug: editing.slug,
        description: editing.description ?? "",
        modality: editing.modality,
        duration: editing.durationMinutes,
        customDuration: ![15, 30, 45, 60].includes(editing.durationMinutes),
        color: editing.color,
        distribution: editing.distribution,
        attendantIds: details?.attendantIds ?? [],
      });
      const adv = editing.advanced as Record<string, unknown>;
      const days = (adv?.days as ScheduleTabState["days"]) ?? defaultScheduleState.days;
      setSchedule({
        days,
        bufferMinutes: (adv?.bufferMinutes as number) ?? 0,
        minNoticeHours: (adv?.minNoticeHours as number) ?? 4,
        dailyLimit: (adv?.dailyLimit as number) ?? 0,
        windowDays: (adv?.windowDays as number) ?? 30,
      });
      setAppearance({ ...defaultAppearance, ...(editing.branding as Partial<AppearanceTabState>), ...(editing.texts as Partial<AppearanceTabState>), ...(editing.layout as Partial<AppearanceTabState>) });
      if (details) {
        setQuestions(details.questions.map((q) => ({
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          isRequired: q.isRequired,
        })));
        setNotifications(details.notifications ?? defaultNotifications);
        setIntegrations(details.integrations ?? defaultIntegrations);
        const fields = details.leadFields.length > 0
          ? details.leadFields.map((f) => ({
              id: f.id,
              fieldName: f.fieldName,
              fieldType: f.fieldType,
              isRequired: f.isRequired,
              isDefault: f.isDefault,
            }))
          : defaultLeadFields;
        setLeadFields(fields);
      }
    } else {
      setBasic(defaultBasic);
      setSchedule(defaultScheduleState);
      setAppearance(defaultAppearance);
      setQuestions([]);
      setNotifications(defaultNotifications);
      setIntegrations(defaultIntegrations);
      setLeadFields(defaultLeadFields);
    }
  }, [open, editing, details]);

  const handleSave = async () => {
    if (!basic.name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (basic.attendantIds.length === 0) {
      toast({ title: "Selecione pelo menos um atendente", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const calendarPayload = {
        name: basic.name,
        slug: basic.slug || slugify(basic.name),
        description: basic.description,
        modality: basic.modality,
        durationMinutes: basic.duration,
        color: basic.color,
        distribution: basic.distribution,
        branding: {
          logoUrl: appearance.logoUrl,
          companyName: appearance.companyName,
          primaryColor: appearance.primaryColor,
          secondaryColor: appearance.secondaryColor,
          backgroundColor: appearance.backgroundColor,
          cardColor: appearance.cardColor,
          textColor: appearance.textColor,
          backgroundImageUrl: appearance.backgroundImageUrl,
          backgroundOpacity: appearance.backgroundOpacity,
        },
        texts: {
          pageTitle: appearance.pageTitle,
          pageSubtitle: appearance.pageSubtitle,
          confirmButtonText: appearance.confirmButtonText,
          successTitle: appearance.successTitle,
          successMessage: appearance.successMessage,
        },
        layout: {
          layoutStyle: appearance.layoutStyle,
          showTimezone: appearance.showTimezone,
          showDuration: appearance.showDuration,
          hideBranding: appearance.hideBranding,
        },
        advanced: {
          days: schedule.days,
          bufferMinutes: schedule.bufferMinutes,
          minNoticeHours: schedule.minNoticeHours,
          dailyLimit: schedule.dailyLimit,
          windowDays: schedule.windowDays,
        },
      };

      const calId = editing
        ? (await update.mutateAsync({ id: editing.id, ...calendarPayload })).id
        : (await create.mutateAsync(calendarPayload)).id;

      // Sync attendants (delete & re-insert)
      await (supabase as any).from("scheduling_calendar_attendants").delete().eq("calendar_id", calId);
      if (basic.attendantIds.length > 0) {
        await (supabase as any).from("scheduling_calendar_attendants").insert(
          basic.attendantIds.map((aid) => ({ calendar_id: calId, attendant_id: aid }))
        );
      }

      // Sync questions
      await (supabase as any).from("scheduling_questions").delete().eq("calendar_id", calId);
      if (questions.length > 0) {
        await (supabase as any).from("scheduling_questions").insert(
          questions.map((q, idx) => ({
            calendar_id: calId,
            question_text: q.questionText,
            question_type: q.questionType,
            options: q.options,
            is_required: q.isRequired,
            sort_order: idx,
          }))
        );
      }

      // Sync lead fields
      await (supabase as any).from("scheduling_lead_fields").delete().eq("calendar_id", calId);
      await (supabase as any).from("scheduling_lead_fields").insert(
        leadFields.map((f, idx) => ({
          calendar_id: calId,
          field_name: f.fieldName,
          field_type: f.fieldType,
          is_required: f.isRequired,
          is_default: f.isDefault,
          sort_order: idx,
        }))
      );

      // Upsert notifications
      await (supabase as any).from("scheduling_notifications").upsert({
        calendar_id: calId,
        whatsapp_enabled: notifications.whatsappEnabled,
        whatsapp_instance_id: notifications.whatsappInstanceId,
        confirmation_message: notifications.confirmationMessage,
        reminder_1day_enabled: notifications.reminder1dayEnabled,
        reminder_1day_message: notifications.reminder1dayMessage,
        reminder_1hour_enabled: notifications.reminder1hourEnabled,
        reminder_1hour_message: notifications.reminder1hourMessage,
        reminder_15min_enabled: notifications.reminder15minEnabled,
        reminder_15min_message: notifications.reminder15minMessage,
        notify_on_cancel: notifications.notifyOnCancel,
        notify_on_reschedule: notifications.notifyOnReschedule,
      }, { onConflict: "calendar_id" });

      // Upsert integrations
      await (supabase as any).from("scheduling_integrations").upsert({
        calendar_id: calId,
        call_campaign_enabled: integrations.callCampaignEnabled,
        call_campaign_id: integrations.callCampaignId,
        call_campaign_timing: integrations.callCampaignTiming,
        video_provider: integrations.videoProvider,
        video_auto_link: integrations.videoAutoLink,
        video_include_in_confirmation: integrations.videoIncludeInConfirmation,
        in_person_address: integrations.inPersonAddress,
        in_person_maps_url: integrations.inPersonMapsUrl,
        webhook_created_url: integrations.webhookCreatedUrl,
        webhook_created_enabled: integrations.webhookCreatedEnabled,
        webhook_cancelled_url: integrations.webhookCancelledUrl,
        webhook_cancelled_enabled: integrations.webhookCancelledEnabled,
        webhook_rescheduled_url: integrations.webhookRescheduledUrl,
        webhook_rescheduled_enabled: integrations.webhookRescheduledEnabled,
        webhook_completed_url: integrations.webhookCompletedUrl,
        webhook_completed_enabled: integrations.webhookCompletedEnabled,
      }, { onConflict: "calendar_id" });

      onOpenChange(false);
    } catch (e) {
      toast({ title: "Erro ao salvar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Calendário" : "Criar Calendário"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-6 w-full shrink-0">
            <TabsTrigger value="basic">📝 Básico</TabsTrigger>
            <TabsTrigger value="schedule">⏰ Horários</TabsTrigger>
            <TabsTrigger value="appearance">🎨 Aparência</TabsTrigger>
            <TabsTrigger value="qualification">❓ Qualificação</TabsTrigger>
            <TabsTrigger value="notifications">📨 Notificações</TabsTrigger>
            <TabsTrigger value="integrations">🔗 Integrações</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4 pr-2">
            <TabsContent value="basic" className="mt-0"><BasicTab state={basic} onChange={setBasic} /></TabsContent>
            <TabsContent value="schedule" className="mt-0"><ScheduleTab state={schedule} onChange={setSchedule} /></TabsContent>
            <TabsContent value="appearance" className="mt-0"><AppearanceTab state={appearance} onChange={setAppearance} /></TabsContent>
            <TabsContent value="qualification" className="mt-0"><QualificationTab questions={questions} onChange={setQuestions} /></TabsContent>
            <TabsContent value="notifications" className="mt-0"><NotificationsTab state={notifications} onChange={setNotifications} /></TabsContent>
            <TabsContent value="integrations" className="mt-0">
              <IntegrationsTab
                modality={basic.modality}
                state={integrations}
                onChange={setIntegrations}
                leadFields={leadFields}
                onLeadFieldsChange={setLeadFields}
              />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
