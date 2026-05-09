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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[context-cron] Checking for tasks...");

    // 1. Find EXPIRED executions that are still 'collecting'
    const now = new Date().toISOString();
    const { data: expiredExecs, error: expiredError } = await supabase
      .from("context_executions")
      .select("id")
      .eq("status", "collecting")
      .lte("end_at", now);

    if (expiredError) throw expiredError;

    if (expiredExecs && expiredExecs.length > 0) {
      console.log(`[context-cron] Found ${expiredExecs.length} expired executions to compile.`);
      for (const exec of expiredExecs) {
        // Trigger compile-context for each
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/compile-context`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({ executionId: exec.id })
        }).catch(err => console.error(`[context-cron] Failed to trigger compile for ${exec.id}:`, err));
      }
    }

    // 2. Find SCHEDULED campaigns that should start now
    // We'll check for campaigns whose daily_time is within 5 minutes of current HH:mm
    const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const { data: dailyCampaigns, error: dailyError } = await supabase
      .from("context_campaigns")
      .select("*")
      .eq("trigger_type", "scheduled")
      .eq("is_active", true);

    if (dailyError) throw dailyError;

    for (const campaign of (dailyCampaigns || [])) {
      const config = campaign.trigger_config as any;
      const scheduledTime = config?.daily_time;
      
      if (scheduledTime === currentTime) {
        console.log(`[context-cron] Starting daily context for: ${campaign.name}`);
        
        // For daily context, we usually want the context of the LAST 24 HOURS
        const startAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const endAt = new Date().toISOString();

        const { data: execution, error: createError } = await supabase
          .from("context_executions")
          .insert({
            campaign_id: campaign.id,
            user_id: campaign.user_id,
            company_id: campaign.company_id,
            start_at: startAt,
            end_at: endAt,
            status: "collecting",
            trigger_message: `Daily Scheduled: ${currentTime}`
          })
          .select()
          .single();

        if (createError) {
          console.error(`[context-cron] Error creating daily execution:`, createError);
        } else {
          // Trigger compile immediately since start/end are already passed
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/compile-context`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({ executionId: execution.id })
          }).catch(err => console.error(`[context-cron] Failed to trigger compile for daily ${execution.id}:`, err));
        }
      }
    }

    return new Response(JSON.stringify({ success: true, processed: expiredExecs?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[context-cron] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
