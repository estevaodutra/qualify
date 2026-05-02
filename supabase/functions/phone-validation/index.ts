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

// Validate API key
async function validateApiKey(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Token de autenticação ausente ou inválido.' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token.startsWith('pk_live_') && !token.startsWith('pk_test_')) {
    return { valid: false, error: 'Formato do token inválido.' };
  }

  const tokenHash = await hashToken(token);

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('id, name, environment, revoked_at, user_id')
    .eq('key_hash', tokenHash)
    .maybeSingle();

  if (error || !apiKey) {
    return { valid: false, error: 'API key inválida ou não encontrada.' };
  }

  if (apiKey.revoked_at) {
    return { valid: false, error: 'Esta API key foi revogada.' };
  }

  if (!apiKey.user_id) {
    return { valid: false, error: 'API key não está vinculada a um usuário.', code: 'API_KEY_NOT_LINKED' };
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id);

  return { valid: true, apiKey };
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
                 || req.headers.get('x-real-ip') 
                 || 'unknown';

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (req.method !== 'POST') {
    const responseBody = {
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Apenas POST é permitido.' }
    };
    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/phone-validation',
      statusCode: 405,
      responseTimeMs: Date.now() - startTime,
      ipAddress,
      responseBody,
      errorMessage: 'Method not allowed',
    });
    return new Response(
      JSON.stringify(responseBody),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate API key
    const authHeader = req.headers.get('Authorization');
    const authResult = await validateApiKey(supabase, authHeader);

    if (!authResult.valid) {
      const responseBody = {
        success: false,
        error: { code: authResult.code || 'UNAUTHORIZED', message: authResult.error }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/phone-validation',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        ipAddress,
        responseBody,
        errorMessage: authResult.error,
      });
      return new Response(
        JSON.stringify(responseBody),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      const responseBody = {
        success: false,
        error: { code: 'INVALID_PAYLOAD', message: 'O campo "phone" é obrigatório.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/phone-validation',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId: authResult.apiKey?.user_id,
        apiKeyId: authResult.apiKey?.id,
        ipAddress,
        requestBody: { phone: null },
        responseBody,
        errorMessage: 'Missing phone field',
      });
      return new Response(
        JSON.stringify(responseBody),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone format (only numbers, min 10 digits)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      const responseBody = {
        success: false,
        error: { code: 'INVALID_PHONE', message: 'Número de telefone inválido. Use formato DDI+DDD+Número.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/phone-validation',
        statusCode: 400,
        responseTimeMs: Date.now() - startTime,
        userId: authResult.apiKey?.user_id,
        apiKeyId: authResult.apiKey?.id,
        ipAddress,
        requestBody: { phone: cleanPhone },
        responseBody,
        errorMessage: 'Invalid phone format',
      });
      return new Response(
        JSON.stringify(responseBody),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find ANY connected instance available in the system
    console.log('[phone-validation] Looking for any connected instance...');

    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('id, name, provider, external_instance_id, external_instance_token')
      .eq('status', 'connected')
      .not('external_instance_id', 'is', null)
      .not('external_instance_token', 'is', null)
      .limit(1)
      .maybeSingle();

    if (instanceError) {
      console.error('[phone-validation] Error fetching instance:', instanceError);
      const responseBody = {
        success: false,
        error: { code: 'DB_ERROR', message: 'Erro ao buscar instância conectada.' }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/phone-validation',
        statusCode: 500,
        responseTimeMs: Date.now() - startTime,
        userId: authResult.apiKey?.user_id,
        apiKeyId: authResult.apiKey?.id,
        ipAddress,
        requestBody: { phone: cleanPhone },
        responseBody,
        errorMessage: instanceError.message,
      });
      return new Response(
        JSON.stringify(responseBody),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!instance) {
      console.log('[phone-validation] No connected instance available in the system');
      const responseBody = {
        success: false,
        error: {
          code: 'NO_CONNECTED_INSTANCE',
          message: 'Nenhuma instância WhatsApp está conectada para fazer a validação.'
        }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/phone-validation',
        statusCode: 503,
        responseTimeMs: Date.now() - startTime,
        userId: authResult.apiKey?.user_id,
        apiKeyId: authResult.apiKey?.id,
        ipAddress,
        requestBody: { phone: cleanPhone },
        responseBody,
        errorMessage: 'No connected instance available',
      });
      return new Response(
        JSON.stringify(responseBody),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!instance.external_instance_id || !instance.external_instance_token) {
      const responseBody = {
        success: false,
        error: {
          code: 'INSTANCE_NOT_CONFIGURED',
          message: 'A instância conectada não possui credenciais do provedor configuradas.'
        }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/phone-validation',
        statusCode: 503,
        responseTimeMs: Date.now() - startTime,
        userId: authResult.apiKey?.user_id,
        apiKeyId: authResult.apiKey?.id,
        ipAddress,
        requestBody: { phone: cleanPhone },
        responseBody,
        errorMessage: 'Instance not configured',
      });
      return new Response(
        JSON.stringify(responseBody),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send to n8n webhook for phone validation
    const webhookUrl = 'https://n8n-n8n.nuwfic.easypanel.host/webhook/events_sent';

    console.log(`Sending phone validation to webhook: ${cleanPhone}`);

    const webhookPayload = {
      action: 'validation.phone_exists',
      instance: {
        id: instance.id,
        name: instance.name,
        provider: instance.provider,
        external_instance_id: instance.external_instance_id,
        external_instance_token: instance.external_instance_token
      },
      phone: cleanPhone
    };

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook error:', webhookResponse.status, errorText);
      const responseBody = {
        success: false,
        error: {
          code: 'WEBHOOK_ERROR',
          message: 'Erro ao consultar o webhook de validação.'
        }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/phone-validation',
        statusCode: 502,
        responseTimeMs: Date.now() - startTime,
        userId: authResult.apiKey?.user_id,
        apiKeyId: authResult.apiKey?.id,
        ipAddress,
        requestBody: { phone: cleanPhone },
        responseBody,
        errorMessage: `Webhook error: ${webhookResponse.status}`,
      });
      return new Response(
        JSON.stringify(responseBody),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ler resposta como texto primeiro para debug
    const responseText = await webhookResponse.text();
    console.log('[phone-validation] Webhook raw response:', responseText);

    // Tentar parsear JSON, tratar resposta vazia
    let result: any = null;
    if (responseText && responseText.trim()) {
      try {
        result = JSON.parse(responseText);
        console.log('[phone-validation] Webhook parsed response:', result);
      } catch (parseError) {
        console.error('[phone-validation] Failed to parse webhook response:', parseError);
        const responseBody = {
          success: false,
          error: {
            code: 'WEBHOOK_PARSE_ERROR',
            message: 'Resposta do webhook em formato inválido.'
          }
        };
        await logApiCall(supabase, {
          method: req.method,
          endpoint: '/phone-validation',
          statusCode: 502,
          responseTimeMs: Date.now() - startTime,
          userId: authResult.apiKey?.user_id,
          apiKeyId: authResult.apiKey?.id,
          ipAddress,
          requestBody: { phone: cleanPhone },
          responseBody,
          errorMessage: 'Webhook parse error',
        });
        return new Response(
          JSON.stringify(responseBody),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.warn('[phone-validation] Webhook returned empty response');
      const responseBody = {
        success: false,
        error: {
          code: 'WEBHOOK_EMPTY_RESPONSE',
          message: 'O webhook de validação retornou uma resposta vazia. Verifique a configuração do n8n.'
        }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/phone-validation',
        statusCode: 502,
        responseTimeMs: Date.now() - startTime,
        userId: authResult.apiKey?.user_id,
        apiKeyId: authResult.apiKey?.id,
        ipAddress,
        requestBody: { phone: cleanPhone },
        responseBody,
        errorMessage: 'Webhook empty response',
      });
      return new Response(
        JSON.stringify(responseBody),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se o resultado for um array, pegar o primeiro elemento
    const data = Array.isArray(result) ? result[0] : result;

    const responseBody = {
      success: true,
      exists: data?.exists === true || data?.exists === 'true',
      phone: data?.phone || cleanPhone,
      lid: data?.lid || null,
      instance_used: instance.name
    };

    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/phone-validation',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      userId: authResult.apiKey?.user_id,
      apiKeyId: authResult.apiKey?.id,
      ipAddress,
      requestBody: { phone: cleanPhone },
      responseBody: { success: true, exists: responseBody.exists },
    });

    return new Response(
      JSON.stringify(responseBody),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating phone:', error);
    const responseBody = {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno ao validar número.' }
    };
    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/phone-validation',
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      ipAddress,
      responseBody,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(
      JSON.stringify(responseBody),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
