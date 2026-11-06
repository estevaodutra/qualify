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

    const { operator_id, user_id, phone, lead_id, campaign_id } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ success: false, error: "Número de telefone é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Localizar operador pelo operator_id ou user_id
    let operator: any = null;

    if (operator_id) {
      const { data: op } = await supabase
        .from("call_operators")
        .select("id, operator_name, extension, api4com_token, sip_domain, company_id, user_id")
        .eq("id", operator_id)
        .maybeSingle();
      operator = op;
    }

    if (!operator && user_id) {
      const { data: opList } = await supabase
        .from("call_operators")
        .select("id, operator_name, extension, api4com_token, sip_domain, company_id, user_id")
        .eq("user_id", user_id)
        .order("updated_at", { ascending: false })
        .limit(1);
      operator = opList?.[0] || null;
    }

    // Se o operador ainda não tiver token ou ramal preenchido, busca diretamente no profiles
    const targetUserId = operator?.user_id || user_id;
    if ((!operator?.api4com_token || !operator?.extension) && targetUserId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("api4com_token, api4com_extension, api4com_domain, api4com_password, full_name, email")
        .eq("id", targetUserId)
        .maybeSingle();

      if (prof?.api4com_token && prof?.api4com_extension) {
        if (!operator) {
          operator = {
            id: null,
            operator_name: prof.full_name || prof.email || "Operador",
            extension: prof.api4com_extension,
            api4com_token: prof.api4com_token,
            sip_domain: prof.api4com_domain || "d2x.api4com.com",
            company_id: null,
            user_id: targetUserId,
          };
        } else {
          operator.extension = prof.api4com_extension;
          operator.api4com_token = prof.api4com_token;
          operator.sip_domain = prof.api4com_domain || "d2x.api4com.com";
          // Atualiza o operador no banco para as próximas consultas
          await supabase
            .from("call_operators")
            .update({
              extension: prof.api4com_extension,
              api4com_token: prof.api4com_token,
              sip_domain: prof.api4com_domain || "d2x.api4com.com",
              sip_password: prof.api4com_password || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", operator.id);
        }
      }
    }

    if (!operator?.api4com_token || !operator?.extension) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Operador não possui token ou ramal API4COM configurado no sistema.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = formatToE164(phone);

    // 2. Criar registro inicial no call_logs
    const { data: callLog, error: logError } = await supabase
      .from("call_logs")
      .insert({
        company_id: operator.company_id || null,
        operator_id: operator.id || null,
        user_id: targetUserId || null,
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

    console.log(`[api4com-call-dial] Enviando POST /calls para ramal ${operator.extension} -> ${formattedPhone}`);

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
      if (dialRes.status === 424) {
        friendlyError = `Webphone do ramal ${operator.extension} não está conectado no navegador. Aguarde o registro SIP conectar.`;
      }
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
          rawError: dialData,
          callLogId: callLog.id,
          httpStatus: dialRes.status,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Chamada iniciada com sucesso (ramal do operador atendeu automaticamente)
    await supabase
      .from("call_logs")
      .update({
        external_call_id: dialData.id || null,
        call_status: "ringing",
      })
      .eq("id", callLog.id);

    return new Response(
      JSON.stringify({
        success: true,
        callId: dialData.id,
        callLogId: callLog.id,
        status: "ringing",
        message: "Chamada iniciada. Discando para o destino...",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[api4com-call-dial] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
