import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { group_campaign_id, webhook_url, status_filter, scheduled } = body;

    // If called by cron, process all due schedules
    if (scheduled) {
      const { data: dueSchedules, error: schedErr } = await supabase
        .from("member_export_schedules")
        .select("*")
        .eq("is_active", true)
        .not("next_run_at", "is", null)
        .lte("next_run_at", new Date().toISOString());

      if (schedErr) throw schedErr;

      const results = [];
      for (const schedule of dueSchedules || []) {
        try {
          const res = await exportMembers(
            supabase,
            schedule.group_campaign_id,
            schedule.webhook_url,
            schedule.status_filter || ["active"]
          );
          
          // Calculate next_run_at
          let nextRun: string | null = null;
          const now = new Date();
          if (schedule.schedule_type === "daily") {
            const [h, m] = (schedule.schedule_time || "08:00").split(":").map(Number);
            const next = new Date(now);
            next.setDate(next.getDate() + 1);
            next.setHours(h, m, 0, 0);
            nextRun = next.toISOString();
          } else if (schedule.schedule_type === "weekly") {
            const [h, m] = (schedule.schedule_time || "08:00").split(":").map(Number);
            const next = new Date(now);
            next.setDate(next.getDate() + 7);
            next.setHours(h, m, 0, 0);
            nextRun = next.toISOString();
          }
          // 'once' → deactivate

          await supabase
            .from("member_export_schedules")
            .update({
              last_run_at: now.toISOString(),
              next_run_at: nextRun,
              is_active: schedule.schedule_type !== "once",
            })
            .eq("id", schedule.id);

          results.push({ id: schedule.id, status: "ok", total: res.total });
        } catch (err) {
          results.push({ id: schedule.id, status: "error", error: (err as Error).message });
        }
      }

      return new Response(JSON.stringify({ processed: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct export
    if (!group_campaign_id || !webhook_url) {
      return new Response(
        JSON.stringify({ error: "group_campaign_id and webhook_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await exportMembers(
      supabase,
      group_campaign_id,
      webhook_url,
      status_filter || ["active"]
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function exportMembers(
  supabase: any,
  groupCampaignId: string,
  webhookUrl: string,
  statusFilter: string[]
) {
  // Fetch members with pagination
  const allMembers: any[] = [];
  let lastId = "";
  const batchSize = 200;

  while (true) {
    let query = supabase
      .from("group_members")
      .select("phone, name, status, is_admin, joined_at, strikes")
      .eq("group_campaign_id", groupCampaignId)
      .order("id", { ascending: true })
      .limit(batchSize);

    if (!statusFilter.includes("all")) {
      query = query.in("status", statusFilter);
    }

    if (lastId) {
      query = query.gt("id", lastId);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    allMembers.push(...data);
    // For keyset pagination we need the id, fetch it separately
    // Actually we need id in select for pagination
    break; // Fallback: single fetch since we don't select id
  }

  // Re-fetch with id for proper pagination
  const members: any[] = [];
  lastId = "";

  while (true) {
    let query = supabase
      .from("group_members")
      .select("id, phone, name, status, is_admin, joined_at, strikes")
      .eq("group_campaign_id", groupCampaignId)
      .order("id", { ascending: true })
      .limit(batchSize);

    if (!statusFilter.includes("all")) {
      query = query.in("status", statusFilter);
    }

    if (lastId) {
      query = query.gt("id", lastId);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    members.push(...data);
    lastId = data[data.length - 1].id;
    if (data.length < batchSize) break;
  }

  const payload = {
    action: "members.export",
    campaign_id: groupCampaignId,
    exported_at: new Date().toISOString(),
    total: members.length,
    members: members.map(({ id, ...rest }) => rest),
  };

  // Send to webhook
  const webhookResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!webhookResponse.ok) {
    throw new Error(`Webhook returned ${webhookResponse.status}: ${await webhookResponse.text()}`);
  }

  return { success: true, total: members.length };
}
