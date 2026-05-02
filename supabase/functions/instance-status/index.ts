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

// Valid status values
const VALID_STATUSES = ["connected", "disconnected", "waiting connection"];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow PUT requests
  if (req.method !== "PUT") {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only PUT requests are allowed"
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

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INVALID_JSON",
            message: "Request body must be valid JSON"
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const { instanceId, status } = body;

    // Validate required parameters
    if (!instanceId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "MISSING_PARAMETER",
            message: "instanceId is required"
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!status) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "MISSING_PARAMETER",
            message: "status is required"
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Validate status value
    if (!VALID_STATUSES.includes(status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: `Status inválido. Use: ${VALID_STATUSES.map(s => `'${s}'`).join(", ")}.`
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Fetch instance from database
    const { data: instance, error: fetchError } = await supabase
      .from("instances")
      .select("id, status")
      .eq("id", instanceId)
      .single();

    if (fetchError || !instance) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INSTANCE_NOT_FOUND",
            message: "Instância não encontrada."
          }
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const previousStatus = instance.status;
    
    // Update status in database
    const { error: updateError } = await supabase
      .from("instances")
      .update({ status })
      .eq("id", instanceId);

    if (updateError) {
      console.error("Error updating instance status:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "UPDATE_FAILED",
            message: "Falha ao atualizar status da instância."
          }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Instance ${instanceId} status updated: ${previousStatus} -> ${status}`);

    // Auto-register phone number when instance becomes connected
    if (status === "connected" && previousStatus !== "connected") {
      try {
        // Fetch full instance data including phone and user_id
        const { data: fullInstance, error: fetchFullError } = await supabase
          .from("instances")
          .select("phone, provider, user_id")
          .eq("id", instanceId)
          .single();

        if (!fetchFullError && fullInstance?.phone && fullInstance?.user_id) {
          // Check if phone number already exists for this user
          const { data: existingNumber } = await supabase
            .from("phone_numbers")
            .select("id")
            .eq("number", fullInstance.phone)
            .eq("user_id", fullInstance.user_id)
            .maybeSingle();

          if (existingNumber) {
            // Update existing record to connected
            await supabase
              .from("phone_numbers")
              .update({
                connected: true,
                status: "active",
                instance_id: instanceId,
                health: 100,
              })
              .eq("id", existingNumber.id);
            console.log(`Phone number ${fullInstance.phone} updated to connected`);
          } else {
            // Create new phone number record
            const { error: insertError } = await supabase
              .from("phone_numbers")
              .insert({
                user_id: fullInstance.user_id,
                instance_id: instanceId,
                number: fullInstance.phone,
                type: "whatsapp_normal",
                provider: fullInstance.provider,
                status: "active",
                connected: true,
                health: 100,
              });

            if (insertError) {
              console.error("Error auto-registering phone number:", insertError);
            } else {
              console.log(`Phone number ${fullInstance.phone} auto-registered`);
            }
          }
        }
      } catch (phoneErr) {
        console.error("Error in phone number auto-registration:", phoneErr);
        // Don't fail the main request if phone registration fails
      }
    }

    // Update phone number to disconnected when instance disconnects
    if (status === "disconnected" && previousStatus === "connected") {
      try {
        await supabase
          .from("phone_numbers")
          .update({ connected: false, status: "paused" })
          .eq("instance_id", instanceId);
        console.log(`Phone numbers for instance ${instanceId} marked as disconnected`);
      } catch (phoneErr) {
        console.error("Error updating phone number status:", phoneErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        instanceId,
        previousStatus,
        newStatus: status,
        updatedAt: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error in instance-status function:", error);
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
