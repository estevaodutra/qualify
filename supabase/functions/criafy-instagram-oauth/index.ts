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
  let appId: string | undefined;
  let appSecret: string | undefined;

  // 1. Prioridade: chaves configuradas em platform_settings pelo Superadmin
  if (adminClient) {
    try {
      const { data: rows } = await adminClient
        .from("platform_settings")
        .select("key, value")
        .in("key", ["meta_app_id", "instagram_app_id", "instagram_app_secret", "meta_app_secret", "criafy_instagram_app_secret"]);

      if (rows && Array.isArray(rows)) {
        for (const row of rows) {
          const val = typeof row.value === "string"
            ? row.value
            : String(row.value?.secret || row.value?.value || row.value || "");
          if (val && val.trim().length > 0) {
            if (row.key === "meta_app_id" || row.key === "instagram_app_id") {
              if (!appId) appId = val.trim();
            } else if (!appSecret) {
              appSecret = val.trim();
            }
          }
        }
      }
    } catch (e: any) {
      console.warn("[OAuth] Falha ao consultar platform_settings:", e.message);
    }
  }

  // 2. Fallbacks: variáveis de ambiente ou App ID padrão do Criafy
  if (!appId) {
    appId = Deno.env.get("META_APP_ID") || Deno.env.get("INSTAGRAM_APP_ID") || "160193948766835";
  }
  if (!appSecret) {
    appSecret = Deno.env.get("META_APP_SECRET") || Deno.env.get("INSTAGRAM_APP_SECRET");
  }

  if (!appSecret) {
    throw new Error(
      "A Chave Secreta do Aplicativo Meta (App Secret) não está configurada no sistema. Configure o App Secret no painel Superadmin (/admin/criafy) antes de prosseguir."
    );
  }

  return { appId, appSecret };
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
    const { action, companyId, accountId, code, state, redirectUri } = body;

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
    // ACTION 1: Generate OAuth URL (Facebook Login for Business com BM)
    // ==========================================
    if (action === "get-auth-url") {
      if (!companyId || !redirectUri) throw new Error("CompanyId and redirectUri are required");

      const { appId, appSecret } = await getInstagramCredentials(adminClient);
      const stateSecret = Deno.env.get("CRIAFY_OAUTH_STATE_SECRET") || appSecret;

      const cleanRedirectUri = String(redirectUri).split("#")[0].trim();

      const signedState = await createCriafyOAuthState(
        { companyId, userId: user.id, redirectUri: cleanRedirectUri, provider: "INSTAGRAM" },
        stateSecret
      );

      // Permissões oficiais da Meta Graph API para BM, Páginas e Instagram
      const scopes = [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "instagram_basic",
        "instagram_content_publish",
        "instagram_manage_comments",
        "instagram_manage_messages",
        "business_management",
      ].join(",");

      const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
        cleanRedirectUri
      )}&response_type=code&scope=${scopes}&state=${encodeURIComponent(signedState)}`;

      return jsonResponse({ success: true, authUrl, provider: "FACEBOOK_BUSINESS" });
    }

    // ==========================================
    // ACTION 2: Exchange Code via Facebook Graph API & Register Accounts
    // ==========================================
    if (action === "exchange-code") {
      if (!companyId || !code || !redirectUri || !state) {
        throw new Error("CompanyId, code, redirectUri and state are required");
      }

      const { appId, appSecret } = await getInstagramCredentials(adminClient);
      const stateSecret = Deno.env.get("CRIAFY_OAUTH_STATE_SECRET") || appSecret;

      // Sanitizar fragmentos anexados pelo Facebook (#_)
      const cleanCode = String(code).split("#")[0].trim();
      const cleanState = String(state).split("#")[0].trim();
      const cleanRedirectUri = String(redirectUri).split("#")[0].trim();

      // Validar state criptográfico
      await verifyCriafyOAuthState(cleanState, stateSecret, { companyId, userId: user.id, redirectUri: cleanRedirectUri });

      console.log(`[Exchange Code BM] appId=${appId}, redirectUri=${cleanRedirectUri}, codeLen=${cleanCode.length}`);

      // 1. Trocar o código temporário por Short-Lived User Token
      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
        cleanRedirectUri
      )}&client_secret=${appSecret}&code=${cleanCode}`;

      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        console.error("[Exchange Code BM] Erro Meta:", tokenData.error);
        throw new Error(`Meta OAuth Error: ${tokenData.error.message || JSON.stringify(tokenData.error)}`);
      }

      const shortLivedToken = tokenData.access_token;
      if (!shortLivedToken) throw new Error("A Meta não retornou o token de acesso do usuário.");

      // 2. Estender o token do usuário para 60 dias (Long-Lived Token)
      const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
      const longLivedRes = await fetch(longLivedUrl);
      const longLivedData = await longLivedRes.json();

      const userAccessToken = longLivedData.access_token || shortLivedToken;
      const expiresInSeconds = Number(longLivedData.expires_in) || 5_184_000;
      const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

      // 3. Buscar as Páginas do Facebook autorizadas e suas Contas Profissionais do Instagram
      const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${userAccessToken}`;
      const pagesRes = await fetch(pagesUrl);
      const pagesData = await pagesRes.json();

      if (pagesData.error) {
        throw new Error(`Erro ao buscar páginas da Meta: ${pagesData.error.message}`);
      }

      const connectedAccounts = [];

      if (pagesData.data && Array.isArray(pagesData.data)) {
        for (const page of pagesData.data) {
          if (page.instagram_business_account) {
            const igAcc = page.instagram_business_account;

            // O token de página (Page Access Token) derivado de um long-lived token é permanente para publicações
            const accountToken = page.access_token || userAccessToken;

            const { data: inserted, error: insertErr } = await adminClient
              .from("criafy_instagram_accounts")
              .upsert(
                {
                  company_id: companyId,
                  instagram_account_id: String(igAcc.id),
                  instagram_user_id: String(igAcc.id),
                  facebook_page_id: String(page.id),
                  username: igAcc.username,
                  name: igAcc.name || page.name,
                  profile_picture_url: igAcc.profile_picture_url || null,
                  account_type: "INSTAGRAM_BUSINESS",
                  access_token: accountToken,
                  token_expires_at: tokenExpiresAt,
                  connection_status: "CONNECTED",
                  error_message: null,
                  created_by: user.id,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "company_id,instagram_account_id" }
              )
              .select()
              .single();

            if (insertErr) {
              console.error("[OAuth BM] Erro ao salvar conta:", insertErr);
            } else if (inserted) {
              connectedAccounts.push(inserted);
            }
          }
        }
      }

      if (connectedAccounts.length === 0) {
        throw new Error(
          "Autorização concluída com sucesso no Facebook, mas nenhuma das Páginas autorizadas possui uma Conta Profissional do Instagram vinculada. Acesse o Meta Business Suite ou as Configurações da Página no Facebook e vincule a conta do Instagram à Página."
        );
      }

      return jsonResponse({
        success: true,
        count: connectedAccounts.length,
        accounts: connectedAccounts,
      });
    }

    // ==========================================
    // ACTION: Gestão de Credenciais Meta (Superadmin)
    // ==========================================
    if (action === "save-meta-secret") {
      const { appId, secret } = body;
      if (secret && typeof secret === "string" && secret.trim().length >= 8) {
        await adminClient.from("platform_settings").upsert(
          {
            key: "instagram_app_secret",
            value: secret.trim(),
            description: "Meta App Secret para Criafy OAuth",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      }

      if (appId && typeof appId === "string" && appId.trim().length >= 5) {
        await adminClient.from("platform_settings").upsert(
          {
            key: "meta_app_id",
            value: appId.trim(),
            description: "Meta App ID Principal da Criafy",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      }

      return jsonResponse({ success: true, message: "Credenciais da Meta salvas com sucesso no banco de dados." });
    }

    if (action === "get-meta-secret-status") {
      let isConfigured = false;
      let masked: string | null = null;
      let configuredAppId: string | null = null;
      try {
        const { appId, appSecret } = await getInstagramCredentials(adminClient);
        configuredAppId = appId;
        if (appSecret && appSecret.length > 5) {
          isConfigured = true;
          masked = "••••••••••••" + appSecret.slice(-4);
        }
      } catch (_) {}

      return jsonResponse({ success: true, isConfigured, maskedSecret: masked, appId: configuredAppId });
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
        await adminClient
          .from("criafy_instagram_accounts")
          .update({ connection_status: "DISCONNECTED", error_message: "Access token ausente" })
          .eq("id", accountId);
        return jsonResponse({ success: true, status: "DISCONNECTED", valid: false });
      }

      let status = "CONNECTED";
      let errorMessage: string | null = null;
      try {
        const checkUrl = `https://graph.facebook.com/v21.0/${account.instagram_account_id}?fields=id,username&access_token=${encodeURIComponent(account.access_token)}`;
        const checkRes = await fetch(checkUrl);
        const checkData = await checkRes.json();
        if (checkData.error) {
          status = "EXPIRED";
          errorMessage = checkData.error.message;
        }
      } catch (error) {
        status = "EXPIRED";
        errorMessage = error instanceof Error ? error.message : "Meta token validation failed";
      }

      await adminClient
        .from("criafy_instagram_accounts")
        .update({ connection_status: status, error_message: errorMessage, updated_at: new Date().toISOString() })
        .eq("id", accountId);
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
