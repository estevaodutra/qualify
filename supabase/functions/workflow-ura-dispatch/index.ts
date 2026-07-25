import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MOS_BASE = "https://plataforma.mosbr.io/api/v2";

function mosBasicAuth(): string {
  const user = Deno.env.get("MOS_BR_USER") ?? "";
  const pass = Deno.env.get("MOS_BR_PASS") ?? "";
  if (!user || !pass) throw new Error("MOS_BR_USER or MOS_BR_PASS not configured.");
  return "Basic " + btoa(user + ":" + pass);
}

async function dispatchSingleTask(supabase: any, task: any, supabaseUrl: string, supabaseServiceKey: string) {
  console.log(`[URA Dispatch] Dispatching task ${task.id} for phone ${task.phone}`);
  
  try {
    // 1. Validate wallet balance (minimum R$ 10.00)
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance, reserved_balance")
      .eq("company_id", task.company_id)
      .maybeSingle();

    const available = (wallet?.balance ?? 0) - (wallet?.reserved_balance ?? 0);
    if (available < 10.00) {
      console.warn(`[URA Dispatch] Insufficient balance for company ${task.company_id}: ${available}`);
      
      // Update task status to failed
      await supabase
        .from("workflow_ura_tasks")
        .update({
          status: "failed",
          cause_name: "Saldo insuficiente (Mínimo R$ 10,00)",
          completed_at: new Date().toISOString()
        })
        .eq("id", task.id);

      // Resume workflow execution with "error" outcome
      await fetch(`${supabaseUrl}/functions/v1/execute-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          campaignId: task.workflow_id,
          sequenceId: task.workflow_id,
          triggerContext: {
            leadId: task.lead_id,
            respondentPhone: task.phone,
            uraResult: "error",
            companyId: task.company_id,
          }
        })
      });
      return { success: false, reason: "Insufficient balance" };
    }

    // 2. Fetch the node configuration to get mosCampaignId
    const { data: nodeData, error: nodeErr } = await supabase
      .from("sequence_nodes")
      .select("config")
      .eq("id", task.node_id)
      .single();

    if (nodeErr || !nodeData) {
      throw new Error(`Failed to fetch node configuration: ${nodeErr?.message || "Not found"}`);
    }

    let mosCampaignId = nodeData.config?.mosCampaignId;

    // 3. Dynamically create campaign on MOS BR if not present
    if (!mosCampaignId) {
      console.log(`[URA Dispatch] Campaign not found on MOS BR for URA node ${task.node_id}. Creating...`);
      
      const payload = { name: `Qualify URA Node - ${task.node_id}` };
      const mosRes = await fetch(`${MOS_BASE}/tvoz/campaigns/`, {
        method: "POST",
        headers: {
          Authorization: mosBasicAuth(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!mosRes.ok) {
        const errText = await mosRes.text();
        throw new Error(`MOS BR campaign creation failed: ${errText}`);
      }

      const mosData = await mosRes.json();
      mosCampaignId = mosData?.id;

      if (mosCampaignId) {
        const newConfig = { ...nodeData.config, mosCampaignId };
        await supabase
          .from("sequence_nodes")
          .update({ config: newConfig })
          .eq("id", task.node_id);
      } else {
        throw new Error("MOS BR campaign creation returned no ID.");
      }
    }

    // 4. Dispatch the call via MOS BR
    const payload = {
      sendTvozMultiRequest: {
        campaignId: mosCampaignId,
        defaultValues: {
          audio: task.audio_value,
        },
        sendTvozRequestList: [
          {
            to: task.phone,
            id: task.id,
          }
        ]
      }
    };

    const mosCallRes = await fetch(`${MOS_BASE}/tvoz/multi/`, {
      method: "POST",
      headers: {
        Authorization: mosBasicAuth(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!mosCallRes.ok) {
      const errText = await mosCallRes.text();
      throw new Error(`MOS BR dispatch failed: ${errText}`);
    }

    // 5. Update task state
    await supabase
      .from("workflow_ura_tasks")
      .update({
        status: "calling",
        mos_campaign_id: mosCampaignId,
        attempt_count: (task.attempt_count || 0) + 1,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", task.id);

    console.log(`[URA Dispatch] Task ${task.id} successfully calling.`);
    return { success: true };

  } catch (err: any) {
    console.error(`[URA Dispatch] Error dispatching task ${task.id}:`, err.message);
    
    // Update task with error details
    await supabase
      .from("workflow_ura_tasks")
      .update({
        status: "failed",
        cause_name: err.message,
        completed_at: new Date().toISOString()
      })
      .eq("id", task.id);
      
    return { success: false, error: err.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let taskId = null;
    try {
      const body = await req.json();
      taskId = body?.taskId;
    } catch {
      // Empty body is expected for cron executions
    }

    // ── CASE 1: Single Task Dispatch ──────────────────────────────────────
    if (taskId) {
      const { data: task, error: taskErr } = await supabase
        .from("workflow_ura_tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskErr || !task) {
        return new Response(JSON.stringify({ error: `Task not found: ${taskErr?.message}` }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await dispatchSingleTask(supabase, task, supabaseUrl, supabaseServiceKey);
      return new Response(JSON.stringify(res), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── CASE 2: Cron Mode (Scheduled Retries Processing) ──────────────────
    console.log("[URA Dispatch] Running in Cron Mode (Retries Processing)...");
    const { data: retryTasks, error: fetchErr } = await supabase
      .from("workflow_ura_tasks")
      .select("*")
      .eq("status", "retry_scheduled")
      .lte("next_attempt_at", new Date().toISOString());

    if (fetchErr) {
      throw new Error(`Failed to fetch retry tasks: ${fetchErr.message}`);
    }

    if (!retryTasks || retryTasks.length === 0) {
      return new Response(JSON.stringify({ message: "No retry tasks due." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[URA Dispatch] Found ${retryTasks.length} task(s) to retry.`);
    let successCount = 0;
    let failCount = 0;

    for (const task of retryTasks) {
      const res = await dispatchSingleTask(supabase, task, supabaseUrl, supabaseServiceKey);
      if (res.success) successCount++;
      else failCount++;
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${retryTasks.length} retries. Success: ${successCount}, Failures: ${failCount}`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[URA Dispatch] Uncaught error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
