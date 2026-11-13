import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCriafyOAuthState, verifyCriafyOAuthState } from "../_shared/criafyOAuthState.ts";
import { callTikTokApi, requestTikTokTokens, usableTikTokToken } from "../_shared/criafyTikTokApi.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const respond = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const required = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} não configurado no backend.`);
  return value;
};

const redirectUri = () => {
  const uri = Deno.env.get("TIKTOK_REDIRECT_URI")?.trim() ||
    "https://qualifys.app/criafy/tiktok/callback";
  if (!uri.startsWith("https://") || new URL(uri).search || new URL(uri).hash) {
    throw new Error("TIKTOK_REDIRECT_URI deve ser uma URL HTTPS fixa.");
  }
  return uri;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return respond({ error: "Método não permitido." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return respond({ error: "Sessão necessária." }, 401);

    const supabaseUrl = required("SUPABASE_URL");
    const userClient = createClient(supabaseUrl, required("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return respond({ error: "Sessão inválida." }, 401);

    const admin = createClient(supabaseUrl, required("SUPABASE_SERVICE_ROLE_KEY"));
    const { action, companyId, accountId, code, state, includeStats } = await request.json();
    if (!companyId) return respond({ error: "Workspace não informado." }, 400);

    const { data: member, error: memberError } = await admin.from("company_members")
      .select("id").eq("company_id", companyId).eq("user_id", user.id)
      .eq("is_active", true).maybeSingle();
    if (memberError || !member) return respond({ error: "Sem acesso ao workspace." }, 403);

    if (action === "stats") {
      if (!accountId) return respond({ error: "Conta ausente." }, 400);
      const { data: account } = await admin.from("criafy_social_accounts")
        .select("id").eq("id", accountId).eq("company_id", companyId)
        .eq("provider", "TIKTOK").single();
      if (!account) return respond({ error: "Conta não encontrada." }, 404);
      const { data: credential } = await admin.from("criafy_tiktok_credentials")
        .select("scopes").eq("company_id", companyId).eq("account_id", accountId).single();
      if (!credential?.scopes?.includes("user.info.stats")) {
        return respond({ success: true, needsStatsPermission: true, stats: null });
      }
      const token = await usableTikTokToken(admin, companyId, accountId);
      const data = await callTikTokApi(
        "https://open.tiktokapis.com/v2/user/info/?fields=follower_count,video_count,likes_count", token,
      );
      const profile = data?.user;
      return respond({ success: true, stats: {
        followers: Number(profile?.follower_count ?? NaN),
        posts: Number(profile?.video_count ?? NaN),
        likes: Number(profile?.likes_count ?? NaN),
      } });
    }

    const uri = redirectUri();
    const stateSecret = Deno.env.get("CRIAFY_OAUTH_STATE_SECRET") ||
      required("TIKTOK_CLIENT_SECRET");

    if (action === "get-auth-url") {
      const signedState = await createCriafyOAuthState(
        { companyId, userId: user.id, redirectUri: uri, provider: "TIKTOK" },
        stateSecret,
      );
      const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
      url.searchParams.set("client_key", required("TIKTOK_CLIENT_KEY"));
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", includeStats === true
        ? "user.info.basic,video.publish,user.info.stats"
        : "user.info.basic,video.publish");
      url.searchParams.set("redirect_uri", uri);
      url.searchParams.set("state", signedState);
      return respond({ success: true, authUrl: url.toString() });
    }

    if (action !== "exchange-code" || !code || !state) {
      return respond({ error: "Ação ou retorno OAuth inválido." }, 400);
    }
    await verifyCriafyOAuthState(state, stateSecret, {
      companyId, userId: user.id, redirectUri: uri, provider: "TIKTOK",
    });

    const token = await requestTikTokTokens({
      code: String(code), grant_type: "authorization_code", redirect_uri: uri,
    });
    const grantedScopes = String(token.scope || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!grantedScopes.includes("video.publish")) {
      return respond({ error: "A conta não autorizou a publicação de vídeos no TikTok." }, 403);
    }

    const profileResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    const profileData = await profileResponse.json();
    if (!profileResponse.ok || profileData.error?.code !== "ok") {
      throw new Error(`Não foi possível consultar a conta TikTok: ${profileData.error?.message || profileResponse.status}`);
    }
    const profile = profileData.data?.user;
    const openId = String(profile?.open_id || token.open_id || "");
    if (!openId) throw new Error("TikTok não retornou o identificador da conta.");

    const { data: account, error: accountError } = await admin.from("criafy_social_accounts")
      .upsert({
        company_id: companyId,
        provider: "TIKTOK",
        provider_account_id: openId,
        display_name: String(profile?.display_name || "Conta TikTok"),
        avatar_url: profile?.avatar_url || null,
        connection_status: "CONNECTED",
        created_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,provider,provider_account_id" })
      .select("id,company_id,provider,provider_account_id,display_name,avatar_url,connection_status,created_at")
      .single();
    if (accountError || !account) throw new Error(accountError?.message || "Falha ao registrar conta TikTok.");

    const now = Date.now();
    const { error: credentialError } = await admin.from("criafy_tiktok_credentials").upsert({
      account_id: account.id,
      company_id: companyId,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      scopes: grantedScopes,
      access_expires_at: new Date(now + Number(token.expires_in) * 1000).toISOString(),
      refresh_expires_at: new Date(now + Number(token.refresh_expires_in) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "account_id" });
    if (credentialError) {
      await admin.from("criafy_social_accounts").update({ connection_status: "ERROR" }).eq("id", account.id);
      throw new Error("Falha ao guardar autorização TikTok com segurança.");
    }

    return respond({ success: true, account });
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : "Falha na conexão TikTok." }, 400);
  }
});
