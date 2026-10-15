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

async function getInstagramCredentials(adminClient?: any) {
  const appId = Deno.env.get("INSTAGRAM_APP_ID") || "1214753054314021";
  let appSecret = Deno.env.get("INSTAGRAM_APP_SECRET") || Deno.env.get("META_APP_SECRET");

  if (!appSecret && adminClient) {
    try {
      const { data: settingRow } = await adminClient
        .from("platform_settings")
        .select("value")
        .in("key", ["instagram_app_secret", "meta_app_secret", "criafy_instagram_app_secret"])
        .limit(1)
        .maybeSingle();

      if (settingRow && settingRow.value) {
        appSecret = typeof settingRow.value === "string"
          ? settingRow.value
          : String(settingRow.value?.secret || settingRow.value?.value || settingRow.value);
      }
    } catch (e: any) {
      console.warn("[OAuth] Falha ao consultar platform_settings:", e.message);
    }
  }

  if (!appSecret) {
    throw new Error(
      "A Chave Secreta do Aplicativo Meta (App Secret) não está configurada no sistema. Configure o App Secret no painel Superadmin (/admin/criafy) antes de prosseguir."
    );
  }

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

    // ==========================================
    // ACTION 1: Generate OAuth URL (Instagram Login for Business)
    // ==========================================
    if (action === "get-auth-url") {
      if (!companyId || !redirectUri) throw new Error("CompanyId and redirectUri are required");
      if (provider !== "INSTAGRAM") throw new Error("Only Instagram Login for Business is supported");

      const { appId: instagramAppId, appSecret: instagramAppSecret } = await getInstagramCredentials(adminClient);
      const stateSecret = Deno.env.get("CRIAFY_OAUTH_STATE_SECRET") || instagramAppSecret;

      const cleanRedirectUri = String(redirectUri).replace(/#_.*$/, "").replace(/#.*$/, "").trim();

      const signedState = await createCriafyOAuthState(
        { companyId, userId: user.id, redirectUri: cleanRedirectUri, provider: "INSTAGRAM" },
        stateSecret
      );
      const scopes = [
        "instagram_business_basic",
        "instagram_business_manage_messages",
        "instagram_business_manage_comments",
        "instagram_business_content_publish",
      ].join(",");
      const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${instagramAppId}&redirect_uri=${encodeURIComponent(cleanRedirectUri)}&response_type=code&scope=${scopes}&state=${encodeURIComponent(signedState)}`;
      return jsonResponse({ success: true, authUrl, provider: "INSTAGRAM" });
    }

    // ==========================================
    // ACTION 2: Exchange Code for Long-Lived Token & Upsert Account
    // ==========================================
    if (action === "exchange-code") {
      if (!companyId || !code || !redirectUri || !state) {
        throw new Error("CompanyId, code, redirectUri and state are required");
      }

      const { appId: instagramAppId, appSecret: instagramAppSecret } = await getInstagramCredentials(adminClient);
      const stateSecret = Deno.env.get("CRIAFY_OAUTH_STATE_SECRET") || instagramAppSecret;

      // Sanitizar fragmentos anexados pelo Instagram (#_)
      const cleanCode = String(code).split("#")[0].trim();
      const cleanState = String(state).split("#")[0].trim();
      const cleanRedirectUri = String(redirectUri).split("#")[0].trim();

      // Validar state criptográfico
      await verifyCriafyOAuthState(cleanState, stateSecret, { companyId, userId: user.id, redirectUri: cleanRedirectUri });

      console.log(`[Exchange Code] appId=${instagramAppId}, redirectUri=${cleanRedirectUri}, codeLen=${cleanCode.length}`);

      const formData = new URLSearchParams();
      formData.append("client_id", instagramAppId);
      formData.append("client_secret", instagramAppSecret);
      formData.append("grant_type", "authorization_code");
      formData.append("redirect_uri", cleanRedirectUri);
      formData.append("code", cleanCode);

      let tokenData: any;
      try {
        tokenData = await fetchMetaJson(
          "https://api.instagram.com/oauth/access_token",
          { method: "POST", body: formData },
          "Instagram authorization code exchange failed"
        );
      } catch (err: any) {
        console.error("[Exchange Code] Erro da Meta:", err.message);
        if (err.message && err.message.includes("Error validating verification code")) {
          throw new Error(
            `${err.message}. Verifique se o App Secret no Superadmin (/admin/criafy) pertence ao App ID ${instagramAppId}, e se o URI no Meta Developers está cadastrado exatamente como '${cleanRedirectUri}'.`
          );
        }
        throw err;
      }
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

      let profileData: any;
      try {
        profileData = await fetchMetaJson(
          `https://graph.instagram.com/v22.0/me?fields=user_id,username,name,profile_picture_url&access_token=${encodeURIComponent(longLivedData.access_token)}`,
          undefined,
          "Instagram profile lookup failed"
        );
      } catch (_) {
        // Fallback v19.0
        profileData = await fetchMetaJson(
          `https://graph.instagram.com/v19.0/me?fields=user_id,username,name,profile_picture_url&access_token=${encodeURIComponent(longLivedData.access_token)}`,
          undefined,
          "Instagram profile lookup fallback failed"
        );
      }

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

    // ==========================================
    // ACTION: Gestão do App Secret (Superadmin)
    // ==========================================
    if (action === "save-meta-secret") {
      const { secret } = body;
      if (!secret || typeof secret !== "string" || secret.trim().length < 8) {
        throw new Error("Secret inválido. O App Secret deve ter pelo menos 8 caracteres.");
      }

      const { error: upsertErr } = await adminClient
        .from("platform_settings")
        .upsert(
          {
            key: "instagram_app_secret",
            value: secret.trim(),
            description: "Meta Instagram App Secret para Criafy OAuth",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (upsertErr) throw upsertErr;

      return jsonResponse({ success: true, message: "App Secret salvo com sucesso no banco de dados." });
    }

    if (action === "get-meta-secret-status") {
      let isConfigured = false;
      let masked: string | null = null;
      try {
        const { appSecret } = await getInstagramCredentials(adminClient);
        if (appSecret && appSecret.length > 5) {
          isConfigured = true;
          masked = "••••••••••••" + appSecret.slice(-4);
        }
      } catch (_) {}

      return jsonResponse({ success: true, isConfigured, maskedSecret: masked });
    }

    // ==========================================
    // ACTION 3: Verify Token Health & Connection Status
    // ==========================================
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

    // ==========================================
    // ACTION 4: Disconnect Account Token
    // ==========================================
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
