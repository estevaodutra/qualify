import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    const failedStatuses = [
      "no_answer",
      "busy",
      "failed",
      "voicemail",
      "timeout",
      "not_found",
      "cancelled",
    ];

    // Get failed call logs with campaign retry config
    const { data: failedCalls, error: fetchError } = await supabase
      .from("call_logs")
      .select(`
        id, campaign_id, lead_id, operator_id, user_id, call_status, company_id,
        attempt_number, max_attempts,
        call_campaigns(retry_count, retry_interval_minutes, retry_exceeded_behavior, retry_exceeded_action_id)
      `)
      .in("call_status", failedStatuses);

    if (fetchError) {
      throw new Error(`Error fetching failed calls: ${fetchError.message}`);
    }

    if (!failedCalls || failedCalls.length === 0) {
      return new Response(
        JSON.stringify({ message: "No failed calls to reschedule", rescheduled: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rescheduledCount = 0;
    let exceededCount = 0;
    const errors: string[] = [];

    for (const call of failedCalls) {
      try {
        // Check if there's already a scheduled call for this lead in this campaign
        const { data: existing } = await supabase
          .from("call_logs")
          .select("id")
          .eq("lead_id", call.lead_id)
          .eq("campaign_id", call.campaign_id)
          .eq("call_status", "scheduled")
          .limit(1);

        if (existing && existing.length > 0) {
          continue;
        }

        // Get campaign retry config
        const campaign = (call as any).call_campaigns;
        const retryCount = campaign?.retry_count ?? 3;
        const retryIntervalMinutes = campaign?.retry_interval_minutes ?? 30;
        const retryExceededBehavior = campaign?.retry_exceeded_behavior ?? "mark_failed";
        const retryExceededActionId = campaign?.retry_exceeded_action_id ?? null;

        const currentAttempt = (call as any).attempt_number ?? 1;
        const maxAttempts = (call as any).max_attempts ?? retryCount;

        // If retry_count is 0, no retries configured — mark as exceeded immediately
        if (retryCount === 0) {
          await supabase
            .from("call_logs")
            .update({ call_status: "max_attempts_exceeded" })
            .eq("id", call.id);

          if (call.lead_id) {
            await supabase
              .from("call_leads")
              .update({ status: "failed" })
              .eq("id", call.lead_id);
          }
          exceededCount++;
          continue;
        }

        if (currentAttempt < retryCount) {
          // Schedule next attempt using configured interval
          const nextRetryAt = new Date(Date.now() + retryIntervalMinutes * 60 * 1000);

          // Fetch active operators for round-robin
          const { data: activeOperators } = await supabase
            .from("call_operators")
            .select("id")
            .eq("user_id", call.user_id)
            .eq("is_active", true)
            .order("created_at", { ascending: true });

          let newOperatorId = call.operator_id;
          if (activeOperators && activeOperators.length > 0) {
            let minCount = Infinity;
            for (const op of activeOperators) {
              const { count } = await supabase
                .from("call_logs")
                .select("*", { count: "exact", head: true })
                .eq("operator_id", op.id)
                .eq("campaign_id", call.campaign_id);
              const c = count || 0;
              if (c < minCount) {
                minCount = c;
                newOperatorId = op.id;
              }
            }
          }

          // Create new scheduled call log for next attempt
          const { error: insertError } = await supabase
            .from("call_logs")
            .insert({
              campaign_id: call.campaign_id,
              lead_id: call.lead_id,
              operator_id: newOperatorId,
              user_id: call.user_id,
              company_id: (call as any).company_id || null,
              call_status: "scheduled",
              scheduled_for: nextRetryAt.toISOString(),
              attempt_number: currentAttempt + 1,
              max_attempts: retryCount,
              next_retry_at: nextRetryAt.toISOString(),
            });

          if (insertError) {
            errors.push(`Lead ${call.lead_id}: ${insertError.message}`);
            continue;
          }

          // Update lead status to pending for next attempt
          if (call.lead_id) {
            await supabase
              .from("call_leads")
              .update({ status: "scheduled", assigned_operator_id: newOperatorId })
              .eq("id", call.lead_id);
          }

          // Mark original call as rescheduled
          await supabase
            .from("call_logs")
            .update({ call_status: `${call.call_status}_rescheduled` })
            .eq("id", call.id);

          rescheduledCount++;
        } else {
          // Exceeded retry limit
          console.log(`Lead ${call.lead_id}: max attempts reached (${currentAttempt}/${retryCount})`);

          await supabase
            .from("call_logs")
            .update({ call_status: "max_attempts_exceeded" })
            .eq("id", call.id);

          if (call.lead_id) {
            await supabase
              .from("call_leads")
              .update({ status: "failed" })
              .eq("id", call.lead_id);
          }

          // Execute action if configured
          if (retryExceededBehavior === "execute_action" && retryExceededActionId) {
            console.log(`Lead ${call.lead_id}: executing exceeded action ${retryExceededActionId}`);
            // Invoke execute-action edge function (fire and forget)
            try {
              await supabase.functions.invoke("execute-call-action", {
                body: {
                  action_id: retryExceededActionId,
                  lead_id: call.lead_id,
                  campaign_id: call.campaign_id,
                },
              });
            } catch (e) {
              console.error(`Failed to invoke execute-message for lead ${call.lead_id}:`, e);
            }
          }

          exceededCount++;
        }
      } catch (e) {
        errors.push(`Call ${call.id}: ${(e as Error).message}`);
      }
    }

    const result = {
      message: `Rescheduled ${rescheduledCount} calls, ${exceededCount} exceeded limit`,
      rescheduled: rescheduledCount,
      exceeded: exceededCount,
      total_failed: failedCalls.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Reschedule error:", (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
