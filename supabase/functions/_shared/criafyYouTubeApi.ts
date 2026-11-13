import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload";
export const YOUTUBE_READ_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

export function youtubeEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} não configurado no backend.`);
  return value;
}

export async function youtubeTokenRequest(params: Record<string, string>) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: youtubeEnv("YOUTUBE_CLIENT_ID"),
      client_secret: youtubeEnv("YOUTUBE_CLIENT_SECRET"),
      ...params,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Google OAuth: ${data.error_description || data.error || response.status}`);
  }
  return data;
}

export async function youtubeJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = data.error?.errors?.[0]?.reason || data.error?.status || response.status;
    const message = data.error?.message || "Falha na API do YouTube.";
    throw new Error(`YouTube (${reason}): ${message}`);
  }
  return data;
}

export async function usableYouTubeToken(admin: SupabaseClient, companyId: string, accountId: string): Promise<string> {
  const { data: credential, error } = await admin.from("criafy_youtube_credentials")
    .select("access_token,refresh_token,scopes,access_expires_at")
    .eq("company_id", companyId).eq("account_id", accountId).single();
  if (error || !credential) throw new Error("Canal YouTube sem autorização. Conecte novamente.");
  if (!credential.scopes?.includes(YOUTUBE_UPLOAD_SCOPE)) {
    throw new Error("Autorização do YouTube sem permissão de upload. Conecte novamente.");
  }
  if (new Date(credential.access_expires_at).getTime() > Date.now() + 5 * 60_000) {
    return credential.access_token;
  }
  const refreshed = await youtubeTokenRequest({
    grant_type: "refresh_token", refresh_token: credential.refresh_token,
  });
  const { data: saved, error: saveError } = await admin.from("criafy_youtube_credentials")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || credential.refresh_token,
      access_expires_at: new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("company_id", companyId).eq("account_id", accountId)
    .eq("refresh_token", credential.refresh_token).select("access_token").maybeSingle();
  if (saveError) throw new Error("Falha ao renovar autorização do YouTube.");
  if (saved) return saved.access_token;
  // Another request may have refreshed the same token in the meantime.
  const { data: current } = await admin.from("criafy_youtube_credentials")
    .select("access_token").eq("company_id", companyId).eq("account_id", accountId).single();
  if (!current) throw new Error("Falha ao renovar autorização do YouTube.");
  return current.access_token;
}
