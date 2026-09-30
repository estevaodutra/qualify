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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, companyId, accountId, code, redirectUri } = body;

    // Verify company membership
    if (companyId) {
      const { data: member } = await adminClient
        .from("company_members")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!member) {
        throw new Error("Forbidden: User is not an active member of this company");
      }
    }

    const appId = Deno.env.get("META_APP_ID") || "YOUR_META_APP_ID";
    const appSecret = Deno.env.get("META_APP_SECRET") || "YOUR_META_APP_SECRET";

    // Action 1: Generate OAuth URL
    if (action === "get-auth-url") {
      const scopes = [
        "instagram_basic",
        "instagram_content_publish",
        "pages_show_list",
        "pages_read_engagement",
        "business_management",
      ].join(",");

      const state = JSON.stringify({ companyId, userId: user.id });
      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=${scopes}&state=${encodeURIComponent(state)}&response_type=code`;

      return new Response(JSON.stringify({ success: true, authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action 2: Exchange Code for Access Tokens & Register Instagram Business Accounts
    if (action === "exchange-code") {
      if (!code || !redirectUri) throw new Error("Code and redirectUri are required");

      // 1. Get short-lived token
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&client_secret=${appSecret}&code=${code}`;

      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        throw new Error(`Meta OAuth Error: ${tokenData.error.message}`);
      }

      const shortLivedToken = tokenData.access_token;

      // 2. Exchange for 60-day long-lived token
      const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
      const longLivedRes = await fetch(longLivedUrl);
      const longLivedData = await longLivedRes.json();

      const accessToken = longLivedData.access_token || shortLivedToken;
      const expiresInSeconds = longLivedData.expires_in || 5184000; // 60 days default
      const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

      // 3. Fetch Facebook Pages to find linked Instagram Business Accounts
      const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${accessToken}`;
      const pagesRes = await fetch(pagesUrl);
      const pagesData = await pagesRes.json();

      const connectedAccounts = [];

      if (pagesData.data && Array.isArray(pagesData.data)) {
        for (const page of pagesData.data) {
          if (page.instagram_business_account) {
            const igAcc = page.instagram_business_account;

            // Upsert into criafy_instagram_accounts
            const { data: inserted, error: insertErr } = await adminClient
              .from("criafy_instagram_accounts")
              .upsert(
                {
                  company_id: companyId,
                  instagram_account_id: igAcc.id,
                  username: igAcc.username,
                  name: igAcc.name || page.name,
                  profile_picture_url: igAcc.profile_picture_url,
                  access_token: accessToken,
                  token_expires_at: tokenExpiresAt,
                  connection_status: "CONNECTED",
                  error_message: null,
                  created_by: user.id,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "company_id, instagram_account_id" }
              )
              .select()
              .single();

            if (!insertErr && inserted) {
              connectedAccounts.push(inserted);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          count: connectedAccounts.length,
          accounts: connectedAccounts,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action 3: Verify Token Health & Connection Status
    if (action === "check-token-status") {
      if (!accountId) throw new Error("AccountId is required");

      const { data: account, error: fetchErr } = await adminClient
        .from("criafy_instagram_accounts")
        .select("*")
        .eq("id", accountId)
        .single();

      if (fetchErr || !account) throw new Error("Account not found");

      if (!account.access_token) {
        await adminClient
          .from("criafy_instagram_accounts")
          .update({ connection_status: "DISCONNECTED", error_message: "Access token ausente" })
          .eq("id", accountId);

        return new Response(
          JSON.stringify({ success: true, status: "DISCONNECTED", valid: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Query Meta Debug Token or Me endpoint
      const debugRes = await fetch(
        `https://graph.facebook.com/v19.0/me?access_token=${account.access_token}`
      );
      const debugData = await debugRes.json();

      let status = "CONNECTED";
      let errorMsg = null;

      if (debugData.error) {
        status = "EXPIRED";
        errorMsg = debugData.error.message;
      }

      await adminClient
        .from("criafy_instagram_accounts")
        .update({
          connection_status: status,
          error_message: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      return new Response(
        JSON.stringify({ success: true, status, valid: !debugData.error, error: errorMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action 4: Disconnect Account Token
    if (action === "disconnect-account") {
      if (!accountId) throw new Error("AccountId is required");

      await adminClient
        .from("criafy_instagram_accounts")
        .update({
          connection_status: "DISCONNECTED",
          access_token: null,
          error_message: "Desconectado manualmente pelo usuário",
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Invalid action: ${action}`);
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
