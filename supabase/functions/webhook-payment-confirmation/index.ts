import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Optional shared secret protection
  const expectedSecret = Deno.env.get('WEBHOOK_PIX_SECRET');
  if (expectedSecret) {
    const provided = req.headers.get('x-webhook-secret');
    if (provided !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const body = await req.json();
    const payment_id: string | undefined = body.payment_id;
    const mp_payment_id: string | undefined = body.mp_payment_id;
    const status: string = String(body.status || '').toLowerCase();
    const amount: number | undefined = body.amount !== undefined ? Number(body.amount) : undefined;
    const paid_at: string | undefined = body.paid_at;

    if (!payment_id && !mp_payment_id) {
      return new Response(JSON.stringify({ error: 'missing_payment_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let query = supabase.from('wallet_payments').select('*');
    if (payment_id) query = query.eq('id', payment_id);
    else query = query.eq('mp_payment_id', mp_payment_id!);
    const { data: payment, error: payErr } = await query.maybeSingle();

    if (payErr || !payment) {
      return new Response(JSON.stringify({ error: 'payment_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotency
    if (payment.status === 'approved') {
      return new Response(JSON.stringify({ ok: true, message: 'already_processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (status === 'approved' || status === 'paid' || status === 'success') {
      const creditAmount = amount && amount > 0 ? amount : Number(payment.amount);

      const { error: rpcErr } = await supabase.rpc('wallet_credit', {
        p_company_id: payment.company_id,
        p_amount: creditAmount,
        p_type: 'deposit',
        p_category: 'pix',
        p_description: 'Recarga via PIX',
        p_reference_type: 'wallet_payment',
        p_reference_id: payment.id,
        p_metadata: { mp_payment_id: mp_payment_id || payment.mp_payment_id, paid_at },
      });
      if (rpcErr) throw new Error(`wallet_credit_failed: ${rpcErr.message}`);

      await supabase.from('wallet_payments').update({
        status: 'approved',
        paid_at: paid_at || new Date().toISOString(),
        mp_payment_id: mp_payment_id || payment.mp_payment_id,
      }).eq('id', payment.id);

      return new Response(JSON.stringify({ ok: true, credited: creditAmount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (status === 'rejected' || status === 'cancelled' || status === 'expired' || status === 'failed') {
      await supabase.from('wallet_payments').update({ status }).eq('id', payment.id);
      return new Response(JSON.stringify({ ok: true, status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, ignored: status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const err = e as Error;
    console.error('[webhook-payment-confirmation] error:', err.message);
    return new Response(JSON.stringify({ error: 'internal_error', message: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
