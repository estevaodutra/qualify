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

// Valid call statuses
const VALID_STATUSES = ['dialing', 'ringing', 'answered', 'ended', 'completed', 'busy', 'no_answer', 'not_found', 'voicemail', 'cancelled', 'timeout', 'error', 'failed'];

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
    const { external_call_id, status, campaign_name, lead_phone, lead_name, duration_seconds, error_message, audio_url } = requestBody;

    console.log('[call-status] Request received:', { external_call_id, status, campaign_name, lead_phone });

    // ==================== VALIDATE API KEY ====================
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[call-status] Missing or invalid Authorization header');
      const responseBody = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token de autenticação ausente ou inválido.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
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
      console.log('[call-status] Invalid token format');
      const responseBody = {
        success: false,
        error: { code: 'INVALID_TOKEN_FORMAT', message: 'Formato do token inválido.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
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
      console.log('[call-status] API key not found:', lookupError?.message);
      const responseBody = {
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'API key inválida ou não encontrada.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
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
      console.log('[call-status] API key has been revoked');
      const responseBody = {
        success: false,
        error: { code: 'API_KEY_REVOKED', message: 'Esta API key foi revogada.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
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
      console.log('[call-status] API key not linked to user');
      const responseBody = {
        success: false,
        error: { code: 'API_KEY_NOT_LINKED', message: 'API key não está vinculada a um usuário.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
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
    if (!external_call_id || typeof external_call_id !== 'string') {
      const responseBody = {
        success: false,
        error: 'invalid_external_call_id',
        message: 'external_call_id é obrigatório'
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Invalid external_call_id',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      const responseBody = {
        success: false,
        error: 'invalid_status',
        message: `Status inválido. Use: ${VALID_STATUSES.join(', ')}`
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
        errorMessage: 'Invalid status',
      });
      return new Response(JSON.stringify(responseBody), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ==================== FIND EXISTING CALL LOG ====================
    console.log('[call-status] Searching for call log by external_call_id:', external_call_id);
    
    const { data: existingLog, error: searchError } = await supabase
      .from('call_logs')
      .select('id, campaign_id, lead_id, operator_id, started_at, ended_at, call_status, company_id')
      .eq('external_call_id', external_call_id)
      .eq('user_id', userId)
      .single();

    let callLog = existingLog;
    let isCreated = false;

    // ==================== CREATE NEW CALL LOG IF NOT FOUND ====================
    if (!callLog) {
      console.log('[call-status] Call log not found, checking if we can create one');
      
      // Need campaign_name and lead_phone to create
      if (!campaign_name || !lead_phone) {
        const responseBody = {
          success: false,
          error: 'call_not_found',
          message: 'Ligação não encontrada e dados insuficientes para criar (necessário campaign_name e lead_phone)'
        };
        await logApiCall(supabase, {
          method: req.method,
          endpoint: '/call-status',
          statusCode: 404,
          responseTimeMs: Date.now() - startTime,
          userId,
          apiKeyId,
          ipAddress,
          requestBody,
          responseBody,
          errorMessage: 'Call not found and insufficient data to create',
        });
        return new Response(JSON.stringify(responseBody), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate phone
      if (!isValidPhone(lead_phone)) {
        const responseBody = {
          success: false,
          error: 'invalid_phone',
          message: 'Formato de telefone inválido. Use DDI + DDD + número (mínimo 10 dígitos)'
        };
        await logApiCall(supabase, {
          method: req.method,
          endpoint: '/call-status',
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

      // Find campaign by name
      console.log('[call-status] Searching for campaign:', campaign_name);
      const { data: campaign, error: campaignError } = await supabase
        .from('call_campaigns')
        .select('id, name, status, company_id')
        .eq('name', campaign_name)
        .eq('user_id', userId)
        .single();

      if (campaignError || !campaign) {
        console.log('[call-status] Campaign not found:', campaignError?.message);
        const responseBody = {
          success: false,
          error: 'campaign_not_found',
          message: `Campanha '${campaign_name}' não encontrada`
        };
        await logApiCall(supabase, {
          method: req.method,
          endpoint: '/call-status',
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

      // Find or create lead
      const cleanPhone = lead_phone.replace(/\D/g, '');
      let lead: { id: string } | null = null;

      const { data: existingLead } = await supabase
        .from('call_leads')
        .select('id')
        .eq('phone', cleanPhone)
        .eq('campaign_id', campaign.id)
        .single();

      if (existingLead) {
        lead = existingLead;
      } else {
        // Create new lead
        const { data: newLead, error: createLeadError } = await supabase
          .from('call_leads')
          .insert({
            campaign_id: campaign.id,
            user_id: userId,
            company_id: campaign.company_id || null,
            phone: cleanPhone,
            name: lead_name || null,
            status: 'calling'
          })
          .select('id')
          .single();

        if (createLeadError || !newLead) {
          console.error('[call-status] Failed to create lead:', createLeadError);
          throw new Error('Failed to create lead');
        }
        lead = newLead;
      }

      // Create new call log
      console.log('[call-status] Creating new call log');
      const { data: newCallLog, error: createLogError } = await supabase
        .from('call_logs')
        .insert({
          campaign_id: campaign.id,
          lead_id: lead.id,
          user_id: userId,
          company_id: campaign.company_id || null,
          external_call_id,
          call_status: (() => { const m: Record<string,string> = { 'dialing':'dialing','ringing':'ringing','answered':'on_call','ended':'completed','completed':'completed','busy':'busy','no_answer':'no_answer','not_found':'not_found','voicemail':'voicemail','cancelled':'cancelled','timeout':'timeout','error':'failed','failed':'failed' }; return m[status] || status; })(),
          started_at: status === 'dialing' ? new Date().toISOString() : null,
          ...(audio_url ? { audio_url } : {}),
        })
        .select('id, campaign_id, lead_id, operator_id, started_at, ended_at, call_status')
        .single();

      if (createLogError || !newCallLog) {
        console.error('[call-status] Failed to create call log:', createLogError);
        throw new Error('Failed to create call log');
      }

      callLog = newCallLog;
      isCreated = true;
      console.log('[call-status] Created new call log:', callLog.id);
    }

    // ==================== UPDATE CALL LOG STATUS ====================
    // Mapear status do provedor para status interno
    const statusMap: Record<string, string> = {
      'dialing': 'dialing',
      'ringing': 'ringing',
      'answered': 'on_call',
      'ended': 'completed',
      'completed': 'completed',
      'busy': 'busy',
      'no_answer': 'no_answer',
      'not_found': 'not_found',
      'voicemail': 'voicemail',
      'cancelled': 'cancelled',
      'timeout': 'timeout',
      'error': 'failed',
      'failed': 'failed',
    };
    let mappedStatus = statusMap[status] || status;

    // ==================== GUARD: REJECT DIALING/RINGING WITHOUT OPERATOR ====================
    if (['dialing', 'ringing'].includes(mappedStatus) && !callLog.operator_id && !isCreated) {
      console.log('[call-status] Ignoring dialing/ringing update: call has no operator assigned. call_log:', callLog.id);
      const responseBody = {
        success: true,
        message: 'Status ignorado: ligação sem operador atribuído',
        call_log_id: callLog.id,
        ignored: true,
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/call-status',
        statusCode: 200,
        responseTimeMs: Date.now() - startTime,
        userId,
        apiKeyId,
        ipAddress,
        requestBody,
        responseBody,
      });
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updateData: any = {
      call_status: mappedStatus,
      ...(audio_url ? { audio_url } : {}),
    };

    // Handle status-specific updates
    if (status === 'dialing') {
      if (!callLog.started_at) {
        updateData.started_at = new Date().toISOString();
      }
    } else if (status === 'ringing') {
      // Ringing — no special handling needed
    } else if (status === 'answered') {
      // answered = lead picked up, call is IN PROGRESS (on_call)
      // If provider sends duration_seconds with answered, treat as completed
      if (duration_seconds !== undefined && duration_seconds !== null) {
        console.log('[call-status] "answered" with duration_seconds detected — treating as completed');
        mappedStatus = 'completed';
        updateData.call_status = 'completed';
        updateData.ended_at = new Date().toISOString();
        updateData.duration_seconds = duration_seconds;
      }
      if (!callLog.started_at) {
        updateData.started_at = new Date().toISOString();
      }
    } else if (status === 'ended' || status === 'completed') {
      updateData.ended_at = new Date().toISOString();
      if (duration_seconds !== undefined && duration_seconds !== null) {
        updateData.duration_seconds = duration_seconds;
      } else if (callLog.started_at) {
        const startedAt = new Date(callLog.started_at);
        const endedAt = new Date();
        updateData.duration_seconds = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
      }
    } else if (status === 'no_answer') {
      updateData.ended_at = new Date().toISOString();
    } else if (['busy', 'not_found', 'voicemail', 'cancelled', 'timeout'].includes(status)) {
      updateData.ended_at = new Date().toISOString();
      if (error_message && ['not_found', 'voicemail', 'timeout'].includes(status)) {
        updateData.notes = error_message;
      }
    } else if (status === 'error' || status === 'failed') {
      updateData.ended_at = new Date().toISOString();
      if (error_message) {
        updateData.notes = error_message;
      }
    }

    // Only update if not just created (avoid double write)
    if (!isCreated) {
      console.log('[call-status] Updating call log:', callLog.id, updateData);
      const { error: updateError } = await supabase
        .from('call_logs')
        .update(updateData)
        .eq('id', callLog.id);

      if (updateError) {
        console.error('[call-status] Failed to update call log:', updateError);
        throw new Error('Failed to update call log');
      }
    }

    // ==================== REMOVE FROM CALL QUEUE ON TERMINAL STATUS ====================
    const ALL_TERMINAL = ['completed', 'no_answer', 'voicemail', 'failed', 'busy', 'not_found', 'cancelled', 'timeout'];
    if (ALL_TERMINAL.includes(mappedStatus)) {
      // ==================== WALLET: FINALIZE OR CANCEL RESERVATION ====================
      try {
        const { data: reservations } = await supabase
          .from('wallet_reservations')
          .select('id')
          .eq('reference_type', 'call_log')
          .eq('reference_id', callLog.id)
          .eq('status', 'active')
          .limit(1);

        const reservationId = reservations && reservations[0]?.id;
        if (reservationId) {
          if (mappedStatus === 'completed' && updateData.duration_seconds && updateData.duration_seconds > 0) {
            const minutes = Math.ceil(updateData.duration_seconds / 60);
            const cost = +(minutes * 0.40).toFixed(2);
            console.log('[call-status] Finalizing wallet reservation:', reservationId, 'cost:', cost);
            await supabase.rpc('wallet_finalize_reservation', {
              p_reservation_id: reservationId,
              p_actual_amount: cost,
              p_description: `Ligação ${minutes} min`,
              p_metadata: { call_log_id: callLog.id, duration_seconds: updateData.duration_seconds, minutes },
            });
          } else {
            console.log('[call-status] Cancelling wallet reservation (no charge):', reservationId);
            await supabase.rpc('wallet_cancel_reservation', { p_reservation_id: reservationId });
          }
        }
      } catch (walletErr) {
        console.error('[call-status] Wallet handling error:', (walletErr as Error).message);
      }

      console.log('[call-status] Removing from call_queue for call_log_id:', callLog.id);
      const { data: deleted } = await supabase
        .from('call_queue')
        .delete()
        .eq('call_log_id', callLog.id)
        .select('id');

      // Fallback: if nothing was deleted, try by lead_id + campaign_id + status in_call
      if ((!deleted || deleted.length === 0) && callLog.lead_id && callLog.campaign_id) {
        console.log('[call-status] Fallback: removing by lead_id + campaign_id + status in_call');
        await supabase
          .from('call_queue')
          .delete()
          .eq('lead_id', callLog.lead_id)
          .eq('campaign_id', callLog.campaign_id)
          .eq('status', 'in_call');
      }
    }

    // ==================== RELEASE OPERATOR ON TERMINAL STATUS ====================
    const TERMINAL_WITH_COOLDOWN = ['completed', 'no_answer', 'voicemail'];
    const TERMINAL_NO_COOLDOWN = ['failed', 'busy', 'not_found', 'cancelled', 'timeout'];

    if (TERMINAL_WITH_COOLDOWN.includes(mappedStatus) && callLog.operator_id) {
      // Release with cooldown via RPC
      console.log('[call-status] Releasing operator WITH cooldown for call:', callLog.id);
      const { data: releaseResult, error: releaseError } = await supabase.rpc('release_operator', {
        p_call_id: callLog.id,
        p_force: false,
      });

      if (releaseError) {
        console.error('[call-status] RPC release_operator error:', releaseError);
      } else if (releaseResult?.[0]?.success) {
        console.log('[call-status] Operator released:', releaseResult[0].released_operator_id, 'new_status:', releaseResult[0].new_status, 'cooldown:', releaseResult[0].cooldown_seconds);
      } else {
        console.log('[call-status] release_operator returned no match, trying force release');
        await supabase.rpc('release_operator', { p_call_id: callLog.id, p_force: true });
      }
    } else if (TERMINAL_NO_COOLDOWN.includes(mappedStatus) && callLog.operator_id) {
      // Release immediately without cooldown — operator goes straight to available
      console.log('[call-status] Releasing operator IMMEDIATELY (no cooldown) for call:', callLog.id);
      const { error: releaseError } = await supabase
        .from('call_operators')
        .update({
          status: 'available',
          current_call_id: null,
          current_campaign_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', callLog.operator_id)
        .eq('current_call_id', callLog.id);

      if (releaseError) {
        console.error('[call-status] Immediate release error:', releaseError);
        // Fallback: force release via RPC
        await supabase.rpc('release_operator', { p_call_id: callLog.id, p_force: true });
      } else {
        console.log('[call-status] Operator immediately released to available');
      }
    }

    // ==================== UPDATE LEAD STATUS ====================
    if (callLog.lead_id) {
      let leadStatus = 'calling';
      if (mappedStatus === 'completed') {
        leadStatus = 'completed';
      } else if (['no_answer', 'voicemail', 'cancelled'].includes(mappedStatus)) {
        leadStatus = 'pending'; // will have retry
      } else if (['failed', 'busy', 'not_found', 'timeout'].includes(mappedStatus)) {
        leadStatus = 'failed';
      }

      await supabase
        .from('call_leads')
        .update({ status: leadStatus })
        .eq('id', callLog.lead_id);
    }

    // ==================== RETRY LOGIC (REPLACES OLD RESCHEDULING) ====================
    const FAILURE_STATUSES = ['failed', 'busy', 'no_answer', 'not_found', 'voicemail', 'timeout', 'cancelled'];
    let rescheduled = false;

    if (FAILURE_STATUSES.includes(mappedStatus) && callLog.lead_id && callLog.campaign_id) {
      console.log(`[call-status] Failure detected, checking retry config for campaign: ${callLog.campaign_id}`);

      // Fetch campaign retry config + current call attempt info
      const { data: campaignData } = await supabase
        .from('call_campaigns')
        .select('retry_count, retry_interval_minutes, retry_exceeded_behavior, retry_exceeded_action_id, company_id')
        .eq('id', callLog.campaign_id)
        .single();

      const { data: currentLog } = await supabase
        .from('call_logs')
        .select('attempt_number, max_attempts')
        .eq('id', callLog.id)
        .single();

      const retryCount = campaignData?.retry_count ?? 3;
      const retryIntervalMinutes = campaignData?.retry_interval_minutes ?? 30;
      const retryExceededBehavior = campaignData?.retry_exceeded_behavior ?? 'mark_failed';
      const retryExceededActionId = campaignData?.retry_exceeded_action_id ?? null;
      const currentAttempt = currentLog?.attempt_number ?? 1;

      if (retryCount > 0 && currentAttempt < retryCount) {
        // Schedule next attempt
        const nextRetryAt = new Date(Date.now() + retryIntervalMinutes * 60 * 1000);

        const { data: activeOperators } = await supabase
          .from('call_operators')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true);

        const newOperatorId = activeOperators && activeOperators.length > 0
          ? activeOperators[Math.floor(Math.random() * activeOperators.length)].id
          : callLog.operator_id;

        const retryCompanyId = callLog.company_id || campaignData?.company_id || null;

        const { error: scheduleError } = await supabase
          .from('call_logs')
          .insert({
            campaign_id: callLog.campaign_id,
            lead_id: callLog.lead_id,
            operator_id: newOperatorId,
            user_id: userId,
            call_status: 'scheduled',
            scheduled_for: nextRetryAt.toISOString(),
            attempt_number: currentAttempt + 1,
            max_attempts: retryCount,
            next_retry_at: nextRetryAt.toISOString(),
            company_id: retryCompanyId,
          });

        if (!scheduleError) {
          await supabase
            .from('call_leads')
            .update({ status: 'pending', assigned_operator_id: newOperatorId })
            .eq('id', callLog.lead_id);

          await supabase
            .from('call_logs')
            .update({ call_status: `${mappedStatus}_rescheduled` })
            .eq('id', callLog.id);

          rescheduled = true;
          console.log(`[call-status] Retry ${currentAttempt + 1}/${retryCount} scheduled for ${nextRetryAt.toISOString()}`);
        } else {
          console.error('[call-status] Failed to schedule retry:', scheduleError);
        }
      } else if (retryCount > 0 && currentAttempt >= retryCount) {
        // Max retries exceeded
        console.log(`[call-status] Max retries exceeded (${currentAttempt}/${retryCount})`);

        await supabase
          .from('call_logs')
          .update({ call_status: 'max_attempts_exceeded' })
          .eq('id', callLog.id);

        if (retryExceededBehavior === 'execute_action' && retryExceededActionId) {
          console.log(`[call-status] Executing exceeded action: ${retryExceededActionId}`);
          try {
            await supabase.functions.invoke('execute-call-action', {
              body: {
                action_id: retryExceededActionId,
                lead_id: callLog.lead_id,
                campaign_id: callLog.campaign_id,
              },
            });
          } catch (e) {
            console.error('[call-status] Failed to invoke exceeded action:', e);
          }
        }
      }
      // retryCount === 0 means no retries configured — do nothing extra
    }


    // ==================== SUCCESS RESPONSE ====================
    const responseBody = {
      success: true,
      call_id: callLog.id,
      external_call_id,
      status,
      duration_seconds: updateData.duration_seconds || null,
      ...(isCreated && { created: true }),
      ...(rescheduled && { rescheduled: true }),
    };

    console.log('[call-status] Success:', responseBody);

    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/call-status',
      statusCode: isCreated ? 201 : 200,
      responseTimeMs: Date.now() - startTime,
      userId,
      apiKeyId,
      ipAddress,
      requestBody,
      responseBody,
    });

    return new Response(JSON.stringify(responseBody), {
      status: isCreated ? 201 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[call-status] Internal error:', error);
    const responseBody = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno ao processar requisição.' }
    };
    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/call-status',
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
