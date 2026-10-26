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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { broadcastId, action = "run_batch", limit: explicitLimit } = body;

    if (!broadcastId) {
      return new Response(
        JSON.stringify({ error: "Missing broadcastId parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch broadcast details
    const { data: campaign, error: campaignErr } = await supabase
      .from("broadcast_campaigns")
      .select("*")
      .eq("id", broadcastId)
      .single();

    if (campaignErr || !campaign) {
      return new Response(
        JSON.stringify({ error: `Campanha de disparo não encontrada: ${campaignErr?.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle status actions: cancel, pause, resume
    if (action === "cancel") {
      await supabase
        .from("broadcast_campaigns")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", broadcastId);

      await supabase
        .from("broadcast_recipients")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("broadcast_id", broadcastId)
        .eq("status", "pending");

      return new Response(
        JSON.stringify({ success: true, message: "Disparo cancelado com sucesso." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "pause") {
      await supabase
        .from("broadcast_campaigns")
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .eq("id", broadcastId);

      return new Response(
        JSON.stringify({ success: true, message: "Disparo pausado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "resume") {
      await supabase
        .from("broadcast_campaigns")
        .update({ status: "running", updated_at: new Date().toISOString() })
        .eq("id", broadcastId);

      return new Response(
        JSON.stringify({ success: true, message: "Disparo retomado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execution action (run_now or run_batch)
    if (!campaign.workflow_id) {
      return new Response(
        JSON.stringify({ error: "Nenhum fluxo associado a este disparo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine how many leads to dispatch in this batch
    let batchLimit = explicitLimit;
    if (!batchLimit) {
      if (action === "run_now" && campaign.distribution_mode === "immediate") {
        batchLimit = 10000; // All pending
      } else {
        batchLimit = campaign.daily_limit || 10;
      }
    }

    // Query pending recipients
    const todayStr = new Date().toISOString().split("T")[0];
    let recipientsQuery = supabase
      .from("broadcast_recipients")
      .select("id, lead_id, batch_index, scheduled_date")
      .eq("broadcast_id", broadcastId)
      .eq("status", "pending")
      .order("batch_index", { ascending: true })
      .order("created_at", { ascending: true });

    // If it's a scheduled batch run, prefer those with scheduled_date <= today
    if (action === "run_batch" && campaign.distribution_mode === "daily_limit") {
      recipientsQuery = recipientsQuery.lte("scheduled_date", todayStr);
    }

    const { data: recipients, error: recError } = await recipientsQuery.limit(batchLimit);

    if (recError) {
      return new Response(
        JSON.stringify({ error: `Erro ao buscar contatos da fila: ${recError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!recipients || recipients.length === 0) {
      // Check if there are ANY pending recipients left
      const { count: pendingCount } = await supabase
        .from("broadcast_recipients")
        .select("*", { count: "exact", head: true })
        .eq("broadcast_id", broadcastId)
        .eq("status", "pending");

      if (!pendingCount || pendingCount === 0) {
        await supabase
          .from("broadcast_campaigns")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            pending_count: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", broadcastId);

        return new Response(
          JSON.stringify({
            success: true,
            completed: true,
            message: "Todos os disparos desta lista já foram concluídos!",
            dispatchedCount: 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Nenhum disparo agendado para a data de hoje. Aguarde o próximo lote.",
          dispatchedCount: 0,
          pendingTotal: pendingCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Set campaign status to running if it was scheduled/draft
    if (campaign.status !== "running") {
      await supabase
        .from("broadcast_campaigns")
        .update({
          status: "running",
          started_at: campaign.started_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", broadcastId);
    }

    // Extract lead IDs
    const leadIds = recipients.map((r: any) => r.lead_id);
    const recipientIds = recipients.map((r: any) => r.id);

    // Call start-workflow-for-leads edge function
    const startWorkflowUrl = `${supabaseUrl}/functions/v1/start-workflow-for-leads`;
    let successCount = 0;
    let failCount = 0;
    let executionError = null;

    try {
      const response = await fetch(startWorkflowUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          workflowId: campaign.workflow_id,
          leadIds,
          instanceId: campaign.instance_id || undefined,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        successCount = result.successCount ?? recipients.length;
        failCount = result.failCount ?? 0;
      } else {
        executionError = result.error || "Falha ao executar fluxo";
        failCount = recipients.length;
      }
    } catch (err: any) {
      executionError = err.message || "Erro de rede ao disparar";
      failCount = recipients.length;
    }

    const nowIso = new Date().toISOString();

    // Mark recipients as sent or failed
    if (successCount > 0 && failCount === 0) {
      await supabase
        .from("broadcast_recipients")
        .update({
          status: "sent",
          dispatched_at: nowIso,
          updated_at: nowIso,
        })
        .in("id", recipientIds);
    } else if (failCount > 0 && successCount === 0) {
      await supabase
        .from("broadcast_recipients")
        .update({
          status: "failed",
          error_message: executionError || "Falha no disparo do fluxo",
          dispatched_at: nowIso,
          updated_at: nowIso,
        })
        .in("id", recipientIds);
    } else {
      // Partial: mark first successCount as sent, remainder as failed
      const sentIds = recipientIds.slice(0, successCount);
      const failedIds = recipientIds.slice(successCount);

      if (sentIds.length > 0) {
        await supabase
          .from("broadcast_recipients")
          .update({ status: "sent", dispatched_at: nowIso, updated_at: nowIso })
          .in("id", sentIds);
      }
      if (failedIds.length > 0) {
        await supabase
          .from("broadcast_recipients")
          .update({ status: "failed", error_message: "Erro no envio do lote", dispatched_at: nowIso, updated_at: nowIso })
          .in("id", failedIds);
      }
    }

    // Refresh counts on broadcast_campaigns
    const { count: currentPending } = await supabase
      .from("broadcast_recipients")
      .select("*", { count: "exact", head: true })
      .eq("broadcast_id", broadcastId)
      .eq("status", "pending");

    const newSentCount = (campaign.sent_count || 0) + successCount;
    const newFailedCount = (campaign.failed_count || 0) + failCount;
    const isNowCompleted = (currentPending ?? 0) === 0;

    await supabase
      .from("broadcast_campaigns")
      .update({
        sent_count: newSentCount,
        failed_count: newFailedCount,
        pending_count: currentPending ?? 0,
        status: isNowCompleted ? "completed" : "running",
        completed_at: isNowCompleted ? nowIso : null,
        updated_at: nowIso,
      })
      .eq("id", broadcastId);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Lote processado: ${successCount} enviados com sucesso, ${failCount} com falha.`,
        dispatchedCount: successCount,
        failedCount: failCount,
        pendingRemaining: currentPending ?? 0,
        isCompleted: isNowCompleted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[process-broadcast-campaign] Uncaught exception:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
