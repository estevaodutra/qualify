import { supabase } from "@/integrations/supabase/client";
import {
  CriafyInstagramAccount,
  CriafyAccountBriefing,
  CriafyContent,
  CriafyQueueRule,
  CriafyPublication,
  CriafyPublicationAttempt,
  CriafyMediaType,
  CriafyPublicationType,
} from "@/types/criafy";
import {
  CriafyOAuthExchangeResult,
  validateOAuthExchangeResult,
} from "@/services/criafy/oauthResponse";

async function functionErrorMessage(data: unknown, error: unknown, fallback: string): Promise<string> {
  const dataError = (data as { error?: unknown } | null)?.error;
  if (typeof dataError === "string") return dataError;

  const ctx: any = (error as any)?.context;
  if (ctx) {
    try {
      if (typeof ctx.clone === "function") {
        const json = await ctx.clone().json();
        if (json?.error) return typeof json.error === "string" ? json.error : JSON.stringify(json.error);
        if (json?.msg) return typeof json.msg === "string" ? json.msg : JSON.stringify(json.msg);
      } else if (typeof ctx.json === "function") {
        const json = await ctx.json();
        if (json?.error) return typeof json.error === "string" ? json.error : JSON.stringify(json.error);
        if (json?.msg) return typeof json.msg === "string" ? json.msg : JSON.stringify(json.msg);
      }
    } catch {
      // Fall back below
    }
  }

  const sdkMessage = (error as { message?: unknown } | null)?.message;
  return typeof sdkMessage === "string" ? sdkMessage : fallback;
}

