import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<any>) => void;
} | undefined;

function getRandomDelay(minSec: number, maxSec: number): number {
  const safeMin = Math.max(10, minSec);
  const safeMax = Math.max(safeMin, maxSec);
  return Math.floor(safeMin + Math.random() * (safeMax - safeMin + 1));
}

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
        JSON.stringify({ success: true, message: "Disparo retomado com cadência Anti-Ban." }),
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

    // Resolve anti-ban delay configuration (default 3 to 5 minutes)
    const minDelaySeconds = campaign.min_delay_seconds || 
      (campaign.audience_filters as any)?.minDelaySeconds || 180;
    const maxDelaySeconds = campaign.max_delay_seconds || 
      (campaign.audience_filters as any)?.maxDelaySeconds || 300;

    // Determine how many leads to consider in this batch
    let batchLimit = explicitLimit;
    if (!batchLimit) {
      if (action === "run_now" && campaign.distribution_mode === "immediate") {
        batchLimit = 10000;
      } else {
        batchLimit = campaign.daily_limit || 10;
      }
    }

    // Query pending recipients
    const todayStr = new Date().toISOString().split("T")[0];
    let recipientsQuery = supabase
      .from("broadcast_recipients")
      .select("id, lead_id, batch_index, scheduled_date, scheduled_for")
      .eq("broadcast_id", broadcastId)
      .eq("status", "pending")
      .order("batch_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (action === "run_batch" && campaign.distribution_mode === "daily_limit") {
      recipientsQuery = recipientsQuery.lte("scheduled_date", todayStr);
    }

    const { data: rawRecipients, error: recError } = await recipientsQuery.limit(batchLimit);

    if (recError) {
      return new Response(
        JSON.stringify({ error: `Erro ao buscar contatos da fila: ${recError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let recipients = rawRecipients || [];

    if (recipients.length === 0) {
      // Check if there are ANY pending recipients left (ignoring date)
      const { data: nextRecipients } = await supabase
        .from("broadcast_recipients")
        .select("id, lead_id, batch_index, scheduled_date, scheduled_for")
        .eq("broadcast_id", broadcastId)
        .eq("status", "pending")
        .order("batch_index", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(batchLimit);

      if (!nextRecipients || nextRecipients.length === 0) {
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

      recipients = nextRecipients;
    }

    // Set campaign status to running
    await supabase
      .from("broadcast_campaigns")
      .update({
        status: "running",
        started_at: campaign.started_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", broadcastId);

    // =========================================================================
    // ANTI-BAN 1-BY-1 SEQUENCING:
    // Sorteia intervalo aleatório [minDelaySeconds, maxDelaySeconds] para cada lead.
    // O 1º lead dispara IMEDIATAMENTE.
    // Os leads subsequentes recebem scheduled_for espaçado aleatoriamente para o
    // cron (process-scheduled-messages) acioná-los um a um.
    // =========================================================================
    const firstRecipient = recipients[0];
    const now = new Date();
    let currentCursor = new Date(now.getTime());

    // Atualiza o agendamento sequencial dos contatos deste lote
    for (let i = 1; i < recipients.length; i++) {
      const rec = recipients[i];
      const randomDelay = getRandomDelay(minDelaySeconds, maxDelaySeconds);
      currentCursor = new Date(currentCursor.getTime() + randomDelay * 1000);

      // Salva no banco o horário programado do lead
      await supabase
        .from("broadcast_recipients")
        .update({
          scheduled_for: currentCursor.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", rec.id);
    }

    // Dispara o PRIMEIRO lead agora de forma individual (1 por vez)
    const backgroundTask = async () => {
      console.log(`[BroadcastRunner] Dispatching 1st lead (${firstRecipient.lead_id}) for campaign ${broadcastId}`);
      
      // Marca o 1º como processing
      await supabase
        .from("broadcast_recipients")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", firstRecipient.id);

      const startWorkflowUrl = `${supabaseUrl}/functions/v1/start-workflow-for-leads`;
      let isSuccess = false;
      let errorMessage = null;

      try {
        const response = await fetch(startWorkflowUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            workflowId: campaign.workflow_id,
            leadIds: [firstRecipient.lead_id], // Dispara APENAS 1 LEAD!
            instanceId: campaign.instance_id || undefined,
          }),
        });

        const result = await response.json().catch(() => ({}));
        if (response.ok && (result.successCount ?? 0) > 0) {
          isSuccess = true;
        } else {
          errorMessage = result.error || "Falha ao executar fluxo para o lead";
        }
      } catch (err: any) {
        errorMessage = err.message || "Erro de rede";
      }

      const nowIso = new Date().toISOString();

      // Atualiza o 1º destinatário
      await supabase
        .from("broadcast_recipients")
        .update({
          status: isSuccess ? "sent" : "failed",
          dispatched_at: nowIso,
          error_message: errorMessage,
          updated_at: nowIso,
        })
        .eq("id", firstRecipient.id);

      // Atualiza contadores da campanha
      const { data: freshCamp } = await supabase
        .from("broadcast_campaigns")
        .select("sent_count, failed_count, total_leads")
        .eq("id", broadcastId)
        .single();

      const newSent = (freshCamp?.sent_count || 0) + (isSuccess ? 1 : 0);
      const newFailed = (freshCamp?.failed_count || 0) + (!isSuccess ? 1 : 0);

      const { count: currentPending } = await supabase
        .from("broadcast_recipients")
        .select("*", { count: "exact", head: true })
        .eq("broadcast_id", broadcastId)
        .in("status", ["pending", "processing"]);

      const isCompleted = (currentPending ?? 0) === 0;

      await supabase
        .from("broadcast_campaigns")
        .update({
          sent_count: newSent,
          failed_count: newFailed,
          pending_count: currentPending ?? 0,
          status: isCompleted ? "completed" : "running",
          completed_at: isCompleted ? nowIso : null,
          updated_at: nowIso,
        })
        .eq("id", broadcastId);

      console.log(`[BroadcastRunner] 1st lead dispatched for ${broadcastId}. Next leads will be processed 1-by-1 with random delay ${minDelaySeconds}-${maxDelaySeconds}s.`);
    };

    if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
      EdgeRuntime.waitUntil(backgroundTask());
    } else {
      backgroundTask().catch((e) => console.error("[BroadcastRunner] Error:", e));
    }

    const minDelayMin = Math.round(minDelaySeconds / 60);
    const maxDelayMin = Math.round(maxDelaySeconds / 60);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Disparo iniciado! 1º lead sendo enviado agora e os demais ${recipients.length - 1} contatos programados individualmente com intervalo de ${minDelayMin} a ${maxDelayMin} minutos.`,
        batchCount: recipients.length,
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
