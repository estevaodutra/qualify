import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Obter configuração do Asaas para validar token se houver
    const { data: settingRow } = await adminClient
      .from("platform_settings")
      .select("value")
      .eq("key", "asaas_config")
      .maybeSingle();

    const asaasConfig = settingRow?.value;
    const expectedToken = asaasConfig?.webhook_token;
    const incomingToken = req.headers.get("asaas-access-token");

    if (expectedToken && incomingToken && expectedToken !== incomingToken) {
      console.warn("Asaas webhook rejected: invalid asaas-access-token");
      return new Response(JSON.stringify({ error: "Unauthorized token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const event = body.event;
    const payment = body.payment;

    console.log(`[ASAAS WEBHOOK] Evento recebido: ${event}, Payment ID: ${payment?.id}, Valor: ${payment?.value}`);

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      const asaasPaymentId = payment?.id;
      const paymentValue = Number(payment?.value);

      if (!asaasPaymentId || isNaN(paymentValue) || paymentValue <= 0) {
        return new Response(JSON.stringify({ received: true, ignored: "invalid_payment_data" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Buscar registro em wallet_payments
      const { data: walletPayment, error: findError } = await adminClient
        .from("wallet_payments")
        .select("*")
        .eq("mp_payment_id", asaasPaymentId)
        .maybeSingle();

      if (findError) {
        console.error("Erro ao buscar wallet_payments:", findError);
      }

      const companyId = walletPayment?.company_id || payment.externalReference;

      if (!companyId) {
        console.warn("Pagamento Asaas sem companyId associado:", asaasPaymentId);
        return new Response(JSON.stringify({ received: true, warning: "company_not_found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Evita duplicidade se já foi aprovado
      if (walletPayment && walletPayment.status === "approved") {
        return new Response(JSON.stringify({ received: true, already_processed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Atualiza wallet_payments para approved
      if (walletPayment?.id) {
        await adminClient
          .from("wallet_payments")
          .update({
            status: "approved",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", walletPayment.id);
      }

      // Creditar carteira da empresa via RPC wallet_credit
      const { data: txId, error: creditError } = await adminClient.rpc("wallet_credit", {
        p_company_id: companyId,
        p_amount: paymentValue,
        p_type: "deposit",
        p_category: "pix_recharge",
        p_description: `Recarga PIX automática Asaas (#${asaasPaymentId})`,
        p_reference_type: "wallet_payment",
        p_reference_id: walletPayment?.id || null,
        p_metadata: {
          gateway: "asaas",
          event,
          payment_id: asaasPaymentId,
          net_value: payment.netValue,
          client_payment_date: payment.clientPaymentDate,
        },
      });

      if (creditError) {
        console.error("Erro ao creditar saldo na carteira via RPC wallet_credit:", creditError);
        throw creditError;
      }

      console.log(`[ASAAS WEBHOOK] Saldo de R$ ${paymentValue} creditado com sucesso para a empresa ${companyId}. Tx ID: ${txId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Erro no processamento do webhook Asaas:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
