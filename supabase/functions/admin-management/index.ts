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

    // Verify caller is superadmin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) throw new Error("Unauthorized");

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "superadmin")
      .maybeSingle();
    
    const isMaster = user.email === "estevaodutra.pmss@gmail.com";

    if (!roleData && !isMaster) {
      throw new Error("Forbidden: Superadmin access required");
    }

    const { action, payload } = await req.json();

    if (action === "create-company") {
      const { name, owner_id } = payload;
      
      // Create company
      const { data: company, error: companyError } = await adminClient
        .from("companies")
        .insert({ name, owner_id })
        .select()
        .single();
      
      if (companyError) throw companyError;

      // Create wallet
      const { error: walletError } = await adminClient
        .from("wallets")
        .insert({ company_id: company.id, balance: 0 });
      
      if (walletError) throw walletError;

      // Add owner as admin member
      const { error: memberError } = await adminClient
        .from("company_members")
        .insert({ company_id: company.id, user_id: owner_id, role: "admin" });
      
      if (memberError) throw memberError;

      return new Response(JSON.stringify({ success: true, company }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
