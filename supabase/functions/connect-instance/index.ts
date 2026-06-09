import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
      .select("external_instance_id, external_instance_token, user_id")
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
      const { data: membership } = await adminClient
        .from("company_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);

      if (!membership || membership.length === 0) {
        return new Response(
          JSON.stringify({ error: "Unauthorized access to instance" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { external_instance_id: id, external_instance_token: token_val } = instance;
    if (!id || !token_val) {
      return new Response(
        JSON.stringify({ error: "Instance credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseUrl = `https://api.z-api.io/instances/${id}/token/${token_val}`;
    let zapiResponse;
    
    if (method === "phone") {
      const cleanPhone = phone?.replace(/\D/g, "");
      console.log(`[connect-instance] Generating pairing code for ${cleanPhone}`);
      zapiResponse = await fetch(`${baseUrl}/pairing-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone })
      });
    } else {
      console.log(`[connect-instance] Generating QR code image`);
      zapiResponse = await fetch(`${baseUrl}/qr-code/image`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
    }

    const data = await zapiResponse.json();

    if (!zapiResponse.ok) {
      console.error(`[connect-instance] Z-API Error (HTTP ${zapiResponse.status}):`, data);
      return new Response(
        JSON.stringify({ error: "Z-API request failed", details: data }),
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
