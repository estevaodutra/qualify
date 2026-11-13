export function tiktokEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} não configurado no backend.`);
  return value;
}

export async function requestTikTokTokens(params: Record<string, string>) {
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: tiktokEnv("TIKTOK_CLIENT_KEY"),
      client_secret: tiktokEnv("TIKTOK_CLIENT_SECRET"),
      ...params,
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error || !data.access_token || !data.refresh_token) {
    throw new Error(`TikTok OAuth: ${data.error_description || data.error || response.status}`);
  }
  return data;
}

export async function callTikTokApi(url: string, token: string, body?: unknown) {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = await response.json();
  if (!response.ok || json.error?.code !== "ok") {
    const code = String(json.error?.code || "unknown_error");
    if (code === "unaudited_client_can_only_post_to_private_accounts") {
      throw new Error("O TikTok exige que a própria conta esteja privada enquanto o aplicativo não for auditado. No TikTok, ative Conta privada em Configurações e privacidade → Privacidade. Depois tente novamente com a visibilidade Só eu.");
    }
    throw new Error(`TikTok API (${code}): ${json.error?.message || response.status}${json.error?.log_id ? ` [log ${json.error.log_id}]` : ""}`);
  }
  return json.data;
}

export async function usableTikTokToken(admin: SupabaseClient, companyId: string, accountId: string): Promise<string> {
  const { data: credential, error } = await admin.from("criafy_tiktok_credentials")
    .select("access_token,refresh_token,scopes,access_expires_at,refresh_expires_at")
    .eq("company_id", companyId).eq("account_id", accountId).single();
  if (error || !credential) throw new Error("Conta TikTok sem autorização. Conecte novamente.");
  if (!credential.scopes?.includes("video.publish")) throw new Error("Autorização TikTok sem video.publish.");
  if (new Date(credential.access_expires_at).getTime() > Date.now() + 5 * 60_000) {
    return credential.access_token;
  }
  if (new Date(credential.refresh_expires_at).getTime() <= Date.now()) {
    throw new Error("Autorização TikTok expirada. Conecte novamente.");
  }

  const refreshed = await requestTikTokTokens({
    grant_type: "refresh_token", refresh_token: credential.refresh_token,
  });
  const now = Date.now();
  const { data: saved, error: saveError } = await admin.from("criafy_tiktok_credentials")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      scopes: String(refreshed.scope || "").split(",").map((value: string) => value.trim()).filter(Boolean),
      access_expires_at: new Date(now + Number(refreshed.expires_in) * 1000).toISOString(),
      refresh_expires_at: new Date(now + Number(refreshed.refresh_expires_in) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("company_id", companyId).eq("account_id", accountId)
    .eq("refresh_token", credential.refresh_token).select("access_token").single();
  if (saveError || !saved) throw new Error("Falha ao renovar a autorização TikTok. Tente novamente.");
  return saved.access_token;
}
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

