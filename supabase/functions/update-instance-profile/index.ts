import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { fetchZApi } from "../_shared/n8n-router.ts";

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { instanceId } = await req.json();

    if (!instanceId) {
      return new Response(JSON.stringify({ error: "Instance ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get Instance Details
    const { data: instance, error: instanceError } = await supabase
      .from("instances")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ error: "Instance not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!instance.profile_config) {
      return new Response(JSON.stringify({ success: true, message: "No profile config" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = instance.profile_config as any;

    if (!config.autoUpdate) {
      return new Response(JSON.stringify({ success: true, message: "Auto update disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    // Update Profile Name
    if (config.name) {
      const res = await fetchZApi(instance, "/profile-name", "PUT", { value: config.name });
      results.push({ action: "name", success: res.ok, data: await res.text().catch(() => null) });
    }

    // Update Profile Status (About)
    if (config.status) {
      const res = await fetchZApi(instance, "/profile-status", "PUT", { value: config.status });
      results.push({ action: "status", success: res.ok, data: await res.text().catch(() => null) });
    }

    // Update Profile Picture
    if (config.photoUrl) {
      const res = await fetchZApi(instance, "/profile-picture", "PUT", { image: config.photoUrl });
      results.push({ action: "picture", success: res.ok, data: await res.text().catch(() => null) });
    }

    // Update Business Profile
    if (config.isBusiness) {
      const businessPayload: any = {};
      if (config.businessEmail) businessPayload.email = config.businessEmail;
      if (config.businessDescription) businessPayload.description = config.businessDescription;
      if (config.businessCategory) businessPayload.categories = [{ id: "custom", name: config.businessCategory }];
      if (config.businessAddress) businessPayload.address = config.businessAddress;
      if (config.businessWebsite) businessPayload.websites = [config.businessWebsite];

      if (Object.keys(businessPayload).length > 0) {
        const res = await fetchZApi(instance, "/business-profile", "PUT", businessPayload);
        results.push({ action: "business", success: res.ok, data: await res.text().catch(() => null) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
