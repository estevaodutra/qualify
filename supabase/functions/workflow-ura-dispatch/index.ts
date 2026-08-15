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

    // 2. Fetch the node configuration and user's webhook config
    const { data: nodeData, error: nodeErr } = await supabase
      .from("sequence_nodes")
      .select("config")
      .eq("id", task.node_id)
      .single();

    if (nodeErr || !nodeData) {
      throw new Error(`Failed to fetch node configuration: ${nodeErr?.message || "Not found"}`);
    }

    // Fetch webhook config for category = 'ura'
    const { data: webConfig } = await supabase
      .from("webhook_configs")
      .select("url, is_active")
      .eq("user_id", task.user_id)
      .eq("category", "ura")
      .maybeSingle();

    const n8nWebhookUrl = (webConfig?.is_active && webConfig?.url) 
      ? webConfig.url 
      : "https://n8n.d2x.site/webhook/ura";

    // 3. Fetch lead details
    const { data: lead } = await supabase
      .from("leads")
      .select("name")
      .eq("id", task.lead_id)
      .maybeSingle();

    // 4. Send dispatch payload to n8n webhook
    const dispatchPayload = {
      taskId: task.id,
      companyId: task.company_id,
      userId: task.user_id,
      workflowId: task.workflow_id,
      workflowExecutionId: task.workflow_execution_id,
      nodeId: task.node_id,
      phone: task.phone,
      mosCampaignId: task.mos_campaign_id || nodeData.config?.mos?.mosCampaignId || null,
      mosUraId: task.mos_ura_id || nodeData.config?.mos?.mosUraId || null,
      mosIdType: task.mos_id_type || nodeData.config?.mos?.idType || "campaign",
      lead: {
        id: task.lead_id,
        name: lead?.name || "",
        phone: task.phone,
      },
      audio: {
        type: task.audio_type || nodeData.config?.audio?.type || "tts",
        value: task.audio_value || nodeData.config?.audio?.value || "",
        voice: nodeData.config?.audio?.voice || "pt-BR",
        mosAudioName: nodeData.config?.audio?.mosAudioName || "",
      },
      dtmf: {
        actions: task.dtmf_actions || [],
      },
      attempts: {
        attemptCount: (task.attempt_count || 0) + 1,
        maxAttempts: task.max_attempts || 2,
        retryDelayMs: nodeData.config?.attempts?.retryDelayMs || 3600000,
        retryOn: nodeData.config?.attempts?.retryOn || ["no_answer", "busy", "failed"],
      }
    };

    console.log(`[URA Dispatch] Sending dispatch to n8n Webhook: ${n8nWebhookUrl}`);
    const n8nRes = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dispatchPayload),
    });

    if (!n8nRes.ok) {
      const errText = await n8nRes.text();
      throw new Error(`n8n webhook dispatch failed: ${errText}`);
    }

    // 5. Update task state
    await supabase
      .from("workflow_ura_tasks")
      .update({
        status: "calling",
        attempt_count: (task.attempt_count || 0) + 1,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", task.id);

    console.log(`[URA Dispatch] Task ${task.id} successfully dispatched to n8n.`);
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
