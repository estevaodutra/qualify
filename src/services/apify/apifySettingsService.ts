import { supabase } from "@/integrations/supabase/client";

export interface ApifyConfig {
  configured: boolean;
  maskedKey?: string;
  status: "connected" | "disconnected" | "error" | "not_configured";
  actorId: string;
  actorName: string;
  username?: string;
  userEmail?: string;
  defaultMaxPlaces: number;
  defaultLanguage: string;
  callbackUrl: string;
  lastValidatedAt?: string;
}

export class ApifySettingsService {
  private static readonly SETTING_KEY = "apify_config";
  private static readonly DEFAULT_ACTOR = "compass~crawler-google-places";
  private static readonly DEFAULT_CALLBACK = "https://qualify-supabase.d2x.site/functions/v1/prospecting-callback";

  static async getApifyConfig(): Promise<ApifyConfig> {
    const { data } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", this.SETTING_KEY)
      .maybeSingle();

    const val = data?.value || {};
    const key = val.api_key || "";
    let maskedKey = "";
    if (key.length > 12) {
      maskedKey = `${key.slice(0, 10)}...${key.slice(-4)}`;
    }

    return {
      configured: !!key,
      maskedKey,
      status: val.status || (key ? "connected" : "not_configured"),
      actorId: val.actor_id || this.DEFAULT_ACTOR,
      actorName: val.actor_name || "Google Maps Scraper",
      username: val.username || "",
      userEmail: val.user_email || "",
      defaultMaxPlaces: val.default_max_places || 50,
      defaultLanguage: val.default_language || "pt-BR",
      callbackUrl: val.callback_url || this.DEFAULT_CALLBACK,
      lastValidatedAt: val.last_validated_at || "",
    };
  }

  static async saveApifyConfig(params: {
    apiKey?: string;
    actorId?: string;
    defaultMaxPlaces?: number;
    defaultLanguage?: string;
  }): Promise<void> {
    const { data: current } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", this.SETTING_KEY)
      .maybeSingle();

    const existing = current?.value || {};
    const keyToUse = params.apiKey?.trim() ? params.apiKey.trim() : existing.api_key;

    if (!keyToUse) {
      throw new Error("Informe uma chave de API válida da Apify.");
    }

    // Se uma nova chave foi inserida, validamos na API da Apify antes de salvar
    let userInfo = { username: existing.username || "", email: existing.user_email || "" };
    if (params.apiKey?.trim()) {
      try {
        const res = await fetch(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(keyToUse)}`);
        if (!res.ok) {
          throw new Error("Token da Apify inválido ou expirado.");
        }
        const data = await res.json();
        userInfo.username = data.data?.username || "";
        userInfo.email = data.data?.email || "";
      } catch (err: any) {
        throw new Error(`Falha ao validar token com a Apify: ${err.message}`);
      }
    }

    const newConfig = {
      ...existing,
      api_key: keyToUse,
      actor_id: params.actorId || existing.actor_id || this.DEFAULT_ACTOR,
      actor_name: "Google Maps Scraper",
      default_max_places: params.defaultMaxPlaces ?? existing.default_max_places ?? 50,
      default_language: params.defaultLanguage || existing.default_language || "pt-BR",
      callback_url: this.DEFAULT_CALLBACK,
      username: userInfo.username,
      user_email: userInfo.email,
      status: "connected",
      last_validated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any).from("platform_settings").upsert(
      {
        key: this.SETTING_KEY,
        value: newConfig,
        description: "Configuração global da Apify para o módulo de Prospecção e Scraper do Google Maps",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) throw error;
  }

  static async validateApifyConnection(): Promise<{ username: string; email: string; actorStatus: string }> {
    const { data } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", this.SETTING_KEY)
      .maybeSingle();

    const key = data?.value?.api_key;
    if (!key) {
      throw new Error("Nenhuma chave de API da Apify configurada.");
    }

    const userRes = await fetch(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(key)}`);
    if (!userRes.ok) {
      throw new Error("Token da Apify não autorizado ou expirado.");
    }
    const userData = await userRes.json();

    const actorId = data?.value?.actor_id || this.DEFAULT_ACTOR;
    const actorRes = await fetch(`https://api.apify.com/v2/acts/${actorId}?token=${encodeURIComponent(key)}`);
    const actorData = actorRes.ok ? await actorRes.json() : null;

    const username = userData.data?.username || "Usuário Apify";
    const email = userData.data?.email || "";
    const actorStatus = actorData?.data?.title || "Disponível";

    // Atualiza status e timestamp
    await (supabase as any)
      .from("platform_settings")
      .update({
        value: {
          ...data.value,
          username,
          user_email: email,
          status: "connected",
          last_validated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("key", this.SETTING_KEY);

    return { username, email, actorStatus };
  }
}
