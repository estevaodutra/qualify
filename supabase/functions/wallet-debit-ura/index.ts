import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

const URA_PER_30_SECONDS = 0.15;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const body = await req.json();
    const company_id: string = body.company_id;
    const duration_seconds: number = Number(body.duration_seconds || 0);
    const ura_session_id: string | undefined = body.ura_session_id;
    const description: string | undefined = body.description;

    if (!company_id || duration_seconds <= 0) {
      return new Response(JSON.stringify({ error: 'invalid_payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const blocks = Math.ceil(duration_seconds / 30);
    const cost = +(blocks * URA_PER_30_SECONDS).toFixed(2);

    const { data: txId, error } = await supabase.rpc('wallet_debit', {
      p_company_id: company_id,
      p_amount: cost,
      p_category: 'ura',
      p_description: description || `URA ${duration_seconds}seg (${blocks} bloco${blocks > 1 ? 's' : ''})`,
      p_reference_type: 'ura_session',
      p_reference_id: ura_session_id || null,
      p_metadata: { duration_seconds, blocks },
    });

    if (error) {
      const code = error.message.includes('INSUFFICIENT_BALANCE') ? 402
                  : error.message.includes('DAILY_LIMIT_EXCEEDED') ? 402 : 500;
      return new Response(JSON.stringify({ error: error.message, code }), {
        status: code, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, transaction_id: txId, amount: cost, blocks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const err = e as Error;
    return new Response(JSON.stringify({ error: 'internal_error', message: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
