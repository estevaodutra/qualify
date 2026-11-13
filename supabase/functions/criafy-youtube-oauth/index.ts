import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCriafyOAuthState, verifyCriafyOAuthState } from "../_shared/criafyOAuthState.ts";
import { YOUTUBE_READ_SCOPE, YOUTUBE_UPLOAD_SCOPE, youtubeEnv, youtubeJson, youtubeTokenRequest } from "../_shared/criafyYouTubeApi.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const respond = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const redirectUri = () => Deno.env.get("YOUTUBE_REDIRECT_URI")?.trim() ||
  "https://qualifys.app/criafy/youtube/callback";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return respond({ error: "Método não permitido." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return respond({ error: "Sessão necessária." }, 401);
    const supabaseUrl = youtubeEnv("SUPABASE_URL");
    const userClient = createClient(supabaseUrl, youtubeEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return respond({ error: "Sessão inválida." }, 401);
    const admin = createClient(supabaseUrl, youtubeEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const { action, companyId, accountId, code, state } = await request.json();
    if (!companyId) return respond({ error: "Workspace não informado." }, 400);
    const { data: member } = await admin.from("company_members").select("id")
      .eq("company_id", companyId).eq("user_id", user.id).eq("is_active", true).maybeSingle();
    if (!member) return respond({ error: "Sem acesso ao workspace." }, 403);

    if (action === "disconnect") {
      if (!accountId) return respond({ error: "Canal ausente." }, 400);
      const { data: account } = await admin.from("criafy_social_accounts").select("id")
        .eq("id", accountId).eq("company_id", companyId).eq("provider", "YOUTUBE").single();
      if (!account) return respond({ error: "Canal não encontrado." }, 404);
      const { data: credential } = await admin.from("criafy_youtube_credentials")
        .select("refresh_token").eq("account_id", accountId).eq("company_id", companyId).maybeSingle();
      if (credential?.refresh_token) {
        const revoked = await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: credential.refresh_token }),
        });
        if (!revoked.ok && revoked.status !== 400) {
          throw new Error("Google não confirmou a revogação. Tente novamente ou revogue o acesso nas configurações da sua conta Google.");
        }
      }
      const { error: publicationsError } = await admin.from("criafy_publications")
        .delete().eq("company_id", companyId).eq("social_account_id", accountId)
        .eq("publication_type", "YOUTUBE_SHORT");
      if (publicationsError) throw new Error("Acesso revogado, mas o histórico não pôde ser excluído. Tente novamente.");
      const { error: credentialError } = await admin.from("criafy_youtube_credentials")
        .delete().eq("company_id", companyId).eq("account_id", accountId);
      if (credentialError) throw new Error("Acesso revogado, mas as credenciais não puderam ser excluídas. Tente novamente.");
      const { error: accountError } = await admin.from("criafy_social_accounts")
        .delete().eq("company_id", companyId).eq("id", accountId);
      if (accountError) throw new Error("Acesso revogado, mas o canal não pôde ser removido. Tente novamente.");
      return respond({ success: true });
    }

    const uri = redirectUri();
    if (!uri.startsWith("https://") || new URL(uri).search || new URL(uri).hash) {
      throw new Error("YOUTUBE_REDIRECT_URI deve ser uma URL HTTPS fixa.");
    }
    const stateSecret = Deno.env.get("CRIAFY_OAUTH_STATE_SECRET") || youtubeEnv("YOUTUBE_CLIENT_SECRET");
    if (action === "get-auth-url") {
      const signedState = await createCriafyOAuthState({
        companyId, userId: user.id, redirectUri: uri, provider: "YOUTUBE",
      }, stateSecret);
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("client_id", youtubeEnv("YOUTUBE_CLIENT_ID"));
      url.searchParams.set("redirect_uri", uri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", `${YOUTUBE_UPLOAD_SCOPE} ${YOUTUBE_READ_SCOPE}`);
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "consent select_account");
      url.searchParams.set("state", signedState);
      return respond({ success: true, authUrl: url.toString() });
    }
    if (action !== "exchange-code" || !code || !state) {
      return respond({ error: "Ação ou retorno OAuth inválido." }, 400);
    }
    await verifyCriafyOAuthState(state, stateSecret, {
      companyId, userId: user.id, redirectUri: uri, provider: "YOUTUBE",
    });
    const token = await youtubeTokenRequest({
      code: String(code), grant_type: "authorization_code", redirect_uri: uri,
    });
    if (!token.refresh_token) throw new Error("Google não concedeu acesso offline. Remova o acesso anterior ao app e conecte novamente.");
    const scopes = String(token.scope || "").split(" ").filter(Boolean);
    if (!scopes.includes(YOUTUBE_UPLOAD_SCOPE) || !scopes.includes(YOUTUBE_READ_SCOPE)) {
      throw new Error("Autorize as permissões de upload e leitura do canal YouTube.");
    }
    const channelsResponse = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&maxResults=2",
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    const channels = await youtubeJson(channelsResponse);
    const channel = channels.items?.[0];
    if (!channel?.id) throw new Error("Esta conta Google não possui canal YouTube disponível para publicação.");
    const { data: account, error: accountError } = await admin.from("criafy_social_accounts")
      .upsert({
        company_id: companyId, provider: "YOUTUBE", provider_account_id: String(channel.id),
        display_name: String(channel.snippet?.title || "Canal YouTube"),
        avatar_url: channel.snippet?.thumbnails?.default?.url || null,
        connection_status: "CONNECTED", created_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,provider,provider_account_id" })
      .select("id,company_id,provider,provider_account_id,display_name,avatar_url,connection_status,created_at")
      .single();
    if (accountError || !account) throw new Error(accountError?.message || "Falha ao registrar canal YouTube.");
    const { error: credentialError } = await admin.from("criafy_youtube_credentials")
      .upsert({
        account_id: account.id, company_id: companyId,
        access_token: token.access_token, refresh_token: token.refresh_token, scopes,
        access_expires_at: new Date(Date.now() + Number(token.expires_in) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "account_id" });
    if (credentialError) {
      await admin.from("criafy_social_accounts").update({ connection_status: "ERROR" }).eq("id", account.id);
      throw new Error("Falha ao guardar autorização do YouTube.");
    }
    return respond({ success: true, account });
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : "Falha na conexão YouTube." }, 400);
  }
});
