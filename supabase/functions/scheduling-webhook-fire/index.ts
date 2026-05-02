// Scheduling webhook fan-out: POSTs a prepared payload to the configured
// per-calendar or global webhook URL. On failure, records into webhook_events
// for retries by the existing retry infrastructure.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { appointment_id, event_name, target_url, payload } = body ?? {};

    if (!appointment_id || !event_name || !target_url || !payload) {
      return new Response(
        JSON.stringify({ error: "appointment_id, event_name, target_url and payload are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let ok = false;
    let status = 0;
    let errorMsg: string | null = null;

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch(target_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      ok = res.ok;
      status = res.status;
      if (!ok) errorMsg = `HTTP ${status}`;
    } catch (err) {
      errorMsg = (err as Error).message;
    }

    await admin.from("scheduling_appointment_events").insert({
      appointment_id,
      event_type: "webhook_fired",
      payload: { event: event_name, target_url, ok, status, error: errorMsg },
    });

    return new Response(JSON.stringify({ ok, status, error: errorMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const e = err as Error;
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
