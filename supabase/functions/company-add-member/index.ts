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

    const { action, email, role, extension, api4com_token, company_id, member_id, user_id } = await req.json();

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

    if (action === "update_extension" || action === "update_telephony") {
      if (!user_id) {
         return new Response(JSON.stringify({ error: "user_id required for update" }), { status: 400, headers: corsHeaders });
      }

      const cleanExtension = extension !== undefined ? (extension ? String(extension).trim() : null) : undefined;
      const cleanToken = api4com_token !== undefined ? (api4com_token ? String(api4com_token).trim() : null) : undefined;

      const { data: existingOp } = await adminClient
        .from("call_operators")
        .select("id")
        .eq("user_id", user_id)
        .eq("company_id", company_id)
        .maybeSingle();

      if (existingOp) {
        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (cleanExtension !== undefined) updatePayload.extension = cleanExtension;
        if (cleanToken !== undefined) updatePayload.api4com_token = cleanToken;
        await adminClient.from("call_operators").update(updatePayload).eq("id", existingOp.id);
      } else {
        const { data: prof } = await adminClient
          .from("profiles")
          .select("full_name, email")
          .eq("id", user_id)
          .maybeSingle();

        await adminClient.from("call_operators").insert({
          user_id,
          company_id,
          operator_name: prof?.full_name || prof?.email || "Operador",
          extension: cleanExtension || null,
          api4com_token: cleanToken || null,
          is_active: true,
          status: "offline",
        });
      }

      // Sincronizar na tabela profiles para consistência global
      const profileUpdates: Record<string, any> = {};
      if (cleanExtension !== undefined) profileUpdates.api4com_extension = cleanExtension;
      if (cleanToken !== undefined) profileUpdates.api4com_token = cleanToken;
      if (Object.keys(profileUpdates).length > 0) {
        await adminClient.from("profiles").update(profileUpdates).eq("id", user_id);
      }

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

    // Criar ou atualizar registro em call_operators caso seja operador ou tenha ramal/token
    const cleanExt = extension ? String(extension).trim() : null;
    const cleanTok = api4com_token ? String(api4com_token).trim() : null;

    if (memberRole === "operator" || cleanExt || cleanTok) {
      const { error: opError } = await adminClient
        .from("call_operators")
        .upsert(
          {
            user_id: profile.id,
            company_id,
            operator_name: profile.full_name || profile.email,
            extension: cleanExt,
            api4com_token: cleanTok,
            is_active: true,
            status: "offline",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,company_id" }
        );

      if (opError) {
        console.error("Failed to upsert call_operator:", opError);
      }

      if (cleanExt || cleanTok) {
        const profUpdates: Record<string, any> = {};
        if (cleanExt) profUpdates.api4com_extension = cleanExt;
        if (cleanTok) profUpdates.api4com_token = cleanTok;
        await adminClient.from("profiles").update(profUpdates).eq("id", profile.id);
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
