import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    // Get due tasks
    const { data: tasks, error: fetchError } = await supabase
      .from("campaign_group_updates")
      .select("*")
      .eq("status", "pending")
      .lte("process_after", new Date().toISOString())
      .order("process_after", { ascending: true })
      .limit(10); // Process up to 10 at a time to stay under 2 mins

    if (fetchError) {
      throw new Error(`Failed to fetch tasks: ${fetchError.message}`);
    }

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "No pending tasks" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const processedIds: string[] = [];
    const failedIds: string[] = [];

    for (const task of tasks) {
      try {
        // Mark as processing
        await supabase
          .from("campaign_group_updates")
          .update({ status: "processing" })
          .eq("id", task.id);

        // Fetch campaign details
        const { data: campaign, error: campaignError } = await supabase
          .from("group_campaigns")
          .select("*")
          .eq("id", task.campaign_id)
          .single();

        if (campaignError || !campaign) throw new Error("Campaign not found");
        if (!campaign.instance_id) throw new Error("Campaign has no default instance_id");

        // Fetch instance credentials
        const { data: instance, error: instanceError } = await supabase
          .from("instances")
          .select("external_instance_id, external_instance_token")
          .eq("id", campaign.instance_id)
          .single();

        if (instanceError || !instance) throw new Error("Instance not found");

        const extId = instance.external_instance_id;
        const extToken = instance.external_instance_token;
        const jid = task.group_jid;

        // Perform updates
        if (campaign.group_name) {
          await fetchZApi(extId, extToken, "/update-group-name", "POST", {
            phone: jid,
            groupName: campaign.group_name,
          }, { "Client-Token": Deno.env.get("CLIENT_TOKEN") || "" });
        }

        if (campaign.group_description) {
          await fetchZApi(extId, extToken, "/update-group-description", "POST", {
            phone: jid,
            description: campaign.group_description,
          }, { "Client-Token": Deno.env.get("CLIENT_TOKEN") || "" });
        }

        if (campaign.group_photo_url) {
          await fetchZApi(extId, extToken, "/update-group-photo", "POST", {
            phone: jid,
            image: campaign.group_photo_url,
          }, { "Client-Token": Deno.env.get("CLIENT_TOKEN") || "" });
        }

        if (campaign.edit_permission) {
          await fetchZApi(extId, extToken, "/update-group-settings", "POST", {
            phone: jid,
            action: campaign.edit_permission === "admins" ? "locked" : "unlocked",
          }, { "Client-Token": Deno.env.get("CLIENT_TOKEN") || "" });
        }

        if (campaign.message_permission) {
          await fetchZApi(extId, extToken, "/update-group-settings", "POST", {
            phone: jid,
            action: campaign.message_permission === "admins" ? "announcement" : "not_announcement",
          }, { "Client-Token": Deno.env.get("CLIENT_TOKEN") || "" });
        }

        // Complete task
        await supabase
          .from("campaign_group_updates")
          .update({ status: "success" })
          .eq("id", task.id);

        processedIds.push(task.id);
      } catch (err: any) {
        console.error(`Error processing task ${task.id}:`, err);
        await supabase
          .from("campaign_group_updates")
          .update({ status: "failed", error_message: err.message || "Unknown error" })
          .eq("id", task.id);
        failedIds.push(task.id);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: processedIds.length, failed: failedIds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in process-group-updates:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
