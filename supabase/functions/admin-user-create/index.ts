import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatActionUrl(rawUrl: string, publicBaseUrl?: string): string {
  let url = rawUrl;
  if (url.includes("/verify?") && !url.includes("/auth/v1/verify?")) {
    url = url.replace("/verify?", "/auth/v1/verify?");
  }

  if (publicBaseUrl) {
    try {
      const parsed = new URL(url);
      const publicParsed = new URL(publicBaseUrl);
      if (
        parsed.hostname === "kong" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.port === "8000"
      ) {
        parsed.protocol = publicParsed.protocol;
        parsed.host = publicParsed.host;
        parsed.port = publicParsed.port;
        url = parsed.toString();
      }
    } catch (_) {
      // keep url as is
    }
  }
  return url;
}

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

    const body = await req.json();
    const action = body.action || "create-user";
    const email = body.email || body.payload?.email;
    const full_name = body.full_name || body.fullName || body.payload?.full_name;
    const redirect_to = body.redirect_to || body.redirectTo || body.payload?.redirect_to;

    if (!email) {
      throw new Error("Email é obrigatório");
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(full_name || "").trim();
    const publicSupabaseUrl = Deno.env.get("PUBLIC_SUPABASE_URL") || Deno.env.get("API_EXTERNAL_URL") || "https://qualify-supabase.d2x.site";
    const targetRedirectTo = redirect_to || "https://app.qualifys.app/redefinir-senha";

    if (action === "generate-invite-link") {
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: cleanEmail,
        options: {
          redirectTo: targetRedirectTo,
        },
      });

      if (linkError) throw linkError;

      let inviteLink = linkData?.properties?.action_link || "";
      inviteLink = formatActionUrl(inviteLink, publicSupabaseUrl);

      return new Response(
        JSON.stringify({
          success: true,
          email: cleanEmail,
          inviteLink,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default action: create-user
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, email, full_name")
      .eq("email", cleanEmail)
      .maybeSingle();

    let targetUserId = existingProfile?.id;
    let isNewUser = false;

    if (!targetUserId) {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName || cleanEmail.split("@")[0],
        },
      });

      if (createError) {
        const errMsg = createError.message?.toLowerCase() || "";
        if (errMsg.includes("already") || errMsg.includes("exists") || (createError as any).status === 422) {
          console.log("User already exists in auth.users, continuing to link generation");
        } else {
          throw createError;
        }
      } else if (newUser?.user) {
        targetUserId = newUser.user.id;
        isNewUser = true;
      }
    }

    if (targetUserId) {
      await adminClient.from("profiles").upsert(
        {
          id: targetUserId,
          email: cleanEmail,
          full_name: cleanName || existingProfile?.full_name || cleanEmail.split("@")[0],
        },
        { onConflict: "id" }
      );
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: cleanEmail,
      options: {
        redirectTo: targetRedirectTo,
      },
    });

    if (linkError) {
      throw linkError;
    }

    let inviteLink = linkData?.properties?.action_link || "";
    inviteLink = formatActionUrl(inviteLink, publicSupabaseUrl);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: targetUserId || linkData?.user?.id,
          email: cleanEmail,
          full_name: cleanName || existingProfile?.full_name || cleanEmail.split("@")[0],
        },
        inviteLink,
        isNewUser,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
