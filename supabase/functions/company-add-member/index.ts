import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const envUrl = Deno.env.get("SUPABASE_URL")!;
    // Use internal docker network to avoid 2s wall-clock timeouts when connecting to public IP
    const supabaseUrl = envUrl.includes("qualify.app") || envUrl.includes("108.174") ? "http://kong:8000" : envUrl;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = user.id;

    const { action, email, role, extension, company_id, member_id, user_id } = await req.json();

    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if user is superadmin
    let isAdmin = user.email === "estevaodutra.pmss@gmail.com";
    if (!isAdmin) {
      const { data: superAdminRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "superadmin")
        .maybeSingle();
      if (superAdminRole) isAdmin = true;
    }

    if (!isAdmin) {
      // Verify caller is admin of the company
      const { data: callerMember } = await adminClient
        .from("company_members")
        .select("role")
        .eq("company_id", company_id)
        .eq("user_id", callerId)
        .eq("is_active", true)
        .maybeSingle();

      if (callerMember && callerMember.role === "admin") {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "not_admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove") {
      if (!member_id && !user_id) {
         return new Response(JSON.stringify({ error: "member_id or user_id required for remove" }), { status: 400, headers: corsHeaders });
      }
      
      let targetUserId = user_id;
      if (!targetUserId) {
        const { data: member } = await adminClient.from("company_members").select("user_id").eq("id", member_id).single();
        if (member) targetUserId = member.user_id;
      }

      if (member_id) {
        await adminClient.from("company_members").delete().eq("id", member_id).eq("company_id", company_id);
      }
      if (targetUserId) {
        await adminClient.from("company_members").delete().eq("user_id", targetUserId).eq("company_id", company_id);
        await adminClient.from("call_operators").delete().eq("user_id", targetUserId).eq("company_id", company_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_extension") {
      if (!user_id) {
         return new Response(JSON.stringify({ error: "user_id required for update_extension" }), { status: 400, headers: corsHeaders });
      }
      
      await adminClient.from("call_operators").update({ extension: extension || null }).eq("user_id", user_id).eq("company_id", company_id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: Add member
    if (!email) {
      return new Response(JSON.stringify({ error: "email required for adding member" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find user by email in profiles
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, full_name, email")
      .eq("email", email.toLowerCase())
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already a member
    const { data: existing } = await adminClient
      .from("company_members")
      .select("id")
      .eq("company_id", company_id)
      .eq("user_id", profile.id)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: "already_member" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create company member
    const memberRole = role === "admin" ? "admin" : "operator";
    const { error: memberError } = await adminClient
      .from("company_members")
      .insert({
        company_id,
        user_id: profile.id,
        role: memberRole,
      });

    if (memberError) throw memberError;

    // If operator role, also create a call_operator record
    if (memberRole === "operator") {
      const { error: opError } = await adminClient
        .from("call_operators")
        .insert({
          user_id: profile.id,
          company_id,
          operator_name: profile.full_name || profile.email,
          extension: extension || null,
          is_active: true,
          status: "offline",
        });

      if (opError) {
        console.error("Failed to create call_operator:", opError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        member_name: profile.full_name || profile.email,
        member_id: profile.id,
        role: memberRole,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