export const criafyService = {
  // ==========================================
  // CONTAS INSTAGRAM
  // ==========================================
  async getAccounts(companyId: string): Promise<CriafyInstagramAccount[]> {
    const { data, error } = await (supabase as any)
      .from("criafy_instagram_accounts")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async syncAccountProfile(accountId: string): Promise<CriafyInstagramAccount> {
    const { data: account, error: getErr } = await (supabase as any)
      .from("criafy_instagram_accounts")
      .select("*")
      .eq("id", accountId)
      .single();
    if (getErr || !account) throw new Error("Conta não encontrada");

    const token = account.access_token;
    const igId = account.instagram_account_id;
    if (!token || !igId) throw new Error("Conta sem token ou ID de acesso da Meta.");

    const res = await fetch(
      `https://graph.facebook.com/v22.0/${igId}?fields=id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,website&access_token=${token}`
    );
    const metaData = await res.json();
    if (metaData.error) throw new Error(`Meta API: ${metaData.error.message}`);

    const updatedMetadata = {
      ...(account.metadata || {}),
      followers_count: metaData.followers_count,
      follows_count: metaData.follows_count,
      media_count: metaData.media_count,
      biography: metaData.biography,
      website: metaData.website,
    };

    const { data: updated, error: updErr } = await (supabase as any)
      .from("criafy_instagram_accounts")
      .update({
        name: metaData.name || account.name,
        profile_picture_url: metaData.profile_picture_url || account.profile_picture_url,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId)
      .select()
      .single();

    if (updErr) throw updErr;
    return updated;
  },

  async addAccount(accountData: Partial<CriafyInstagramAccount>): Promise<CriafyInstagramAccount> {
    const { data, error } = await (supabase as any)
      .from("criafy_instagram_accounts")
      .insert(accountData)
      .select()
      .single();

    if (error) throw error;

    // Auto-create default Briefing for the account
    if (data) {
      await this.saveBriefing({
        company_id: data.company_id,
        account_id: data.id,
        brand_name: data.name || data.username,
        main_topics: [],
        allowed_topics: [],
        forbidden_topics: [],
        preferred_ctas: [],
        preferred_vocabulary: [],
        forbidden_vocabulary: [],
      });
    }

    return data;
  },

  async getOAuthUrl(companyId: string, redirectUri: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("criafy-instagram-oauth", {
      body: { action: "get-auth-url", companyId, redirectUri },
    });

    if (error || !data?.success) {
      throw new Error(await functionErrorMessage(data, error, "Erro ao obter URL de autenticação OAuth Meta."));
    }
    if (!data.authUrl) throw new Error("A integração não retornou a URL de autenticação do Instagram.");
    return data.authUrl;
  },

  async exchangeOAuthCode(
    companyId: string,
    code: string,
    redirectUri: string,
    state: string
  ): Promise<CriafyOAuthExchangeResult> {
    const { data, error } = await supabase.functions.invoke("criafy-instagram-oauth", {
      body: { action: "exchange-code", companyId, code, redirectUri, state },
    });

    if (error || !data?.success) {
      throw new Error(await functionErrorMessage(data, error, "Erro ao processar autorização da Meta."));
    }
    return validateOAuthExchangeResult(data);
  },

  async checkAccountTokenHealth(accountId: string): Promise<{ status: string; valid: boolean; error?: string }> {
    const { data, error } = await supabase.functions.invoke("criafy-instagram-oauth", {
      body: { action: "check-token-status", accountId },
    });

    if (error || !data?.success) {
      throw new Error(await functionErrorMessage(data, error, "Erro ao verificar status do token."));
    }
    return data;
  },

  async disconnectAccountToken(accountId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke("criafy-instagram-oauth", {
      body: { action: "disconnect-account", accountId },
    });

    if (error || !data?.success) {
      throw new Error(await functionErrorMessage(data, error, "Erro ao desconectar conta."));
    }
  },

  async updateAccountStatus(accountId: string, status: string, errorMessage?: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("criafy_instagram_accounts")
      .update({
        connection_status: status,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId);

    if (error) throw error;
  },

  async deleteAccount(accountId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("criafy_instagram_accounts")
      .delete()
      .eq("id", accountId);

    if (error) throw error;
  },

  // ==========================================
  // MOTOR DE IA DO CRIAFY
  // ==========================================
  async generateAiCopy(params: {
    companyId: string;
    accountId: string;
    contentId?: string;
    promptType?: "CAPTION" | "HOOKS" | "SUMMARY" | "HASHTAGS";
    publicationType?: string;
    customInstruction?: string;
  }): Promise<string> {
    const { data, error } = await supabase.functions.invoke("criafy-ai-generator", {
      body: params,
    });

    if (error || !data?.success) {
      throw new Error(data?.error || error?.message || "Erro ao gerar copy com a IA.");
    }
    return data.result;
  },

  // ==========================================
  // BRIEFING DA CONTA
  // ==========================================
  async getBriefing(accountId: string): Promise<CriafyAccountBriefing | null> {
    const { data, error } = await (supabase as any)
      .from("criafy_account_briefings")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async saveBriefing(briefing: Partial<CriafyAccountBriefing>): Promise<CriafyAccountBriefing> {
    const { data, error } = await (supabase as any)
      .from("criafy_account_briefings")
      .upsert(
        {
          ...briefing,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ==========================================
  // CONTEÚDOS & ESTOQUE DE MÍDIA
  // ==========================================
  async getContents(companyId: string, accountIdFilter?: string): Promise<CriafyContent[]> {
    let query = (supabase as any)
      .from("criafy_contents")
      .select(`
        *,
        criafy_content_accounts ( account_id ),
        criafy_publications (
          id,
          publication_type,
          status,
          published_at,
          scheduled_at,
          ig_permalink
        )
      `)
      .eq("company_id", companyId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    let items = (data || []).map((item: any) => {
      const allPubs = item.criafy_publications || [];
      const publishedList = allPubs.filter((p: any) => p.status === "PUBLISHED");
      const scheduledList = allPubs.filter((p: any) => p.status === "SCHEDULED" || p.status === "PUBLISHING");
      const isPublished = publishedList.length > 0;
      const isScheduled = scheduledList.length > 0;
      const publishCount = publishedList.length;

      const sortedPublished = publishedList.slice().sort(
        (a: any, b: any) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
      );
      const lastPublishedAt = sortedPublished[0]?.published_at || null;

      return {
        ...item,
        linked_account_ids: item.criafy_content_accounts
          ? item.criafy_content_accounts.map((ca: any) => ca.account_id)
          : [],
        publications: allPubs,
        is_published: isPublished,
        is_scheduled: isScheduled,
        publish_count: publishCount,
        last_published_at: lastPublishedAt,
      };
    });

    if (accountIdFilter && accountIdFilter !== "all") {
      items = items.filter((item: CriafyContent) =>
        item.linked_account_ids?.includes(accountIdFilter)
      );
    }

    return items;
  },

  async uploadMediaFile(
    companyId: string,
    file: File
  ): Promise<{ mediaUrl: string; mediaType: CriafyMediaType; mimeType: string }> {
    const isVideo = file.type.startsWith("video/");
    const mediaType: CriafyMediaType = isVideo ? "VIDEO" : "IMAGE";
    const fileExt = file.name.split(".").pop() || "bin";
    const fileName = `${companyId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    const bucketName = "media"; // Public bucket in Qualify

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, { cacheControl: "3600", upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);

    return {
      mediaUrl: publicUrlData.publicUrl,
      mediaType,
      mimeType: file.type,
    };
  },

  async createContent(
    contentData: Partial<CriafyContent>,
    accountIds: string[]
  ): Promise<CriafyContent> {
    const { data: content, error } = await (supabase as any)
      .from("criafy_contents")
      .insert({
        ...contentData,
        meta_validation_status: contentData.meta_validation_status || "VALID",
      })
      .select()
      .single();

    if (error) throw error;

    if (accountIds && accountIds.length > 0) {
      const bindings = accountIds.map((accId) => ({
        company_id: content.company_id,
        content_id: content.id,
        account_id: accId,
      }));

      const { error: bindError } = await (supabase as any)
        .from("criafy_content_accounts")
        .insert(bindings);

      if (bindError) throw bindError;
    }

    return {
      ...content,
      linked_account_ids: accountIds,
    };
  },

  async updateContentAccountBindings(
    companyId: string,
    contentId: string,
    accountIds: string[]
  ): Promise<void> {
    // Delete existing bindings
    await (supabase as any)
      .from("criafy_content_accounts")
      .delete()
      .eq("content_id", contentId);

    if (accountIds.length > 0) {
      const bindings = accountIds.map((accId) => ({
        company_id: companyId,
        content_id: contentId,
        account_id: accId,
      }));

      const { error } = await (supabase as any)
        .from("criafy_content_accounts")
        .insert(bindings);

      if (error) throw error;
    }
  },

  async archiveContent(contentId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("criafy_contents")
      .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
      .eq("id", contentId);

    if (error) throw error;
  },

  // ==========================================
  // PUBLICAÇÕES
  // ==========================================
  async getPublications(companyId: string, accountIdFilter?: string): Promise<CriafyPublication[]> {
    let query = (supabase as any)
      .from("criafy_publications")
      .select(`
        *,
        account:criafy_instagram_accounts(*),
        content:criafy_contents(*)
      `)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (accountIdFilter && accountIdFilter !== "all") {
      query = query.eq("account_id", accountIdFilter);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createPublication(pubData: Partial<CriafyPublication>): Promise<CriafyPublication> {
    const { data, error } = await (supabase as any)
      .from("criafy_publications")
      .insert(pubData)
      .select(`
        *,
        account:criafy_instagram_accounts(*),
        content:criafy_contents(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async updatePublicationStatus(
    pubId: string,
    status: string,
    extra?: { published_at?: string; ig_media_id?: string; ig_permalink?: string }
  ): Promise<void> {
    const { error } = await (supabase as any)
      .from("criafy_publications")
      .update({
        status,
        ...extra,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pubId);

    if (error) throw error;
  },

  async publishNow(publicationId: string): Promise<{ igMediaId: string; igPermalink?: string }> {
    const { data, error } = await supabase.functions.invoke("criafy-publish-job", {
      body: { publicationId },
    });

    if (error || !data?.success) {
      throw new Error(await functionErrorMessage(data, error, "Erro ao publicar no Instagram."));
    }
    return data;
  },

  // ==========================================
  // REGRAS DE FILA AUTOMÁTICA
  // ==========================================
  async getQueueRule(accountId: string): Promise<CriafyQueueRule | null> {
    const { data, error } = await (supabase as any)
      .from("criafy_queue_rules")
      .select("*")
      .eq("account_id", accountId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async saveQueueRule(ruleData: Partial<CriafyQueueRule>): Promise<CriafyQueueRule> {
    const { data, error } = await (supabase as any)
      .from("criafy_queue_rules")
      .upsert(
        {
          ...ruleData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async generateAutoQueue(
    companyId: string,
    accountId: string,
    limitPosts?: number
  ): Promise<{ createdCount: number; startDate: string; endDate: string }> {
    // 1. Obter regra de fila da conta
    const rule = await this.getQueueRule(accountId);
    if (!rule || !rule.is_active) {
      throw new Error("A fila automática precisa estar ativa e configurada para esta conta.");
    }

    const times =
      rule.publication_times && rule.publication_times.length > 0
        ? rule.publication_times
        : ["08:00", "18:00"];
    const allowedDays =
      rule.allowed_days && rule.allowed_days.length > 0
        ? rule.allowed_days
        : [1, 2, 3, 4, 5, 6, 7];

    // 2. Buscar conteúdos ativos da empresa vinculados a esta conta
    const allContents = await this.getContents(companyId, accountId);
    if (allContents.length === 0) {
      throw new Error("Nenhum conteúdo vinculado a esta conta na biblioteca de mídias.");
    }

    // 3. Buscar publicações já agendadas ou publicadas para esta conta para não duplicar conteúdos
    const existingPubs = await this.getPublications(companyId, accountId);
    const usedContentIds = new Set(
      existingPubs
        .filter((p) => p.status !== "CANCELED" && p.status !== "FAILED")
        .map((p) => p.content_id)
    );

    const availableContents = allContents.filter((c) => !usedContentIds.has(c.id));
    if (availableContents.length === 0) {
      throw new Error("Todos os conteúdos vinculados a esta conta já foram agendados ou publicados!");
    }

    const contentsToQueue = limitPosts
      ? availableContents.slice(0, limitPosts)
      : availableContents;

    // 4. Calcular slots futuros conforme os horários e dias permitidos
    let currentDate = new Date(rule.start_date || new Date().toISOString().split("T")[0]);
    const now = new Date();
    if (currentDate < now) {
      currentDate = new Date();
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const newPublications: any[] = [];
    let contentIdx = 0;
    let iterations = 0;
    const maxIterations = 365;

    while (contentIdx < contentsToQueue.length && iterations < maxIterations) {
      iterations++;
      const jsDay = currentDate.getDay();
      const mappedDay = jsDay === 0 ? 7 : jsDay;

      if (allowedDays.includes(mappedDay)) {
        for (const timeStr of times) {
          if (contentIdx >= contentsToQueue.length) break;

          const [hours, minutes] = timeStr.split(":").map(Number);
          const slotDate = new Date(currentDate);
          slotDate.setHours(hours || 0, minutes || 0, 0, 0);

          const content = contentsToQueue[contentIdx];
          let pubType: CriafyPublicationType = "FEED";
          if (content.media_type === "VIDEO") {
            pubType = content.aspect_ratio?.includes("9:16") ? "REEL" : "FEED";
          } else {
            pubType = content.aspect_ratio?.includes("9:16") ? "STORY_IMAGE" : "FEED";
          }

          newPublications.push({
            company_id: companyId,
            account_id: accountId,
            content_id: content.id,
            publication_type: pubType,
            caption: content.title ? `${content.title}` : undefined,
            scheduled_at: slotDate.toISOString(),
            status: "SCHEDULED",
            is_auto_queued: true,
          });

          contentIdx++;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (newPublications.length > 0) {
      const { error: insertErr } = await (supabase as any)
        .from("criafy_publications")
        .insert(newPublications);

      if (insertErr) throw insertErr;
    }

    return {
      createdCount: newPublications.length,
      startDate: newPublications[0]?.scheduled_at || "",
      endDate: newPublications[newPublications.length - 1]?.scheduled_at || "",
    };
  },

  // ==========================================
  // AUDITORIA E RESPOSTAS
  // ==========================================
  async logPublicationAttempt(attempt: Partial<CriafyPublicationAttempt>): Promise<void> {
    const { error } = await (supabase as any)
      .from("criafy_publication_attempts")
      .insert(attempt);

    if (error) throw error;
  },

  async getPublicationAttempts(publicationId: string): Promise<CriafyPublicationAttempt[]> {
    const { data, error } = await (supabase as any)
      .from("criafy_publication_attempts")
      .select("*")
      .eq("publication_id", publicationId)
      .order("attempted_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
