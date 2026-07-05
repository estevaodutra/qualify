export async function triggerSystemWebhook(
  supabase: any,
  eventId: "instance.connected" | "instance.disconnected" | "instance.error",
  data: Record<string, any>
) {
  try {
    const { data: settings, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "system_webhooks")
      .maybeSingle();

    if (error || !settings?.value) {
      console.log(`[system-webhook] No system webhook configuration found.`);
      return;
    }

    const config = settings.value as {
      globalUrl?: string;
      events?: Record<string, { isActive: boolean; customUrl: string }>;
    };

    const eventConfig = config.events?.[eventId];
    if (eventConfig && !eventConfig.isActive) {
      console.log(`[system-webhook] Event ${eventId} is disabled.`);
      return;
    }

    const url = eventConfig?.customUrl || config.globalUrl;
    if (!url) {
      console.log(`[system-webhook] No URL configured for ${eventId}.`);
      return;
    }

    const payload = {
      event: eventId,
      timestamp: new Date().toISOString(),
      data: data
    };

    console.log(`[system-webhook] Dispatching event ${eventId} to URL: ${url}`);
    
    let responseText = "";
    let responseStatus = 0;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      responseStatus = response.status;
      responseText = await response.text();
      console.log(`[system-webhook] Response status: ${responseStatus}`);
      
      // Log success/HTTP outcome to api_logs
      await supabase.from("api_logs").insert({
        method: "POST",
        endpoint: `system-webhook:${eventId}`,
        status_code: responseStatus,
        request_body: payload,
        response_body: { status: responseStatus, url, response: responseText },
        user_id: data.user?.id || null
      });
    } catch (fetchErr: any) {
      console.error(`[system-webhook] Fetch failed:`, fetchErr.message);
      
      // Log network/fetch failure to api_logs
      await supabase.from("api_logs").insert({
        method: "POST",
        endpoint: `system-webhook:${eventId}`,
        status_code: 599, // Custom code for network/DNS failures
        request_body: payload,
        error_message: fetchErr.message,
        response_body: { error: fetchErr.message, url },
        user_id: data.user?.id || null
      });
      throw fetchErr;
    }
  } catch (err: any) {
    console.error(`[system-webhook] Error triggering webhook for ${eventId}:`, err.message);
  }
}
