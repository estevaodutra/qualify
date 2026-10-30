import { supabase } from "@/integrations/supabase/client";

export interface ApifyRunItem {
  id: string;
  status: "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMED-OUT" | "ABORTED";
  startedAt: string;
  finishedAt?: string;
  durationSeconds?: number;
  itemCount?: number;
  usageTotalUsd?: number;
  defaultDatasetId?: string;
}

export interface ApifyConfig {
  configured: boolean;
  maskedKey?: string;
  status: "connected" | "disconnected" | "error" | "not_configured";
  actorId: string;
  actorName: string;
  actorTitle?: string;
  actorDescription?: string;
  username?: string;
  userEmail?: string;
  planName?: string;
  monthlyUsageUsd?: number;
  defaultMaxPlaces: number;
  defaultLanguage: string;
  defaultCountry: string;
  maxMemoryMbytes: number;
  timeoutSecs: number;
  extractSocial: boolean;
  extractHours: boolean;
  extractReviews: boolean;
  callbackUrl: string;
  lastValidatedAt?: string;
}

export class ApifySettingsService {
  private static readonly SETTING_KEY = "apify_config";
  public static readonly DEFAULT_ACTOR = "compass~crawler-google-places";
  public static readonly DEFAULT_CALLBACK = "https://qualify-supabase.d2x.site/functions/v1/prospecting-callback";

  // Presets recomendados de atores da Apify para prospecção
  public static readonly ACTOR_PRESETS = [
    {
      id: "compass~crawler-google-places",
      label: "Google Maps Scraper (Compass)",
      description: "Recomendado e homologado para extração rica de locais, telefones, horários, avaliações e redes sociais.",
      docsUrl: "https://apify.com/compass/crawler-google-places",
    },
    {
      id: "tri_angle~google-maps-scraper",
      label: "Google Maps Extractor (TriAngle)",
      description: "Alternativa de alta performance para extração em massa com filtros geográficos.",
      docsUrl: "https://apify.com/tri_angle/google-maps-scraper",
    },
  ];

