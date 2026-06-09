import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: instances, error: fetchError } = await supabase
      .from("instances")
      .select("*")
      .eq("status", "connected");

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500, headers: corsHeaders });
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/webhook-inbound`;
    const results = [];

    const clientToken = Deno.env.get("CLIENT_TOKEN");
    const authorization = Deno.env.get("AUTHORIZATION");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (clientToken) headers["Client-Token"] = clientToken;
    if (authorization) headers["Authorization"] = authorization;

    for (const inst of (instances || [])) {
      const { external_instance_id: id, external_instance_token: token } = inst;
      if (!id || !token) continue;

      const url = `https://api.z-api.io/instances/${id}/token/${token}/update-every-webhooks`;
      try {
        const response = await fetch(url, {
          method: "PUT",
          headers,
          body: JSON.stringify({ value: webhookUrl }),
        });
        const respText = await response.text();
        results.push({
          instance: inst.name,
          id,
          status: response.status,
          response: respText,
        });
      } catch (err) {
        results.push({
          instance: inst.name,
          id,
          error: err.message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
