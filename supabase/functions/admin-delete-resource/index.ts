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
    const authHeader = req.headers.get("Authorization")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller authentication
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) throw new Error("Unauthorized");

    // Check if caller is superadmin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "superadmin")
      .maybeSingle();
    
    const isMaster = user.email === "estevaodutra.pmss@gmail.com";

    if (!roleData && !isMaster) {
      return new Response(JSON.stringify({ error: "Forbidden: Superadmin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { resourceType, resourceId, confirmation } = await req.json();

    if (!resourceType || !resourceId || !confirmation) {
      throw new Error("Missing required parameters: resourceType, resourceId, confirmation");
    }

    const ipAddress = req.headers.get("x-forwarded-for") || "";
    const userAgent = req.headers.get("user-agent") || "";

    if (resourceType === "user") {
      const { error: rpcError } = await adminClient.rpc("admin_soft_delete_user", {
        target_user_id: resourceId,
        actor_user_id: user.id,
        actor_email: user.email,
        confirmation_email: confirmation,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      if (rpcError) throw new Error(rpcError.message);

      return new Response(JSON.stringify({ success: true, message: "Usuário excluído com sucesso." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resourceType === "company") {
      const { error: rpcError } = await adminClient.rpc("admin_soft_delete_company", {
        target_company_id: resourceId,
        actor_user_id: user.id,
        actor_email: user.email,
        confirmation_name: confirmation,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      if (rpcError) throw new Error(rpcError.message);

      return new Response(JSON.stringify({ success: true, message: "Empresa excluída com sucesso." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Invalid resourceType: ${resourceType}`);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
