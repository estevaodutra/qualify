import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload = await req.json();
    console.log("[URA Callback] Received callback payload:", JSON.stringify(payload));

    const callback = payload.callbackTvozRequest ?? payload.callbackTvozShippingLotEvent;
    
    // Support both standard MOS BR structure and simplified n8n fields
    const callbackId = callback?.id || callback?.externalId || callback?.request_id || payload.taskId || payload.callbackId;
    const mosCampaignId = callback?.campaignId || payload.campaignId || null;
    const dtmf = callback?.dtmf ?? payload.dtmfPressed ?? payload.dtmf ?? null;
    const phone = callback?.number ?? payload.phone ?? null;
    const mosStatus = String(callback?.statusNome ?? callback?.status ?? payload.status ?? "").toUpperCase();
    const durationSeconds = Number(callback?.duration ?? callback?.duracao ?? payload.durationSeconds ?? payload.duration ?? 0);
    const causeName = callback?.cause ?? callback?.causa ?? callback?.statusNome ?? payload.causeName ?? payload.cause ?? "Desconectado";

    // Audit log insertion
    await supabase.from("mos_callbacks").insert({
      mos_campaign_id: mosCampaignId,
      dtmf,
      phone,
      status: mosStatus,
      raw_payload: payload,
    });

    // 1. Locate the task
    let task = null;
    if (callbackId) {
      const { data } = await supabase
        .from("workflow_ura_tasks")
        .select("*")
        .eq("id", callbackId)
        .maybeSingle();
      task = data;
    }

    if (!task && phone && mosCampaignId) {
      const cleanPhone = phone.replace(/\D/g, "");
      const { data } = await supabase
        .from("workflow_ura_tasks")
        .select("*")
        .eq("phone", cleanPhone)
        .or(`mos_campaign_id.eq.${mosCampaignId},mos_ura_id.eq.${mosCampaignId}`)
        .in("status", ["calling", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      task = data;
    }

    if (!task) {
      console.warn(`[URA Callback] Task not found for callback ID: ${callbackId}, phone: ${phone}, campaign: ${mosCampaignId}`);
      return new Response(JSON.stringify({ error: "Task not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[URA Callback] Found task ${task.id} for lead ${task.lead_id}`);

    // 2. Map status outcomes
    let finalStatus = "failed";
    let workflowOutcome = "failed";

    if (["ANSWERED", "SUCCESS", "COMPLETED", "CONCLUIDO", "ATENDIDO"].some(s => mosStatus.includes(s))) {
      finalStatus = "completed";
      workflowOutcome = dtmf && dtmf.trim().length > 0 ? dtmf.trim() : "no_digit";
    } else if (["BUSY", "OCUPADO"].some(s => mosStatus.includes(s))) {
      finalStatus = "busy";
      workflowOutcome = "busy";
    } else if (["NO_ANSWER", "NAO_ATENDEU", "NOANSWER", "NAOATENDEU", "TIMEOUT"].some(s => mosStatus.includes(s))) {
      finalStatus = "no_answer";
      workflowOutcome = "no_answer";
    } else if (["CANCELLED", "CANCELADO"].some(s => mosStatus.includes(s))) {
      finalStatus = "cancelled";
      workflowOutcome = "failed";
    }

    // 3. Debit wallet (R$ 0,15 per 30s block)
    const blocks = Math.ceil(durationSeconds / 30);
    const cost = +(blocks * 0.15).toFixed(2);
    if (cost > 0) {
      console.log(`[URA Callback] Debiting R$ ${cost} from company ${task.company_id} wallet.`);
      const { error: debitError } = await supabase.rpc("wallet_debit", {
        p_company_id: task.company_id,
        p_amount: cost,
        p_category: "ura",
        p_description: `Chamada URA ${durationSeconds}seg (${blocks} bloco(s))`,
        p_reference_type: "ura_session",
        p_reference_id: task.id,
        p_metadata: { duration_seconds: durationSeconds, blocks }
      });
      if (debitError) {
        console.error("[URA Callback] Wallet debit failed:", debitError);
      }
    }

    // 4. Fetch node retry settings
    const { data: nodeData } = await supabase
      .from("sequence_nodes")
      .select("config")
      .eq("id", task.node_id)
      .single();

    const nodeConfig = nodeData?.config || {};
    const attemptsConfig = nodeConfig.attempts || { enabled: true, maxAttempts: 2, retryDelayMs: 3600000, retryOn: ["no_answer", "busy", "failed"] };
    const maxAttempts = attemptsConfig.maxAttempts ?? 2;
    const retryDelayMs = attemptsConfig.retryDelayMs ?? 3600000;
    const retryOn = attemptsConfig.retryOn || ["no_answer", "busy", "failed"];

    const isFailedStatus = ["no_answer", "busy", "failed"].includes(finalStatus);
    const shouldRetry = attemptsConfig.enabled && isFailedStatus && retryOn.includes(finalStatus) && task.attempt_count < maxAttempts;

    let updatedStatus = finalStatus;
    let finished = true;

    if (shouldRetry) {
      updatedStatus = "retry_scheduled";
      finished = false;
      const nextAttemptAt = new Date(Date.now() + retryDelayMs).toISOString();

      await supabase
        .from("workflow_ura_tasks")
        .update({
          status: updatedStatus,
          dtmf_pressed: dtmf,
          duration_seconds: durationSeconds,
          cause_name: causeName,
          cost_value: cost,
          raw_callback: payload,
          next_attempt_at: nextAttemptAt,
          updated_at: new Date().toISOString()
        })
        .eq("id", task.id);

      console.log(`[URA Callback] Call failed (${finalStatus}). Retrying in ${retryDelayMs / 1000}s. Next attempt: ${nextAttemptAt}`);

    } else {
      if (isFailedStatus && task.attempt_count >= maxAttempts) {
        updatedStatus = "attempts_exhausted";
        workflowOutcome = "attempts_exhausted";
      }

      await supabase
        .from("workflow_ura_tasks")
        .update({
          status: updatedStatus,
          dtmf_pressed: dtmf,
          result: workflowOutcome,
          duration_seconds: durationSeconds,
          cause_name: causeName,
          cost_value: cost,
          raw_callback: payload,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", task.id);

      console.log(`[URA Callback] Task finished. Status: ${updatedStatus}, Workflow outcome: ${workflowOutcome}`);
    }

    // 5. Resume workflow if execution finished
    if (finished) {
      console.log(`[URA Callback] Resuming workflow ${task.workflow_id} for lead ${task.lead_id}`);
      
      const res = await fetch(`${supabaseUrl}/functions/v1/execute-message`, {
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
            uraResult: workflowOutcome,
            companyId: task.company_id,
          }
        })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[URA Callback] Failed to resume workflow: ${text}`);
      } else {
        console.log(`[URA Callback] Workflow successfully resumed.`);
      }
    }

    return new Response(JSON.stringify({ ok: true, status: updatedStatus, outcome: workflowOutcome }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[URA Callback] Uncaught error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
