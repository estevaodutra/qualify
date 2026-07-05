import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { fetchZApi } from "../_shared/n8n-router.ts";
import { triggerSystemWebhook } from "../_shared/system-webhook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { instanceId, method, phone } = await req.json();

    if (!instanceId || !method) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: instanceId, method" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch instance credentials
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: instance, error: instanceError } = await adminClient
      .from("instances")
      .select("id, name, phone, provider, status, user_id, external_instance_id, external_instance_token")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      return new Response(
        JSON.stringify({ error: "Instance not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check permissions
    if (instance.user_id !== user.id) {
      let hasAccess = false;
      const { data: membership } = await adminClient
        .from("company_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);

      if (membership && membership.length > 0) {
        hasAccess = true;
      } else {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("is_superadmin")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.is_superadmin) hasAccess = true;
      }

      if (!hasAccess) {
        return new Response(
          JSON.stringify({ error: "Unauthorized access to instance" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { external_instance_id: id, external_instance_token: token_val } = instance;
    const resolvedId = id || "";
    const resolvedToken = token_val || "";

    let zapiResponse;
    
    if (method === "disconnect") {
      console.log(`[connect-instance] Disconnecting session ${resolvedId}`);
      
      const { error: dbError } = await adminClient
        .from("instances")
        .update({
          status: "disconnected",
          external_instance_id: null,
          external_instance_token: null,
          phone: ""
        })
        .eq("id", instanceId);

      if (dbError) {
        console.error("[connect-instance] Failed to unlink instance in database:", dbError);
      } else {
        await triggerSystemWebhook(adminClient, "instance.disconnected", {
          id: instanceId,
          name: instance.name,
          phone: instance.phone,
          provider: instance.provider || "z-api",
          user_id: instance.user_id
        });
      }

      try {
        zapiResponse = await fetchZApi(
          resolvedId,
          resolvedToken,
          "/disconnect",
          "POST",
          null,
          {},
          instanceId
        );
      } catch (zapiErr: any) {
        console.error("Z-API disconnect request failed:", zapiErr);
        return new Response(
          JSON.stringify({ success: true, warning: "Z-API disconnect failed, but unlinked in database" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (method === "phone") {
      const cleanPhone = phone?.replace(/\D/g, "");
      console.log(`[connect-instance] Generating pairing code for ${cleanPhone}`);
      zapiResponse = await fetchZApi(
        resolvedId,
        resolvedToken,
        "/pairing-code",
        "POST",
        { phone: cleanPhone },
        {},
        instanceId
      );
    } else {
      console.log(`[connect-instance] Generating QR code image`);
      zapiResponse = await fetchZApi(
        resolvedId,
        resolvedToken,
        "/qr-code/image",
        "GET",
        null,
        {},
        instanceId
      );
    }

    const responseText = await zapiResponse.text();
    let data = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (e) {
      console.error("Failed to parse Z-API response as JSON:", responseText);
    }

    if (!zapiResponse.ok) {
      console.error(`[connect-instance] Z-API Error (HTTP ${zapiResponse.status}):`, data || responseText);
      if (method === "disconnect") {
        return new Response(
          JSON.stringify({ success: true, warning: "Provider session already stopped or disconnected" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Z-API request failed", details: data || responseText }),
        { status: zapiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("connect-instance error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
