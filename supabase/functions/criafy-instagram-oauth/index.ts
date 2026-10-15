import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCriafyOAuthState, verifyCriafyOAuthState } from "../_shared/criafyOAuthState.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function instagramCredentials() {
  const appId = Deno.env.get("INSTAGRAM_APP_ID") || "1214753054314021";
  const appSecret = Deno.env.get("INSTAGRAM_APP_SECRET") || Deno.env.get("META_APP_SECRET");
  if (!appSecret) throw new Error("INSTAGRAM_APP_SECRET or META_APP_SECRET is not configured");
  return { appId, appSecret };
}

function metaErrorMessage(data: any, fallback: string): string {
  return data?.error?.message || data?.error_message || data?.message || fallback;
}

async function fetchMetaJson(url: string, init: RequestInit | undefined, operation: string) {
  const response = await fetch(url, init);
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(`${operation} returned an invalid response`);
  }
  if (!response.ok || data?.error || data?.error_message) {
    throw new Error(`${operation}: ${metaErrorMessage(data, `HTTP ${response.status}`)}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const supabaseAnonKey = requiredEnv("SUPABASE_ANON_KEY");
    const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, companyId, accountId, code, state, redirectUri, provider = "INSTAGRAM" } = body;

    if (companyId) {
      const { data: member, error: memberError } = await adminClient
        .from("company_members")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (memberError) throw new Error(`Unable to verify company membership: ${memberError.message}`);
      if (!member) throw new Error("Forbidden: User is not an active member of this company");
    }

    if (action === "get-auth-url") {
      if (!companyId || !redirectUri) throw new Error("CompanyId and redirectUri are required");
      if (provider !== "INSTAGRAM") throw new Error("Only Instagram Login for Business is supported");
      const { appId: instagramAppId, appSecret: instagramAppSecret } = instagramCredentials();
      const stateSecret = Deno.env.get("CRIAFY_OAUTH_STATE_SECRET") || instagramAppSecret;

      const signedState = await createCriafyOAuthState(
        { companyId, userId: user.id, redirectUri, provider: "INSTAGRAM" },
        stateSecret
      );
      const scopes = [
        "instagram_business_basic",
        "instagram_business_manage_messages",
        "instagram_business_manage_comments",
        "instagram_business_content_publish",
      ].join(",");
      const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${instagramAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}&state=${encodeURIComponent(signedState)}`;
      return jsonResponse({ success: true, authUrl, provider: "INSTAGRAM" });
    }

    if (action === "exchange-code") {
      if (!companyId || !code || !redirectUri || !state) {
        throw new Error("CompanyId, code, redirectUri and state are required");
      }
      const { appId: instagramAppId, appSecret: instagramAppSecret } = instagramCredentials();
      const stateSecret = Deno.env.get("CRIAFY_OAUTH_STATE_SECRET") || instagramAppSecret;
      await verifyCriafyOAuthState(state, stateSecret, { companyId, userId: user.id, redirectUri });

      const formData = new URLSearchParams();
      formData.append("client_id", instagramAppId);
      formData.append("client_secret", instagramAppSecret);
      formData.append("grant_type", "authorization_code");
      formData.append("redirect_uri", redirectUri);
      formData.append("code", code);

      const tokenData = await fetchMetaJson(
        "https://api.instagram.com/oauth/access_token",
        { method: "POST", body: formData },
        "Instagram authorization code exchange failed"
      );
      if (!tokenData.access_token || !tokenData.user_id) {
        throw new Error("Instagram authorization code exchange returned no account token");
      }

      const longLivedData = await fetchMetaJson(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(instagramAppSecret)}&access_token=${encodeURIComponent(tokenData.access_token)}`,
        undefined,
        "Instagram long-lived token exchange failed"
      );
      if (!longLivedData.access_token) {
        throw new Error("Instagram long-lived token exchange returned no access token");
      }

      const profileData = await fetchMetaJson(
        `https://graph.instagram.com/v19.0/me?fields=user_id,username,name,profile_picture_url&access_token=${encodeURIComponent(longLivedData.access_token)}`,
        undefined,
        "Instagram profile lookup failed"
      );
      if (!profileData.username) throw new Error("Instagram profile lookup returned no username");

      const instagramAccountId = String(profileData.user_id || tokenData.user_id);
      const expiresInSeconds = Number(longLivedData.expires_in) || 5_184_000;
      const { data: account, error: upsertError } = await adminClient
        .from("criafy_instagram_accounts")
        .upsert(
          {
            company_id: companyId,
            instagram_account_id: instagramAccountId,
            instagram_user_id: instagramAccountId,
            username: profileData.username,
            name: profileData.name || profileData.username,
            profile_picture_url: profileData.profile_picture_url || null,
            account_type: "INSTAGRAM_BUSINESS",
            access_token: longLivedData.access_token,
            token_expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
            connection_status: "CONNECTED",
            error_message: null,
            created_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,instagram_account_id" }
        )
        .select()
        .single();
      if (upsertError) throw new Error(`Unable to save Instagram account: ${upsertError.message}`);
      if (!account) throw new Error("Unable to save Instagram account: no row was returned");

      return jsonResponse({ success: true, count: 1, accounts: [account] });
    }

    if (action === "check-token-status") {
      if (!accountId) throw new Error("AccountId is required");
      const { data: account, error: fetchError } = await adminClient
        .from("criafy_instagram_accounts")
        .select("*")
        .eq("id", accountId)
        .single();
      if (fetchError || !account) throw new Error(`Account not found: ${fetchError?.message || accountId}`);

      if (!account.access_token) {
        const { error: updateError } = await adminClient
          .from("criafy_instagram_accounts")
          .update({ connection_status: "DISCONNECTED", error_message: "Access token ausente" })
          .eq("id", accountId);
        if (updateError) throw new Error(`Unable to update account status: ${updateError.message}`);
        return jsonResponse({ success: true, status: "DISCONNECTED", valid: false });
      }

      let status = "CONNECTED";
      let errorMessage: string | null = null;
      try {
        await fetchMetaJson(
          `https://graph.instagram.com/v19.0/me?access_token=${encodeURIComponent(account.access_token)}`,
          undefined,
          "Instagram token validation failed"
        );
      } catch (error) {
        status = "EXPIRED";
        errorMessage = error instanceof Error ? error.message : "Instagram token validation failed";
      }

      const { error: updateError } = await adminClient
        .from("criafy_instagram_accounts")
        .update({ connection_status: status, error_message: errorMessage, updated_at: new Date().toISOString() })
        .eq("id", accountId);
      if (updateError) throw new Error(`Unable to update account status: ${updateError.message}`);
      return jsonResponse({ success: true, status, valid: status === "CONNECTED", error: errorMessage });
    }

    if (action === "disconnect-account") {
      if (!accountId) throw new Error("AccountId is required");
      const { error: updateError } = await adminClient
        .from("criafy_instagram_accounts")
        .update({
          connection_status: "DISCONNECTED",
          access_token: null,
          error_message: "Desconectado manualmente pelo usuário",
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);
      if (updateError) throw new Error(`Unable to disconnect account: ${updateError.message}`);
      return jsonResponse({ success: true });
    }

    throw new Error(`Invalid action: ${action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected OAuth error";
    console.error("[Criafy OAuth]", message);
    return jsonResponse({ success: false, error: message }, 400);
  }
});
