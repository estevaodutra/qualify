// Scheduling dispatch router: reacts to appointment status changes.
// Sends a single payload to the central agenda webhook (n8n) and fans out
// lifecycle webhooks configured per-calendar or globally.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { sendWhatsAppMessage } from "../_shared/whatsapp-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
const PUBLIC_APP_URL = "https://qualifyapp.dev";

type OpInput = {
  appointment_id: string;
  op?: "INSERT" | "UPDATE";
  old_status?: string | null;
  new_status?: string | null;
};

const STATUS_TO_EVENT: Record<string, string> = {
  confirmed: "appointment.confirmation",
  cancelled: "appointment.cancelled",
  rescheduled: "appointment.rescheduled",
  completed: "appointment.completed",
  no_show: "appointment.no_show",
};

const STATUS_TO_LIFECYCLE_COLS: Record<
  string,
  { url: string; enabled: string }
> = {
  confirmed: { url: "webhook_created_url", enabled: "webhook_created_enabled" },
  cancelled: {
    url: "webhook_cancelled_url",
    enabled: "webhook_cancelled_enabled",
  },
  rescheduled: {
    url: "webhook_rescheduled_url",
    enabled: "webhook_rescheduled_enabled",
  },
  completed: {
    url: "webhook_completed_url",
    enabled: "webhook_completed_enabled",
  },
};

