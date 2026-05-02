import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hash token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Log API call to database
async function logApiCall(
  supabase: any,
  params: {
    method: string;
    endpoint: string;
    statusCode: number;
    responseTimeMs: number;
    userId?: string;
    apiKeyId?: string;
    ipAddress?: string;
    requestBody?: object;
    responseBody?: object;
    errorMessage?: string;
  }
) {
  try {
    await supabase.from('api_logs').insert({
      method: params.method,
      endpoint: params.endpoint,
      status_code: params.statusCode,
      response_time_ms: params.responseTimeMs,
      user_id: params.userId,
      api_key_id: params.apiKeyId,
      ip_address: params.ipAddress,
      request_body: params.requestBody,
      response_body: params.responseBody,
      error_message: params.errorMessage,
    });
  } catch (error) {
    console.error('[api-log] Failed to log API call:', error);
  }
}

// Validate phone format (minimum 10 digits with DDI)
function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
                 || req.headers.get('x-real-ip') 
                 || 'unknown';

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'method_not_allowed', message: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let requestBody: any = {};
  let userId: string | undefined;
  let apiKeyId: string | undefined;

  try {
    // Parse request body
    requestBody = await req.json();
    const { campaign_name, lead_phone, lead_name, obs } = requestBody;

    console.log('[call-dial] Request received:', { campaign_name, lead_phone, lead_name });

    // ==================== VALIDATE API KEY ====================
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[call-dial] Missing or invalid Authorization header');
      const responseBody = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token de autenticação ausente ou inválido.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Missing or invalid Authorization header',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Validate token format
    if (!token.startsWith('pk_live_') && !token.startsWith('pk_test_')) {
      console.log('[call-dial] Invalid token format');
      const responseBody = {
        success: false,
        error: { code: 'INVALID_TOKEN_FORMAT', message: 'Formato do token inválido.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Invalid token format',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash and lookup API key
    const tokenHash = await hashToken(token);
    const { data: apiKey, error: lookupError } = await supabase
      .from('api_keys')
      .select('id, name, user_id, revoked_at')
      .eq('key_hash', tokenHash)
      .single();

    if (lookupError || !apiKey) {
      console.log('[call-dial] API key not found:', lookupError?.message);
      const responseBody = {
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'API key inválida ou não encontrada.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'API key not found',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (apiKey.revoked_at) {
      console.log('[call-dial] API key has been revoked');
      const responseBody = {
        success: false,
        error: { code: 'API_KEY_REVOKED', message: 'Esta API key foi revogada.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        userId: apiKey.user_id,
        apiKeyId: apiKey.id,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'API key revoked',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!apiKey.user_id) {
      console.log('[call-dial] API key not linked to user');
      const responseBody = {
        success: false,
        error: { code: 'API_KEY_NOT_LINKED', message: 'API key não está vinculada a um usuário.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 403,
        responseTimeMs: Date.now() - startTime,
        apiKeyId: apiKey.id,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'API key not linked to user',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    userId = apiKey.user_id;
    apiKeyId = apiKey.id;

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id);

    // ==================== VALIDATE INPUT ====================
    if (!campaign_name || typeof campaign_name !== 'string') {
      const responseBody = {
        success: false,
        error: 'invalid_campaign_name',
        message: 'Nome da campanha é obrigatório'
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Invalid campaign_name',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!lead_phone || typeof lead_phone !== 'string') {
      const responseBody = {
        success: false,
        error: 'invalid_phone',
        message: 'Telefone do lead é obrigatório'
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Invalid lead_phone',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isValidPhone(lead_phone)) {
      const responseBody = {
        success: false,
        error: 'invalid_phone',
        message: 'Formato de telefone inválido. Use DDI + DDD + número (mínimo 10 dígitos)'
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Invalid phone format',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== FIND CAMPAIGN ====================
    console.log('[call-dial] Searching for campaign:', campaign_name);
    
    const { data: campaign, error: campaignError } = await supabase
      .from('call_campaigns')
      .select('id, name, status, user_id, dial_delay_minutes, company_id, retry_count')
      .eq('name', campaign_name)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaign) {
      console.log('[call-dial] Campaign not found:', campaignError?.message);
      const responseBody = {
        success: false,
        error: 'campaign_not_found',
        message: `Campanha '${campaign_name}' não encontrada`
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 404,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Campaign not found',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (campaign.status !== 'active') {
      console.log('[call-dial] Campaign is inactive:', campaign.status);
      const responseBody = {
        success: false,
        error: 'campaign_inactive',
        message: 'Campanha está inativa'
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-dial',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Campaign inactive',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== FIND OR CREATE LEAD ====================
    console.log('[call-dial] Searching for lead:', lead_phone);
    
    const cleanPhone = lead_phone.replace(/\D/g, '');
    
    const { data: existingLead, error: leadSearchError } = await supabase
      .from('call_leads')
      .select('id, phone, name, status')
      .eq('phone', cleanPhone)
      .eq('campaign_id', campaign.id)
      .single();

    let lead: { id: string; phone: string; name: string | null; status: string };

    if (existingLead) {
      // Update lead info if provided
      const updates: Record<string, any> = {};
      if (lead_name && lead_name !== existingLead.name) {
        updates.name = lead_name;
      }
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('call_leads')
          .update(updates)
          .eq('id', existingLead.id);
      }

      lead = { ...existingLead, ...updates };
      console.log('[call-dial] Found and updated existing lead:', lead.id);
    } else {
      // Create new lead
      console.log('[call-dial] Creating new lead');
      const { data: newLead, error: createLeadError } = await supabase
        .from('call_leads')
        .upsert({
          campaign_id: campaign.id,
          user_id: userId,
          company_id: campaign.company_id || null,
          phone: cleanPhone,
          name: lead_name || null,
          status: 'pending'
        }, { onConflict: 'phone,campaign_id' })
        .select('id, phone, name, status')
        .single();

      if (createLeadError || !newLead) {
        console.error('[call-dial] Failed to create lead:', createLeadError);
        throw new Error('Failed to create lead');
      }

      lead = newLead;
      console.log('[call-dial] Created new lead:', lead.id);
    }

    // ==================== OPERATOR: Auto (assigned at dial time) ====================
    console.log('[call-dial] Operator will be assigned at dial time (Auto mode)');

    // ==================== CREATE OR UPDATE CALL LOG ====================
    const dialDelayMinutes = campaign.dial_delay_minutes || 10;
    const scheduledFor = new Date(Date.now() + dialDelayMinutes * 60 * 1000).toISOString();

    // Check for existing active call_log for same lead + campaign
    const activeStatuses = ['scheduled', 'ready', 'dialing', 'ringing', 'answered', 'in_progress'];
    const { data: existingLog } = await supabase
      .from('call_logs')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('campaign_id', campaign.id)
      .in('call_status', activeStatuses)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let callLog: { id: string };

    if (existingLog) {
      // Update existing active call_log instead of creating duplicate
      console.log('[call-dial] Found existing active call_log, updating:', existingLog.id);
      const { error: updateError } = await supabase
        .from('call_logs')
        .update({
          operator_id: null,
          call_status: 'scheduled',
          scheduled_for: scheduledFor,
          started_at: new Date().toISOString(),
          observations: obs || null,
        })
        .eq('id', existingLog.id);

      if (updateError) {
        console.error('[call-dial] Failed to update call log:', updateError);
        throw new Error('Failed to update call log');
      }
      callLog = { id: existingLog.id };
    } else {
      // Create new call_log
      console.log('[call-dial] Creating new call log');
      const { data: newLog, error: callLogError } = await supabase
        .from('call_logs')
        .insert({
          campaign_id: campaign.id,
          lead_id: lead.id,
          operator_id: null,
          user_id: userId,
          company_id: campaign.company_id || null,
          call_status: 'scheduled',
          scheduled_for: scheduledFor,
          started_at: new Date().toISOString(),
          observations: obs || null,
          attempt_number: 1,
          max_attempts: campaign.retry_count ?? 3,
        })
        .select('id')
        .single();

      if (callLogError || !newLog) {
        console.error('[call-dial] Failed to create call log:', callLogError);
        throw new Error('Failed to create call log');
      }
      callLog = { id: newLog.id };
    }

    console.log('[call-dial] Call log ready:', callLog.id);

    // ==================== RESERVE OPERATOR ====================
    console.log('[call-dial] Attempting to reserve operator via RPC');
    
    let reservedOperator: { id: string; name: string; extension: string | null } | null = null;
    let callStatus = 'scheduled';

    try {
      const { data: reservation, error: rpcError } = await supabase
        .rpc('reserve_operator_for_call', {
          p_call_id: callLog.id,
          p_campaign_id: campaign.id
        });

      if (rpcError) {
        console.error('[call-dial] RPC error:', rpcError.message);
      } else if (reservation && reservation.length > 0 && reservation[0].success) {
        reservedOperator = {
          id: reservation[0].operator_id,
          name: reservation[0].operator_name,
          extension: reservation[0].operator_extension
        };
        callStatus = 'dialing';
        console.log('[call-dial] Operator reserved:', reservedOperator);

        // Update call_log with operator and status
        await supabase
          .from('call_logs')
          .update({
            operator_id: reservedOperator.id,
            call_status: 'dialing'
          })
          .eq('id', callLog.id);
      } else {
        console.log('[call-dial] No operator available, keeping scheduled status');
      }
    } catch (err) {
      console.error('[call-dial] Reserve operator error:', err);
    }

    // ==================== WALLET: RESERVE BALANCE FOR CALL ====================
    // Reserve R$ 0.80 (estimated 2 minutes @ R$ 0.40/min) before firing webhook
    let walletReservationId: string | null = null;
    if (reservedOperator && campaign.company_id) {
      try {
        const { data: resId, error: walletErr } = await supabase.rpc('wallet_reserve', {
          p_company_id: campaign.company_id,
          p_amount: 0.80,
          p_category: 'call',
          p_reference_type: 'call_log',
          p_reference_id: callLog.id,
        });
        if (walletErr) {
          console.error('[call-dial] Wallet reserve failed:', walletErr.message);
          // Insufficient balance — revert operator + mark log as failed
          await supabase.from('call_logs').update({
            call_status: 'failed',
            ended_at: new Date().toISOString(),
            notes: 'Saldo insuficiente na carteira',
          }).eq('id', callLog.id);
          await supabase.rpc('release_operator', { p_call_id: callLog.id, p_force: true }).catch(() => {});
          await supabase.from('call_leads').update({ status: 'pending', assigned_operator_id: null }).eq('id', lead.id);
          return new Response(JSON.stringify({
            success: false,
            error: 'insufficient_balance',
            message: 'Saldo insuficiente na carteira para realizar a ligação.',
          }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        walletReservationId = resId as unknown as string;
        console.log('[call-dial] Wallet reservation created:', walletReservationId);
      } catch (e) {
        console.error('[call-dial] Wallet reserve exception:', (e as Error).message);
      }
    }

    // ==================== UPDATE LEAD STATUS ====================
    console.log('[call-dial] Updating lead status');
    
    const { error: updateLeadError } = await supabase
      .from('call_leads')
      .update({ 
        status: callStatus === 'dialing' ? 'calling' : 'scheduled',
        last_attempt_at: new Date().toISOString(),
        attempts: (lead as any).attempts ? (lead as any).attempts + 1 : 1,
        assigned_operator_id: reservedOperator?.id || null
      })
      .eq('id', lead.id);

    if (updateLeadError) {
      console.error('[call-dial] Failed to update lead status:', updateLeadError);
    }

    // ==================== WEBHOOK INTEGRATION ====================
    // Only fire webhook if an operator was actually reserved
    let webhookResult: { called: boolean; url?: string; status?: number; response?: string; error?: string; reason?: string } = { 
      called: false, 
      reason: reservedOperator ? 'no_webhook_configured' : 'no_operator_reserved'
    };

    if (reservedOperator) {
      console.log('[call-dial] Operator reserved, checking for webhook configuration');
      
      const { data: webhookConfig } = await supabase
        .from('webhook_configs')
        .select('url, is_active')
        .eq('category', 'calls')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const webhookPayload = {
        action: 'call.dial',
        call: {
          id: callLog.id,
          status: callStatus,
          scheduled_for: scheduledFor,
          dial_in_minutes: dialDelayMinutes,
        },
        campaign: {
          id: campaign.id,
          name: campaign.name
        },
        lead: {
          id: lead.id,
          phone: lead.phone,
          name: lead.name || lead_name || null
        },
        operator: {
          id: reservedOperator.id,
          name: reservedOperator.name,
          extension: reservedOperator.extension
        }
      };

      if (webhookConfig?.is_active && webhookConfig?.url) {
        console.log('[call-dial] Calling webhook:', webhookConfig.url);
        try {
          // 60-second timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);

          const webhookResponse = await fetch(webhookConfig.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          const webhookData = await webhookResponse.text();
          webhookResult = {
            called: true,
            url: webhookConfig.url,
            status: webhookResponse.status,
            response: webhookData
          };
          console.log('[call-dial] Webhook response:', webhookResult);

          // Parse response and extract external call ID
          try {
            const parsedResponse = JSON.parse(webhookData);
            if (Array.isArray(parsedResponse) && parsedResponse[0]?.id) {
              // Detect operator_unavailable
              if (parsedResponse[0]?.message === 'operator_unavailable') {
                console.log('[call-dial] Operator unavailable from webhook, reverting');
                await supabase.from('call_logs').update({ call_status: 'scheduled', started_at: null, operator_id: null }).eq('id', callLog.id);
                await supabase.rpc('release_operator', { p_call_id: callLog.id, p_force: true });
                await supabase.from('call_leads').update({ status: 'pending', assigned_operator_id: null }).eq('id', lead.id);
                if (walletReservationId) {
                  await supabase.rpc('wallet_cancel_reservation', { p_reservation_id: walletReservationId }).catch(() => {});
                  walletReservationId = null;
                }
                callStatus = 'scheduled';
                reservedOperator = null;
              } else {
                const externalCallId = parsedResponse[0].id;
                console.log('[call-dial] External call ID received:', externalCallId);
                await supabase
                  .from('call_logs')
                  .update({ external_call_id: externalCallId })
                  .eq('id', callLog.id);
              }
            }
          } catch (parseError) {
            console.log('[call-dial] Could not parse webhook response as JSON');
          }
        } catch (error) {
          // Timeout or network failure → mark as failed, release operator, revert lead
          const isTimeout = error instanceof DOMException && error.name === 'AbortError';
          const failReason = isTimeout ? 'Timeout no acionamento da ligação (60s)' : 'Falha no acionamento da ligação';
          console.error('[call-dial] Webhook error:', failReason, error);

          await supabase.from('call_logs').update({
            call_status: 'failed',
            notes: failReason,
            ended_at: new Date().toISOString(),
            operator_id: null,
          }).eq('id', callLog.id);

          await supabase.rpc('release_operator', { p_call_id: callLog.id, p_force: true });
          await supabase.from('call_leads').update({ status: 'pending', assigned_operator_id: null }).eq('id', lead.id);

          callStatus = 'failed';
          reservedOperator = null;
          webhookResult = {
            called: true,
            url: webhookConfig.url,
            error: failReason
          };
        }
      } else {
        console.log('[call-dial] No active webhook configured for calls category');
      }
    } else {
      console.log('[call-dial] No operator available, lead stays scheduled for queue processing');
    }

    // ==================== SUCCESS RESPONSE ====================
    const responseBody = {
      success: true,
      call_id: callLog.id,
      status: callStatus,
      scheduled_for: scheduledFor,
      dial_in_minutes: dialDelayMinutes,
      campaign: {
        id: campaign.id,
        name: campaign.name
      },
      lead: {
        id: lead.id,
        phone: lead.phone,
        name: lead.name || lead_name || null
      },
      operator: reservedOperator ? {
        id: reservedOperator.id,
        name: reservedOperator.name,
        extension: reservedOperator.extension
      } : null,
      webhook: webhookResult
    };

    console.log('[call-dial] Success:', responseBody);

    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/call-dial',
      statusCode: 201,
      responseTimeMs: Date.now() - startTime,
      userId,
      apiKeyId,
      ipAddress,
      requestBody,
      responseBody: { success: true, call_id: callLog.id, webhook: { called: webhookResult.called } },
    });

    return new Response(JSON.stringify(responseBody), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[call-dial] Internal error:', error);
    const responseBody = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno ao processar requisição.' }
    };
    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/call-dial',
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      userId,
      apiKeyId,
      ipAddress,
      requestBody,
      responseBody,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify(responseBody), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
