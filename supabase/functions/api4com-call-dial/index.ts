import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Formata número para o padrão internacional E.164 exigido pela API4COM (+5511987654321)
function formatToE164(phone: string): string {
  let clean = phone.replace(/\D/g, "");
  if (!clean.startsWith("55") && (clean.length === 10 || clean.length === 11)) {
    clean = "55" + clean;
  }
  return "+" + clean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { operator_id, phone, lead_id, campaign_id } = await req.json();

    if (!operator_id || !phone) {
      return new Response(
        JSON.stringify({ success: false, error: "operator_id e phone são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Buscar dados do operador
    const { data: operator, error: opError } = await supabase
      .from("call_operators")
      .select("id, operator_name, extension, api4com_token, sip_domain, company_id")
      .eq("id", operator_id)
      .single();

    if (opError || !operator) {
      return new Response(
        JSON.stringify({ success: false, error: "Operador não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!operator.api4com_token || !operator.extension) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Operador não possui token ou ramal API4COM configurado. Sincronize o ramal primeiro.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatToE164(phone);

    // 2. Criar registro inicial no call_logs
    const { data: callLog, error: logError } = await supabase
      .from("call_logs")
      .insert({
        company_id: operator.company_id,
        operator_id: operator.id,
        lead_id: lead_id || null,
        campaign_id: campaign_id || null,
        call_status: "dialing",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (logError || !callLog) {
      throw logError || new Error("Falha ao registrar log de chamada");
    }

    // 3. Disparar chamada via API4COM POST /calls
    const payload = {
      extension: operator.extension,
      caller: operator.extension,
      called: formattedPhone,
      metadata: {
        gateway: "qualify-crm",
        callLogId: callLog.id,
        leadId: lead_id || null,
        campaignId: campaign_id || null,
        operatorId: operator.id,
        companyId: operator.company_id,
        callRef: `cr_${callLog.id.slice(0, 8)}_${Date.now()}`,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 segundos conforme doc API4COM

    let dialRes: Response;
    try {
      dialRes = await fetch("https://api.api4com.com/api/v1/calls", {
        method: "POST",
        headers: {
          Authorization: operator.api4com_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      await supabase
        .from("call_logs")
        .update({ call_status: "failed", hangup_cause: "TIMEOUT" })
        .eq("id", callLog.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Tempo de resposta esgotado ao contatar servidor de telefonia.",
          callLogId: callLog.id,
        }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    clearTimeout(timeoutId);

    const dialData = await dialRes.json().catch(() => ({}));

    if (!dialRes.ok) {
      let friendlyError = "Falha ao realizar chamada.";
      if (dialRes.status === 401) friendlyError = "Token da API4COM inválido ou revogado.";
      if (dialRes.status === 402 || dialRes.status === 403) friendlyError = "Plano da API4COM sem saldo ou expirado.";
      if (dialRes.status === 404) friendlyError = "Ramal não encontrado na API4COM. Sincronize novamente.";
      if (dialRes.status === 422) friendlyError = "Número de telefone inválido.";
      if (dialRes.status === 424) friendlyError = "Webphone desconectado. Verifique se o operador está online.";
      if (dialRes.status === 429) friendlyError = "Limite de chamadas por minuto excedido no ramal.";

      await supabase
        .from("call_logs")
        .update({
          call_status: "failed",
          hangup_cause: dialData.error?.code || `HTTP_${dialRes.status}`,
        })
        .eq("id", callLog.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: friendlyError,
          status: dialRes.status,
          details: dialData,
          callLogId: callLog.id,
        }),
        { status: dialRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Chamada aceita com sucesso (Webphone do operador atendeu)
    const externalCallId = dialData.id;
    await supabase
      .from("call_logs")
      .update({
        external_call_id: externalCallId,
        call_status: "ringing", // Webphone atendeu, agora tocando para o cliente
      })
      .eq("id", callLog.id);

    await supabase
      .from("call_operators")
      .update({
        current_call_id: callLog.id,
        status: "on_call",
      })
      .eq("id", operator.id);

    return new Response(
      JSON.stringify({
        success: true,
        callLogId: callLog.id,
        externalCallId,
        called: formattedPhone,
        message: "Chamada iniciada com sucesso!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[api4com-call-dial] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno ao discar" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