  /**
   * Obtém a configuração global da Apify armazenada em platform_settings
   */
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
      actorTitle: val.actor_title || "Google Maps Scraper (Compass)",
      actorDescription: val.actor_description || "Crawler oficial para extração e prospecção ativa de empresas e locais.",
      username: val.username || "",
      userEmail: val.user_email || "",
      planName: val.plan_name || "FREE",
      monthlyUsageUsd: val.monthly_usage_usd ?? 0,
      defaultMaxPlaces: val.default_max_places || 50,
      defaultLanguage: val.default_language || "pt-BR",
      defaultCountry: val.default_country || "BR",
      maxMemoryMbytes: val.max_memory_mbytes || 4096,
      timeoutSecs: val.timeout_secs || 300,
      extractSocial: val.extract_social ?? true,
      extractHours: val.extract_hours ?? true,
      extractReviews: val.extract_reviews ?? true,
      callbackUrl: val.callback_url || this.DEFAULT_CALLBACK,
      lastValidatedAt: val.last_validated_at || "",
    };
  }

  /**
   * Salva as configurações da Apify na plataforma
   */
  static async saveApifyConfig(params: {
    apiKey?: string;
    actorId?: string;
    defaultMaxPlaces?: number;
    defaultLanguage?: string;
    defaultCountry?: string;
    maxMemoryMbytes?: number;
    timeoutSecs?: number;
    extractSocial?: boolean;
    extractHours?: boolean;
    extractReviews?: boolean;
  }): Promise<void> {
    const { data: current } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", this.SETTING_KEY)
      .maybeSingle();

    const existing = current?.value || {};
    const keyToUse = params.apiKey?.trim() ? params.apiKey.trim() : existing.api_key;

    if (!keyToUse) {
      throw new Error("Informe um Personal API Token válido da Apify.");
    }

    const actorToUse = params.actorId || existing.actor_id || this.DEFAULT_ACTOR;

    // Se uma nova chave foi inserida ou se for salvar, validamos contra a API da Apify
    let userInfo = {
      username: existing.username || "",
      email: existing.user_email || "",
      plan: existing.plan_name || "FREE",
      usageUsd: existing.monthly_usage_usd ?? 0,
    };
    let actorInfo = {
      title: existing.actor_title || "Google Maps Scraper",
      description: existing.actor_description || "",
    };

    if (params.apiKey?.trim() || !existing.username) {
      try {
        const res = await fetch(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(keyToUse)}`);
        if (!res.ok) {
          throw new Error("Token da Apify inválido ou expirado.");
        }
        const data = await res.json();
        userInfo.username = data.data?.username || "";
        userInfo.email = data.data?.email || "";
        userInfo.plan = data.data?.plan?.name || "FREE";
        userInfo.usageUsd = data.data?.monthlyUsageUsd ?? 0;

        // Validar também o ator na Apify
        const actorNormalized = actorToUse.replace("/", "~");
        const actorRes = await fetch(`https://api.apify.com/v2/acts/${actorNormalized}?token=${encodeURIComponent(keyToUse)}`);
        if (actorRes.ok) {
          const actorData = await actorRes.json();
          actorInfo.title = actorData.data?.title || actorInfo.title;
          actorInfo.description = actorData.data?.description || actorInfo.description;
        }
      } catch (err: any) {
        throw new Error(`Falha ao validar token com a Apify: ${err.message}`);
      }
    }

    const newConfig = {
      ...existing,
      api_key: keyToUse,
      actor_id: actorToUse,
      actor_name: "Google Maps Scraper",
      actor_title: actorInfo.title,
      actor_description: actorInfo.description,
      default_max_places: params.defaultMaxPlaces ?? existing.default_max_places ?? 50,
      default_language: params.defaultLanguage || existing.default_language || "pt-BR",
      default_country: params.defaultCountry || existing.default_country || "BR",
      max_memory_mbytes: params.maxMemoryMbytes ?? existing.max_memory_mbytes ?? 4096,
      timeout_secs: params.timeoutSecs ?? existing.timeout_secs ?? 300,
      extract_social: params.extractSocial ?? existing.extract_social ?? true,
      extract_hours: params.extractHours ?? existing.extract_hours ?? true,
      extract_reviews: params.extractReviews ?? existing.extract_reviews ?? true,
      callback_url: this.DEFAULT_CALLBACK,
      username: userInfo.username,
      user_email: userInfo.email,
      plan_name: userInfo.plan,
      monthly_usage_usd: userInfo.usageUsd,
      status: "connected",
      last_validated_at: new Date().toISOString(),
    };

    // 1. Salva em platform_settings
    const { error } = await (supabase as any).from("platform_settings").upsert(
      {
        key: this.SETTING_KEY,
        value: newConfig,
        description: "Configuração global da Apify para o motor de Prospecção Ativa e Extração no Google Maps",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) throw error;

    // 2. Sincroniza em company_credentials como fallback global para retrocompatibilidade
    try {
      await (supabase as any).from("company_credentials").upsert(
        {
          company_id: null,
          service_name: "apify",
          encrypted_key: keyToUse,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,service_name" }
      );
    } catch {
      // Ignora erro se schema de company_credentials não permitir company_id null
    }
  }

  /**
   * Testa a conectividade em tempo real com a Apify (conta e ator)
   */
  static async validateApifyConnection(): Promise<{
    username: string;
    email: string;
    planName: string;
    actorStatus: string;
    monthlyUsageUsd: number;
  }> {
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
      throw new Error("Token da Apify não autorizado ou expirado. Verifique a chave inserida.");
    }
    const userData = await userRes.json();

    const actorId = (data?.value?.actor_id || this.DEFAULT_ACTOR).replace("/", "~");
    const actorRes = await fetch(`https://api.apify.com/v2/acts/${actorId}?token=${encodeURIComponent(key)}`);
    const actorData = actorRes.ok ? await actorRes.json() : null;

    const username = userData.data?.username || "Usuário Apify";
    const email = userData.data?.email || "";
    const planName = userData.data?.plan?.name || "FREE";
    const monthlyUsageUsd = userData.data?.monthlyUsageUsd ?? 0;
    const actorStatus = actorData?.data?.title || "Ator Ativo & Homologado";

    // Atualiza status e timestamp
    await (supabase as any)
      .from("platform_settings")
      .update({
        value: {
          ...data.value,
          username,
          user_email: email,
          plan_name: planName,
          monthly_usage_usd: monthlyUsageUsd,
          actor_title: actorStatus,
          status: "connected",
          last_validated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("key", this.SETTING_KEY);

    return {
      username,
      email,
      planName,
      actorStatus,
      monthlyUsageUsd,
    };
  }

  /**
   * Busca as últimas execuções (Runs) do ator diretamente da Apify
   */
  static async getRecentRuns(limit: number = 5): Promise<ApifyRunItem[]> {
    const { data } = await (supabase as any)
      .from("platform_settings")
      .select("value")
      .eq("key", this.SETTING_KEY)
      .maybeSingle();

    const key = data?.value?.api_key;
    const actorId = (data?.value?.actor_id || this.DEFAULT_ACTOR).replace("/", "~");

    if (!key) return [];

    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/runs?limit=${limit}&desc=true&token=${encodeURIComponent(key)}`
      );

      if (!res.ok) {
        return [];
      }

      const json = await res.json();
      const items = json.data?.items || [];

      return items.map((run: any) => {
        const start = run.startedAt ? new Date(run.startedAt).getTime() : 0;
        const end = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
        const durationSeconds = start > 0 ? Math.round((end - start) / 1000) : 0;

        return {
          id: run.id,
          status: run.status,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          durationSeconds,
          itemCount: run.stats?.itemCount || 0,
          usageTotalUsd: run.usageTotalUsd || 0,
          defaultDatasetId: run.defaultDatasetId,
        };
      });
    } catch {
      return [];
    }
  }
}
