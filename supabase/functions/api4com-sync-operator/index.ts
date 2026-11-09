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
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { data: { user } } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } };
    if (!user) return new Response(JSON.stringify({ success: false, error: "Sessão inválida." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { operator_id, api4com_token } = await req.json();

    if (!operator_id || !api4com_token) {
      return new Response(
        JSON.stringify({ success: false, error: "operator_id e api4com_token são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { data: targetOperator } = await supabase.from("call_operators")
      .select("user_id").eq("id", operator_id).maybeSingle();
    const { data: adminRole } = await supabase.from("user_roles")
      .select("user_id").eq("user_id", user.id).eq("role", "superadmin").maybeSingle();
    if (!targetOperator || (targetOperator.user_id !== user.id && !adminRole)) {
      return new Response(JSON.stringify({ success: false, error: "Sem acesso a este operador." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cleanToken = api4com_token.trim();

    // 1. Validar token do usuário na API4COM
    const meRes = await fetch("https://api.api4com.com/api/v1/users/me", {
      headers: { Authorization: cleanToken },
    });

    if (!meRes.ok) {
      const errText = await meRes.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token API4COM inválido ou não autorizado.",
          details: errText,
        }),
        { status: meRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = await meRes.json();

    // 2. Buscar o ramal SIP do usuário
    const ramalRes = await fetch(
      "https://api.api4com.com/api/v1/integrations?filter[where][gateway]=sippulse",
      {
        headers: { Authorization: cleanToken },
      }
    );

    if (!ramalRes.ok) {
      const errText = await ramalRes.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: "Falha ao buscar ramal SIP na API4COM.",
          details: errText,
        }),
        { status: ramalRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ramalList = await ramalRes.json();
    if (!Array.isArray(ramalList) || ramalList.length === 0 || !ramalList[0]?.metadata) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Nenhum ramal SIP vinculado a este usuário. Certifique-se de que o usuário possui plano ativo na API4COM.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sipData = ramalList[0].metadata; // { domain, username, password }
    const extension = String(sipData.username);
    const sipDomain = sipData.domain;
    const sipPassword = sipData.password;

    // 3. Configurar / Atualizar o Webhook na API4COM
    let existingIntegrationId: number | null = null;
    try {
      const checkWebhookRes = await fetch(
        "https://api.api4com.com/api/v1/integrations?filter[where][gateway]=qualify-crm",
        {
          headers: { Authorization: cleanToken },
        }
      );
      if (checkWebhookRes.ok) {
        const integrations = await checkWebhookRes.json();
        if (Array.isArray(integrations) && integrations.length > 0) {
          existingIntegrationId = integrations[0].id;
        }
      }
    } catch (e) {
      console.warn("Aviso ao checar integrações existentes:", e);
    }

    const webhookPayload: Record<string, unknown> = {
      gateway: "qualify-crm",
      webhook: true,
      webhookConstraint: {
        metadata: {
          gateway: "qualify-crm",
        },
      },
      metadata: {
        webhookUrl: `${supabaseUrl}/functions/v1/api4com-webhook`,
        webhookVersion: "v1.8",
        webhookTypes: ["channel-answer", "channel-hangup"],
      },
    };

    if (existingIntegrationId) {
      webhookPayload.id = existingIntegrationId;
    }

    let savedIntegrationId = existingIntegrationId;
    let webhookConfigured = false;
    const patchRes = await fetch("https://api.api4com.com/api/v1/integrations", {
      method: "PATCH",
      headers: {
        Authorization: cleanToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(webhookPayload),
    });

    if (patchRes.ok) {
      const patchData = await patchRes.json();
      savedIntegrationId = patchData.id || savedIntegrationId;
      webhookConfigured = true;
    } else {
      console.warn("Aviso ao configurar webhook API4COM:", await patchRes.text());
    }

    // 4. Salvar dados na tabela call_operators do Supabase
    const { error: updateError } = await supabase
      .from("call_operators")
      .update({
        api4com_token: cleanToken,
        extension: extension,
        sip_domain: sipDomain,
        sip_password: sipPassword,
        sip_integration_id: savedIntegrationId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", operator_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Ramal API4COM sincronizado e configurado com sucesso!",
        user: {
          name: userData.name,
          email: userData.email,
        },
        sip: {
          extension,
          domain: sipDomain,
        },
        webhookConfigured,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[api4com-sync-operator] Erro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
