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

    // Auth client to validate user
    const authClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { instanceId, endpoint, method = "POST", body: requestBody } = await req.json();

    if (!instanceId || !endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: instanceId, endpoint" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch instance credentials using service role (bypasses RLS)
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

    // Verify ownership: check if user owns the instance or is a company member
    if (instance.user_id !== user.id) {
      // Check company membership
      const { data: membership } = await adminClient
        .from("company_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1);

      // Also check if instance belongs to any company the user is part of
      const { data: instanceCheck } = await adminClient
        .from("instances")
        .select("user_id")
        .eq("id", instanceId)
        .single();

      if (!membership || membership.length === 0) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: you do not have access to this instance" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!instance.external_instance_id || !instance.external_instance_token) {
      return new Response(
        JSON.stringify({ error: "Instance credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Z-API URL
    const zapiUrl = `https://api.z-api.io/instances/${instance.external_instance_id}/token/${instance.external_instance_token}${endpoint}`;

    // Make proxy request to Z-API
    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (method.toUpperCase() !== "GET" && requestBody) {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    const zapiResponse = await fetch(zapiUrl, fetchOptions);
    const zapiData = await zapiResponse.json();

    if (!zapiResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Z-API request failed",
          status: zapiResponse.status,
          details: zapiData,
        }),
        {
          status: zapiResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify(zapiData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const error = err as Error;
    console.error("zapi-proxy error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
