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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      throw new Error("campaign_id is required");
    }

    // Check campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("group_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    // Get all groups
    const { data: groups, error: groupsError } = await supabase
      .from("campaign_groups")
      .select("group_jid")
      .eq("campaign_id", campaign_id);

    if (groupsError) {
      throw new Error(`Failed to fetch groups: ${groupsError.message}`);
    }

    if (!groups || groups.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0, message: "No groups found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete any pending updates for this campaign to avoid duplicates
    await supabase
      .from("campaign_group_updates")
      .delete()
      .eq("campaign_id", campaign_id)
      .eq("status", "pending");

    // Prepare inserts
    const now = new Date();
    const inserts = groups.map((group, index) => {
      // 3 minutes spacing = 3 * 60000 ms
      const processAfter = new Date(now.getTime() + index * 3 * 60000);
      return {
        campaign_id: campaign_id,
        group_jid: group.group_jid,
        status: "pending",
        process_after: processAfter.toISOString(),
      };
    });

    const { error: insertError } = await supabase
      .from("campaign_group_updates")
      .insert(inserts);

    if (insertError) {
      throw new Error(`Failed to schedule updates: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ success: true, count: inserts.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in schedule-group-updates:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
