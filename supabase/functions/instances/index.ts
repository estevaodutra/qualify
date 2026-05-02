import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hash token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Validate API key from Authorization header
async function validateApiKey(
  supabase: any,
  authHeader: string | null
): Promise<{ valid: boolean; error?: string; apiKey?: any }> {
  if (!authHeader) {
    return { valid: false, error: "Authorization header missing" };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return { valid: false, error: "Token not provided" };
  }

  // Validate token format
  if (!token.startsWith("pk_live_") && !token.startsWith("pk_test_")) {
    return { valid: false, error: "Invalid token format" };
  }

  try {
    const keyHash = await hashToken(token);

    const { data: apiKey, error } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .single();

    if (error || !apiKey) {
      return { valid: false, error: "API key not found" };
    }

    if (apiKey.revoked_at) {
      return { valid: false, error: "API key has been revoked" };
    }

    // Update last_used_at
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKey.id);

    return { valid: true, apiKey };
  } catch (err) {
    console.error("Error validating API key:", err);
    return { valid: false, error: "Error validating API key" };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only GET requests are allowed"
        }
      }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const authHeader = req.headers.get("Authorization");
    const validation = await validateApiKey(supabase, authHeader);

    if (!validation.valid) {
      console.log("API key validation failed:", validation.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: validation.error
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Parse query parameters for pagination
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // Validate pagination params
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));

    // Calculate offset for pagination
    const offset = (validPage - 1) * validLimit;

    console.log(`Listing instances - page: ${validPage}, limit: ${validLimit}, offset: ${offset}`);

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from("instances")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error counting instances:", countError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Error counting instances"
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Fetch paginated instances from database
    const { data: instances, error: dbError } = await supabase
      .from("instances")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + validLimit - 1);

    if (dbError) {
      console.error("Error fetching instances:", dbError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Error fetching instances"
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Map database columns to camelCase response
    const mappedInstances = (instances || []).map((inst: any) => ({
      id: inst.id,
      name: inst.name,
      phone: inst.phone,
      status: inst.status,
      provider: inst.provider,
      externalInstanceId: inst.external_instance_id,
      externalInstanceToken: inst.external_instance_token,
      createdAt: inst.created_at,
      lastMessageAt: inst.last_message_at,
      messagesCount: inst.messages_count
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: mappedInstances,
        pagination: {
          page: validPage,
          limit: validLimit,
          total: totalCount || 0
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error in instances function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal error occurred"
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