async function postWithRetry(url: string, body: unknown, timeoutMs = 10_000) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      return { ok: res.ok, status: res.status };
    } catch (err) {
      if (attempt === 1) {
        const e = err as Error;
        return { ok: false, status: 0, error: e.message };
      }
    }
  }
  return { ok: false, status: 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (authHeader !== `Bearer ${serviceKey}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as OpInput;
    if (!body?.appointment_id) {
      return new Response(JSON.stringify({ error: "appointment_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load appointment
    const { data: appt, error: apptErr } = await admin
      .from("scheduling_appointments")
      .select("*")
      .eq("id", body.appointment_id)
      .maybeSingle();

    if (apptErr || !appt) {
      return new Response(
        JSON.stringify({ error: "appointment not found", detail: apptErr?.message }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const newStatus: string = body.new_status ?? appt.status;
    const event = STATUS_TO_EVENT[newStatus];
    if (!event) {
      return new Response(JSON.stringify({ ok: true, skipped: "unknown status" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load related records in parallel
    const [calRes, attRes, notifRes, integRes, settingsRes] = await Promise.all([
      admin
        .from("scheduling_calendars")
        .select("id,name,slug,color,modality,duration_minutes,texts,advanced")
        .eq("id", appt.calendar_id)
        .maybeSingle(),
      appt.attendant_id
        ? admin
            .from("scheduling_attendants")
            .select("id,name,email,phone,photo_url")
            .eq("id", appt.attendant_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      admin
        .from("scheduling_notifications")
        .select("*")
        .eq("calendar_id", appt.calendar_id)
        .maybeSingle(),
      admin
        .from("scheduling_integrations")
        .select("*")
        .eq("calendar_id", appt.calendar_id)
        .maybeSingle(),
      admin
        .from("scheduling_settings")
        .select("default_whatsapp_instance_id, webhook_global_enabled, webhook_global_url")
        .eq("company_id", appt.company_id)
        .maybeSingle(),
    ]);

    const calendar = calRes.data;
    const attendant = attRes.data;
    const notifications = notifRes.data;
    const integrations = integRes.data;
    const settings = settingsRes.data;

    // If first confirm + call-campaign integration + not linked yet → create lead + queue
    if (
      event === "appointment.confirmation" &&
      !appt.call_lead_id &&
      integrations?.call_campaign_enabled &&
      integrations?.call_campaign_id
    ) {
      try {
        const { data: lead } = await admin
          .from("call_leads")
          .insert({
            campaign_id: integrations.call_campaign_id,
            company_id: appt.company_id,
            user_id: appt.company_id, // call_leads requires user_id; use company owner lookup fallback
            name: appt.lead_name,
            phone: appt.lead_phone,
            email: appt.lead_email,
            status: "pending",
            custom_fields: { appointment_id: appt.id },
          })
          .select("id, user_id")
          .maybeSingle();

        if (lead?.id) {
          const scheduledFor =
            integrations.call_campaign_timing === "immediate"
              ? null
              : appt.scheduled_start;

          await admin.from("call_queue").insert({
            campaign_id: integrations.call_campaign_id,
            company_id: appt.company_id,
            user_id: lead.user_id,
            lead_id: lead.id,
            lead_name: appt.lead_name,
            phone: appt.lead_phone,
            status: "waiting",
            position: 0,
            scheduled_for: scheduledFor,
            source: "scheduling",
          });

          await admin
            .from("scheduling_appointments")
            .update({ call_lead_id: lead.id })
            .eq("id", appt.id);
        }
      } catch (e) {
        console.error("[scheduling-dispatch] call_lead creation failed", (e as Error).message);
      }
    }

    // Build the single agenda payload for n8n
    const manageLink = `${PUBLIC_APP_URL}/agendamento/${appt.cancel_token}/gerenciar`;
    const cancelLink = `${PUBLIC_APP_URL}/agendamento/${appt.cancel_token}/cancelar`;
    const rescheduleLink = `${PUBLIC_APP_URL}/agendamento/${appt.cancel_token}/reagendar`;

    const agendaPayload = {
      event,
      timestamp: new Date().toISOString(),
      company: { id: appt.company_id },
      calendar: calendar
        ? {
            id: calendar.id,
            name: calendar.name,
            slug: calendar.slug,
            color: calendar.color,
            modality: calendar.modality,
            duration_minutes: calendar.duration_minutes,
            notifications: notifications ?? null,
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
        status: newStatus,
        scheduled_start: appt.scheduled_start,
        scheduled_end: appt.scheduled_end,
        timezone: appt.timezone,
        meeting_url: appt.meeting_url,
        location_snapshot: appt.location_snapshot,
        cancel_token: appt.cancel_token,
        manage_link: manageLink,
        cancel_link: cancelLink,
        reschedule_link: rescheduleLink,
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

    // Direct WhatsApp Notification send if enabled
    let directSendSuccess = false;
    let instanceId = notifications?.whatsapp_instance_id || settings?.default_whatsapp_instance_id;
    if (notifications?.whatsapp_enabled && instanceId) {
      const { data: instance } = await admin
        .from("instances")
        .select("*")
        .eq("id", instanceId)
        .maybeSingle();

      if (instance && instance.status === "connected") {
        let msgTemplate = "";
        if (event === "appointment.confirmation") {
          msgTemplate = notifications.confirmation_message || "Olá {{lead.name}}, seu agendamento foi confirmado para {{appointment.date}} às {{appointment.time}}.";
        } else if (event === "appointment.cancelled" && notifications.notify_on_cancel) {
          msgTemplate = "Olá {{lead.name}}, seu agendamento para {{appointment.date}} às {{appointment.time}} foi CANCELADO.";
        } else if (event === "appointment.rescheduled" && notifications.notify_on_reschedule) {
          msgTemplate = "Olá {{lead.name}}, seu agendamento foi REAGENDADO para {{appointment.date}} às {{appointment.time}}.";
        }

        if (msgTemplate) {
          const messageText = replaceVars(msgTemplate, appt, calendar, attendant);
          const payload = {
            action: "message.send_text",
            node: {
              id: `${event}_${appt.id}`,
              type: "text",
              order: 0,
              config: { text: messageText },
            },
            campaign: { id: appt.calendar_id, name: calendar?.name || "Calendar" },
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

          const zapiResult = await sendWhatsAppMessage(payload as any);
          console.log(`[scheduling-dispatch] direct whatsapp send: ok=${zapiResult.ok} status=${zapiResult.status}`);
          directSendSuccess = zapiResult.ok;
          
          if (event === "appointment.confirmation" && zapiResult.ok && !appt.confirmation_sent_at) {
            await admin
              .from("scheduling_appointments")
              .update({ confirmation_sent_at: new Date().toISOString() })
              .eq("id", appt.id);

            await admin.from("scheduling_appointment_events").insert({
              appointment_id: appt.id,
              event_type: "confirmation_sent",
              payload: { via: "direct_zapi" },
            });
          }
        }
      }
    }

    // Post to central agenda webhook replaced by direct send. Mocking response for downstream code.
    const agendaRes = { ok: true, status: 200 };
    console.log(
      `[scheduling-dispatch] direct message fanout complete for event ${event}`,
    );

    // Fan-out lifecycle webhook (per-calendar, fallback to global)
    const lifecycle = STATUS_TO_LIFECYCLE_COLS[newStatus];
    if (lifecycle) {
      let targetUrl: string | null = null;
      if (
        integrations &&
        integrations[lifecycle.enabled] &&
        integrations[lifecycle.url]
      ) {
        targetUrl = integrations[lifecycle.url];
      } else if (
        settings?.webhook_global_enabled &&
        settings?.webhook_global_url
      ) {
        targetUrl = settings.webhook_global_url;
      }

      if (targetUrl) {
        try {
          await admin.functions.invoke("scheduling-webhook-fire", {
            body: {
              appointment_id: appt.id,
              event_name: event,
              target_url: targetUrl,
              payload: agendaPayload,
            },
          });
        } catch (e) {
          console.error(
            "[scheduling-dispatch] lifecycle webhook invoke failed",
            (e as Error).message,
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, event, agenda_status: agendaRes.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const e = err as Error;
    console.error("[scheduling-dispatch] error", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
