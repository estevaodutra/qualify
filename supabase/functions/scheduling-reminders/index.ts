// Scheduling reminders cron (runs every 5 min).
// Finds appointments in the 1d / 1h / 15m windows and posts the reminder
// event to the central agenda webhook (n8n).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { sendWhatsAppMessage } from "../_shared/whatsapp-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_APP_URL = "https://qualifyapp.dev";

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

const replaceVars = (text: string, appt: any, cal: any, attendant: any) => {
  if (!text) return "";
  let result = text;
  
  let dateStr = "";
  let timeStr = "";
  if (appt.scheduled_start) {
    try {
      const d = new Date(appt.scheduled_start);
      dateStr = d.toLocaleDateString("pt-BR", { timeZone: appt.timezone || "America/Sao_Paulo" });
      timeStr = d.toLocaleTimeString("pt-BR", { timeZone: appt.timezone || "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
    } catch {
      dateStr = appt.scheduled_start.split("T")[0];
      timeStr = appt.scheduled_start.split("T")[1]?.substring(0, 5) || "";
    }
  }

  const variables: Record<string, string> = {
    "lead.name": appt.lead_name || "",
    "lead.phone": appt.lead_phone || "",
    "lead.email": appt.lead_email || "",
    "appointment.date": dateStr,
    "appointment.time": timeStr,
    "appointment.meeting_url": appt.meeting_url || "",
    "calendar.name": cal?.name || "",
    "attendant.name": attendant?.name || "",
    nome: appt.lead_name || "",
    data: dateStr,
    hora: timeStr,
    link_gerenciar: `${PUBLIC_APP_URL}/agendamento/${appt.cancel_token}/gerenciar`,
    link_cancelar: `${PUBLIC_APP_URL}/agendamento/${appt.cancel_token}/cancelar`,
    link_reagendar: `${PUBLIC_APP_URL}/agendamento/${appt.cancel_token}/reagendar`,
  };

  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

      // Fetch required instances
      const instanceIds = [
        ...new Set([
          ...(settings.data ?? []).map((s: any) => s.default_whatsapp_instance_id),
          ...(notifs.data ?? []).map((n: any) => n.whatsapp_instance_id),
        ].filter(Boolean))
      ] as string[];

      const { data: instancesData } = instanceIds.length
        ? await admin.from("instances").select("*").in("id", instanceIds)
        : { data: [] as any[] };
      const instanceMap = new Map((instancesData ?? []).map((i: any) => [i.id, i]));

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

        const instanceId = notif.whatsapp_instance_id || settings?.default_whatsapp_instance_id;
        const instance = instanceId ? instanceMap.get(instanceId) : null;

        if (!instance || instance.status !== "connected") {
          console.warn(`[scheduling-reminders] Connected instance not found for appt ${appt.id}`);
          continue;
        }

        const messageText = replaceVars(notif[w.notifMsgCol] as string, appt, cal, attendant);

        const payload = {
          action: "message.send_text",
          node: {
            id: `reminder_${appt.id}_${w.key}`,
            type: "text",
            order: 0,
            config: { text: messageText },
          },
          campaign: { id: appt.calendar_id, name: cal?.name || "Calendar" },
          instance: {
            id: instance.id,
            name: instance.name,
            phone: instance.phone || "",
            provider: instance.provider,
            externalId: instance.external_instance_id,
            externalToken: instance.external_instance_token,
          },
          destination: {
            phone: appt.lead_phone,
            jid: `${appt.lead_phone.replace(/\D/g, "")}@s.whatsapp.net`,
            name: appt.lead_name || "",
          },
        };

        const result = await sendWhatsAppMessage(payload as any);
        if (result.ok) {
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
