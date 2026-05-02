// Scheduling reminders cron (runs every 5 min).
// Finds appointments in the 1d / 1h / 15m windows and posts the reminder
// event to the central agenda webhook (n8n).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AGENDA_WEBHOOK_URL = "https://n8n-n8n.nuwfic.easypanel.host/webhook/agenda";
const PUBLIC_APP_URL = "https://dispatchone.lovable.app";

type Window = {
  key: "1d" | "1h" | "15m";
  event: string;
  minutesFromNow: number;
  toleranceMin: number;
  sentCol: string;
  notifEnabledCol: string;
  notifMsgCol: string;
};

const WINDOWS: Window[] = [
  {
    key: "1d",
    event: "appointment.reminder_1d",
    minutesFromNow: 24 * 60,
    toleranceMin: 5,
    sentCol: "reminder_1d_sent_at",
    notifEnabledCol: "reminder_1day_enabled",
    notifMsgCol: "reminder_1day_message",
  },
  {
    key: "1h",
    event: "appointment.reminder_1h",
    minutesFromNow: 60,
    toleranceMin: 5,
    sentCol: "reminder_1h_sent_at",
    notifEnabledCol: "reminder_1hour_enabled",
    notifMsgCol: "reminder_1hour_message",
  },
  {
    key: "15m",
    event: "appointment.reminder_15m",
    minutesFromNow: 15,
    toleranceMin: 5,
    sentCol: "reminder_15m_sent_at",
    notifEnabledCol: "reminder_15min_enabled",
    notifMsgCol: "reminder_15min_message",
  },
];

async function postAgenda(payload: unknown) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(AGENDA_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok;
  } catch (err) {
    console.error("[scheduling-reminders] post failed", (err as Error).message);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: Record<string, number> = { "1d": 0, "1h": 0, "15m": 0 };

  for (const w of WINDOWS) {
    const target = new Date(Date.now() + w.minutesFromNow * 60_000);
    const windowStart = new Date(
      target.getTime() - w.toleranceMin * 60_000,
    ).toISOString();
    const windowEnd = new Date(
      target.getTime() + w.toleranceMin * 60_000,
    ).toISOString();

    // Paginate by id to avoid the 1000-row limit
    let lastId: string | null = null;
    while (true) {
      let q = admin
        .from("scheduling_appointments")
        .select("*")
        .eq("status", "confirmed")
        .is(w.sentCol, null)
        .gte("scheduled_start", windowStart)
        .lte("scheduled_start", windowEnd)
        .order("id", { ascending: true })
        .limit(500);

      if (lastId) q = q.gt("id", lastId);

      const { data: rows, error } = await q;
      if (error) {
        console.error("[scheduling-reminders] fetch error", error.message);
        break;
      }
      if (!rows || rows.length === 0) break;

      // Group by calendar to reuse notifications/settings
      const calIds = [...new Set(rows.map((r) => r.calendar_id))];
      const companyIds = [...new Set(rows.map((r) => r.company_id))];
      const attendantIds = [
        ...new Set(rows.map((r) => r.attendant_id).filter(Boolean)),
      ] as string[];

      const [cals, notifs, settings, attendants] = await Promise.all([
        admin
          .from("scheduling_calendars")
          .select("id,name,slug,color,modality,duration_minutes")
          .in("id", calIds),
        admin
          .from("scheduling_notifications")
          .select("*")
          .in("calendar_id", calIds),
        admin
          .from("scheduling_settings")
          .select("company_id, default_whatsapp_instance_id")
          .in("company_id", companyIds),
        attendantIds.length
          ? admin
              .from("scheduling_attendants")
              .select("id,name,email,phone")
              .in("id", attendantIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      const calMap = new Map((cals.data ?? []).map((c: any) => [c.id, c]));
      const notifMap = new Map(
        (notifs.data ?? []).map((n: any) => [n.calendar_id, n]),
      );
      const settingsMap = new Map(
        (settings.data ?? []).map((s: any) => [s.company_id, s]),
      );
      const attMap = new Map(
        (attendants.data ?? []).map((a: any) => [a.id, a]),
      );

      for (const appt of rows) {
        lastId = appt.id;
        const notif = notifMap.get(appt.calendar_id);
        // Skip if reminder toggle is off or whatsapp channel disabled
        if (!notif || !notif.whatsapp_enabled || !notif[w.notifEnabledCol]) {
          continue;
        }

        const cal = calMap.get(appt.calendar_id);
        const attendant = appt.attendant_id
          ? attMap.get(appt.attendant_id)
          : null;
        const settings = settingsMap.get(appt.company_id);

        const payload = {
          event: w.event,
          timestamp: new Date().toISOString(),
          company: { id: appt.company_id },
          calendar: cal
            ? {
                id: cal.id,
                name: cal.name,
                slug: cal.slug,
                color: cal.color,
                modality: cal.modality,
                duration_minutes: cal.duration_minutes,
                notifications: notif,
              }
            : null,
          attendant: attendant
            ? {
                id: attendant.id,
                name: attendant.name,
                email: attendant.email,
                phone: attendant.phone,
              }
            : null,
          lead: {
            name: appt.lead_name,
            phone: appt.lead_phone,
            email: appt.lead_email,
            custom_fields: appt.custom_fields ?? {},
            answers: appt.answers ?? {},
          },
          appointment: {
            id: appt.id,
            status: appt.status,
            scheduled_start: appt.scheduled_start,
            scheduled_end: appt.scheduled_end,
            timezone: appt.timezone,
            meeting_url: appt.meeting_url,
            location_snapshot: appt.location_snapshot,
            cancel_token: appt.cancel_token,
            manage_link: `${PUBLIC_APP_URL}/agendamento/${appt.cancel_token}/gerenciar`,
            cancel_link: `${PUBLIC_APP_URL}/agendamento/${appt.cancel_token}/cancelar`,
            reschedule_link: `${PUBLIC_APP_URL}/agendamento/${appt.cancel_token}/reagendar`,
          },
          instance_hint: settings?.default_whatsapp_instance_id
            ? { id: settings.default_whatsapp_instance_id }
            : null,
          utm: {
            source: appt.utm_source,
            medium: appt.utm_medium,
            campaign: appt.utm_campaign,
          },
        };

        const ok = await postAgenda(payload);
        if (ok) {
          await admin
            .from("scheduling_appointments")
            .update({ [w.sentCol]: new Date().toISOString() })
            .eq("id", appt.id);

          await admin.from("scheduling_appointment_events").insert({
            appointment_id: appt.id,
            event_type: "reminder_sent",
            payload: { kind: w.key },
          });

          results[w.key] += 1;
        }
      }

      if (rows.length < 500) break;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent: results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
