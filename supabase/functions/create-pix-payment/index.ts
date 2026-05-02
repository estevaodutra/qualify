import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_WEBHOOK_URL = 'https://n8n-n8n.nuwfic.easypanel.host/webhook/gerar_pix';
const MIN_AMOUNT = 250;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.slice(7);
    const authClient = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email || '';

    const body = await req.json();
    const company_id: string | undefined = body.company_id;
    const amount: number = Number(body.amount);

    if (!company_id || !amount || isNaN(amount)) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (amount < MIN_AMOUNT) {
      return new Response(JSON.stringify({ error: 'amount_below_minimum', message: `Valor mínimo é R$ ${MIN_AMOUNT.toFixed(2)}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('company_members')
      .select('id')
      .eq('company_id', company_id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or ensure wallet
    let { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('company_id', company_id)
      .maybeSingle();
    if (!wallet) {
      const { data: created, error: insErr } = await supabase
        .from('wallets')
        .insert({ company_id })
        .select('id')
        .single();
      if (insErr) throw new Error(`wallet_create_failed: ${insErr.message}`);
      wallet = created;
    }

    // Get company name + payer profile
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', company_id)
      .single();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Create pending payment record
    const { data: payment, error: payErr } = await supabase
      .from('wallet_payments')
      .insert({
        company_id,
        wallet_id: wallet!.id,
        amount,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id')
      .single();
    if (payErr) throw new Error(`payment_create_failed: ${payErr.message}`);

    // Call n8n
    const payload = {
      company_id,
      payment_id: payment.id,
      amount,
      description: `Recarga DispatchOne - ${company?.name || ''}`,
      payer_email: userEmail,
      payer_name: (profile as any)?.full_name || userEmail,
    };

    let n8nData: any = null;
    try {
      const n8nResp = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await n8nResp.text();
      try { n8nData = JSON.parse(text); } catch { n8nData = { raw: text }; }
      if (!n8nResp.ok) throw new Error(`n8n returned ${n8nResp.status}`);
    } catch (e) {
      const err = e as Error;
      console.error('[create-pix-payment] n8n error:', err.message);
      await supabase.from('wallet_payments').update({ status: 'failed' }).eq('id', payment.id);
      return new Response(JSON.stringify({ error: 'gateway_error', message: err.message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // n8n may return data wrapped in array or object
    const data = Array.isArray(n8nData) ? n8nData[0] : n8nData;
    const qr_code = data?.qr_code || data?.qrCode || null;
    const qr_code_base64 = data?.qr_code_base64 || data?.qrCodeBase64 || null;
    const ticket_url = data?.ticket_url || data?.ticketUrl || null;
    const mp_payment_id = data?.payment_id || data?.mp_payment_id || data?.id?.toString() || null;
    const new_expires_at = data?.expires_at || expiresAt;

    if (!qr_code && !qr_code_base64) {
      console.error('[create-pix-payment] n8n missing QR data:', data);
      await supabase.from('wallet_payments').update({ status: 'failed' }).eq('id', payment.id);
      return new Response(JSON.stringify({ error: 'gateway_invalid_response' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('wallet_payments')
      .update({
        mp_payment_id,
        mp_qr_code: qr_code,
        mp_qr_code_base64: qr_code_base64,
        mp_ticket_url: ticket_url,
        expires_at: new_expires_at,
      })
      .eq('id', payment.id);

    return new Response(JSON.stringify({
      success: true,
      payment_id: payment.id,
      qr_code,
      qr_code_base64,
      ticket_url,
      expires_at: new_expires_at,
      amount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const err = e as Error;
    console.error('[create-pix-payment] fatal:', err.message);
    return new Response(JSON.stringify({ error: 'internal_error', message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
