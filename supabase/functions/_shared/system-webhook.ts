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
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    console.log(`[system-webhook] Response status: ${response.status}`);
  } catch (err: any) {
    console.error(`[system-webhook] Error triggering webhook for ${eventId}:`, err.message);
  }
}
