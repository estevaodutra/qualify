export async function triggerSystemWebhook(
  supabase: any,
  eventId: "instance.connected" | "instance.disconnected" | "instance.error",
  instance: {
    id: string;
    name: string;
    phone: string | null;
    provider: string;
    user_id: string | null;
  }
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

    // 1. Fetch user profile (using correct column: full_name)
    let userDetails: Record<string, any> | null = null;
    let actionUrl = "https://qualifys.app/instances";

    if (instance.user_id) {
      const { data: userData, error: userQueryError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", instance.user_id)
        .maybeSingle();

      if (userQueryError) {
        console.error("[system-webhook] Error fetching user profile:", userQueryError.message);
      }

      if (userData) {
        userDetails = {
          id: userData.id,
          name: userData.full_name,
          email: userData.email,
          phone: ""
        };

        // 2. Generate Supabase magic link redirecting to instances page
        if (userData.email) {
          try {
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
              type: "magiclink",
              email: userData.email,
              options: {
                redirectTo: "https://qualifys.app/instances"
              }
            });

            if (linkError) {
              console.error("[system-webhook] generateLink error:", linkError.message);
            }

            if (linkData?.properties?.action_link) {
              actionUrl = linkData.properties.action_link;
              if (actionUrl.includes("/verify?")) {
                actionUrl = actionUrl.replace("/verify?", "/auth/v1/verify?");
              }
            }
          } catch (linkErr: any) {
            console.error("[system-webhook] Failed to generate magic link:", linkErr.message);
          }
        }
      }
    }

    // 3. Format webhook payload
    const payload = {
      event: eventId,
      timestamp: new Date().toISOString(),
      data: {
        instance: {
          id: instance.id,
          name: instance.name,
          phone_number: instance.phone || "",
          status: eventId.split(".")[1],
          provider: instance.provider,
          action_url: actionUrl
        },
        user: userDetails
      }
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
        user_id: instance.user_id
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
        user_id: instance.user_id
      });
      throw fetchErr;
    }
  } catch (err: any) {
    console.error(`[system-webhook] Error triggering webhook for ${eventId}:`, err.message);
  }
}
