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

Deno.serve(async (req) => {
  const startTime = Date.now();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
                 || req.headers.get('x-real-ip') 
                 || 'unknown';

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      const responseBody = {
        valid: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token de autenticação ausente ou inválido.'
        }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/validate-api-key',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        ipAddress,
        responseBody,
        errorMessage: 'Missing or invalid Authorization header',
      });
      return new Response(
        JSON.stringify(responseBody),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Validate token format (should start with pk_live_ or pk_test_)
    if (!token.startsWith('pk_live_') && !token.startsWith('pk_test_')) {
      console.log('Invalid token format');
      const responseBody = {
        valid: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Formato do token inválido.'
        }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/validate-api-key',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        ipAddress,
        responseBody,
        errorMessage: 'Invalid token format',
      });
      return new Response(
        JSON.stringify(responseBody),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Hash the token for lookup
    const tokenHash = await hashToken(token);

    // Look up the API key by hash
    const { data: apiKey, error: lookupError } = await supabase
      .from('api_keys')
      .select('id, name, environment, revoked_at, created_at, user_id')
      .eq('key_hash', tokenHash)
      .single();

    if (lookupError || !apiKey) {
      console.log('API key not found:', lookupError?.message);
      const responseBody = {
        valid: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'API key inválida ou não encontrada.'
        }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/validate-api-key',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        ipAddress,
        responseBody,
        errorMessage: 'API key not found',
      });
      return new Response(
        JSON.stringify(responseBody),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if the key has been revoked
    if (apiKey.revoked_at) {
      console.log('API key has been revoked');
      const responseBody = {
        valid: false,
        error: {
          code: 'API_KEY_REVOKED',
          message: 'Esta API key foi revogada.'
        }
      };
      await logApiCall(supabase, {
        method: req.method,
        endpoint: '/validate-api-key',
        statusCode: 401,
        responseTimeMs: Date.now() - startTime,
        userId: apiKey.user_id,
        apiKeyId: apiKey.id,
        ipAddress,
        responseBody,
        errorMessage: 'API key revoked',
      });
      return new Response(
        JSON.stringify(responseBody),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update last_used_at timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id);

    console.log('API key validated successfully:', apiKey.name);

    const responseBody = {
      valid: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        environment: apiKey.environment,
        createdAt: apiKey.created_at
      }
    };

    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/validate-api-key',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      userId: apiKey.user_id,
      apiKeyId: apiKey.id,
      ipAddress,
      responseBody: { valid: true, apiKeyName: apiKey.name },
    });

    return new Response(
      JSON.stringify(responseBody),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error validating API key:', error);
    const responseBody = {
      valid: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno ao validar API key.'
      }
    };
    await logApiCall(supabase, {
      method: req.method,
      endpoint: '/validate-api-key',
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      ipAddress,
      responseBody,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(
      JSON.stringify(responseBody),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
