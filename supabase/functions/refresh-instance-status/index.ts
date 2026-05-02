import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK_URL = "https://n8n-n8n.nuwfic.easypanel.host/webhook/status_instances";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all instances that have external credentials
    const { data: instances, error: fetchError } = await supabase
      .from("instances")
      .select("id, name, phone, status, provider, external_instance_id, external_instance_token, user_id")
      .not("external_instance_id", "is", null)
      .not("external_instance_token", "is", null);

    if (fetchError) {
      console.error("Error fetching instances:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch instances" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!instances || instances.length === 0) {
      console.log("No instances with external credentials found");
      return new Response(
        JSON.stringify({ success: true, message: "No instances to refresh", updated: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${instances.length} instances to refresh`);

    // Build payload for webhook
    const payload = instances.map((inst) => ({
      id: inst.external_instance_id,
      token: inst.external_instance_token,
    }));

    // Call the n8n webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error("Webhook error:", webhookResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Webhook returned ${webhookResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await webhookResponse.json();

    if (!Array.isArray(results)) {
      console.error("Webhook response is not an array:", results);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid webhook response format" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Webhook returned ${results.length} results`);

    let updatedCount = 0;

    for (const result of results) {
      if (!result.id) continue;

      // Match by external instance ID
      const instance = instances.find((i) => i.external_instance_id === result.id);
      if (!instance) continue;

      const newStatus = result.connected ? "connected" : "disconnected";
      const previousStatus = instance.status;

      const updates: Record<string, any> = {};

      if (newStatus !== previousStatus) {
        updates.status = newStatus;
      }
      if (result.paymentStatus) {
        updates.payment_status = result.paymentStatus;
      }
      if (result.due) {
        updates.expiration_date = new Date(result.due).toISOString();
      }

      if (Object.keys(updates).length === 0) continue;

      const { error: updateError } = await supabase
        .from("instances")
        .update(updates)
        .eq("id", instance.id);

      if (updateError) {
        console.error(`Error updating instance ${instance.id}:`, updateError);
        continue;
      }

      updatedCount++;
      console.log(`Instance ${instance.id} updated: ${previousStatus} -> ${newStatus}`);

      // Auto-register phone number when instance becomes connected
      if (newStatus === "connected" && previousStatus !== "connected") {
        try {
          const { data: existingNumber } = await supabase
            .from("phone_numbers")
            .select("id")
            .eq("number", instance.phone)
            .eq("user_id", instance.user_id)
            .maybeSingle();

          if (existingNumber) {
            await supabase
              .from("phone_numbers")
              .update({ connected: true, status: "active", instance_id: instance.id, health: 100 })
              .eq("id", existingNumber.id);
          } else if (instance.phone) {
            await supabase.from("phone_numbers").insert({
              user_id: instance.user_id,
              instance_id: instance.id,
              number: instance.phone,
              type: "whatsapp_normal",
              provider: instance.provider,
              status: "active",
              connected: true,
              health: 100,
            });
          }
        } catch (phoneErr) {
          console.error("Error in phone auto-registration:", phoneErr);
        }
      }

      // Disconnect phone numbers when instance disconnects
      if (newStatus === "disconnected" && previousStatus === "connected") {
        try {
          await supabase
            .from("phone_numbers")
            .update({ connected: false, status: "paused" })
            .eq("instance_id", instance.id);
        } catch (phoneErr) {
          console.error("Error updating phone status:", phoneErr);
        }
      }
    }

    console.log(`Refresh complete. Updated ${updatedCount} of ${instances.length} instances`);

    return new Response(
      JSON.stringify({ success: true, total: instances.length, updated: updatedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in refresh-instance-status:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
