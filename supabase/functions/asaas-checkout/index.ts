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
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const {
      companyId,
      amount,
      customerName = "Cliente Qualify",
      customerCpfCnpj = "00000000000",
      customerEmail,
    } = body;

    if (!companyId || !amount || Number(amount) <= 0) {
      throw new Error("Parâmetros inválidos: companyId e amount positivo são obrigatórios.");
    }

    // 1. Buscar configuração do Asaas
    const { data: settingRow } = await adminClient
      .from("platform_settings")
      .select("value")
      .eq("key", "asaas_config")
      .maybeSingle();

    const asaasConfig = settingRow?.value;
    if (!asaasConfig?.api_key) {
      throw new Error("Gateway Asaas não configurado na plataforma. Configure em Super Admin > Integrações > Asaas.");
    }

    const baseUrl =
      asaasConfig.environment === "production"
        ? "https://api.asaas.com/v3"
        : "https://sandbox.asaas.com/api/v3";

    // 2. Buscar ou Criar Carteira da Empresa
    let { data: wallet } = await adminClient
      .from("wallets")
      .select("id")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!wallet) {
      const { data: newW } = await adminClient
        .from("wallets")
        .insert({ company_id: companyId })
        .select("id")
        .single();
      wallet = newW;
    }

    // 3. Criar ou Obter Cliente no Asaas
    let asaasCustomerId: string | null = null;
    const custSearch = await fetch(`${baseUrl}/customers?cpfCnpj=${customerCpfCnpj}`, {
      headers: { access_token: asaasConfig.api_key },
    });
    const custSearchData = await custSearch.json();

    if (custSearchData.data?.length > 0) {
      asaasCustomerId = custSearchData.data[0].id;
    } else {
      const custCreate = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers: {
          access_token: asaasConfig.api_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customerName,
          cpfCnpj: customerCpfCnpj,
          email: customerEmail,
          externalReference: companyId,
        }),
      });
      const custCreateData = await custCreate.json();
      if (!custCreate.ok || !custCreateData.id) {
        throw new Error(custCreateData.errors?.[0]?.description || "Falha ao registrar cliente no Asaas.");
      }
      asaasCustomerId = custCreateData.id;
    }

    // 4. Criar Cobrança PIX
    const dueDate = new Date().toISOString().split("T")[0];
    const paymentPayload = {
      customer: asaasCustomerId,
      billingType: "PIX",
      value: Number(amount),
      dueDate,
      description: `Recarga de Carteira Qualify / Criafy (${companyId.slice(0, 8)})`,
      externalReference: companyId,
    };

    const payResp = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        access_token: asaasConfig.api_key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentPayload),
    });
    const payData = await payResp.json();

    if (!payResp.ok || !payData.id) {
      throw new Error(payData.errors?.[0]?.description || "Falha ao gerar cobrança PIX no Asaas.");
    }

    const asaasPaymentId = payData.id;

    // 5. Buscar QR Code do PIX
    const qrResp = await fetch(`${baseUrl}/payments/${asaasPaymentId}/pixQrCode`, {
      headers: { access_token: asaasConfig.api_key },
    });
    const qrData = await qrResp.json();

    const encodedImage = qrData.encodedImage || "";
    const payload = qrData.payload || "";
    const expirationDate = qrData.expirationDate || null;

    // 6. Registrar em wallet_payments
    const { data: record, error: recError } = await adminClient
      .from("wallet_payments")
      .insert({
        company_id: companyId,
        wallet_id: wallet.id,
        amount: Number(amount),
        mp_payment_id: asaasPaymentId,
        mp_qr_code: payload,
        mp_qr_code_base64: encodedImage,
        mp_ticket_url: payData.invoiceUrl || null,
        status: "pending",
        expires_at: expirationDate ? new Date(expirationDate).toISOString() : null,
      })
      .select("id")
      .single();

    if (recError) {
      console.error("Erro ao registrar pagamento na tabela wallet_payments:", recError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: asaasPaymentId,
        record_id: record?.id,
        amount: Number(amount),
        qr_code: payload,
        qr_code_base64: encodedImage,
        invoice_url: payData.invoiceUrl,
        expires_at: expirationDate,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
