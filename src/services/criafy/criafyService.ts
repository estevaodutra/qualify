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
      throw new Error(data?.error || error?.message || "Erro ao obter URL de autenticação OAuth Meta.");
    }
    return data.authUrl;
  },

  async exchangeOAuthCode(companyId: string, code: string, redirectUri: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke("criafy-instagram-oauth", {
      body: { action: "exchange-code", companyId, code, redirectUri },
    });

    if (error || !data?.success) {
      throw new Error(data?.error || error?.message || "Erro ao processar autorização da Meta.");
    }
    return data;
  },

  async checkAccountTokenHealth(accountId: string): Promise<{ status: string; valid: boolean; error?: string }> {
    const { data, error } = await supabase.functions.invoke("criafy-instagram-oauth", {
      body: { action: "check-token-status", accountId },
    });

    if (error || !data?.success) {
      throw new Error(data?.error || error?.message || "Erro ao verificar status do token.");
    }
    return data;
  },

  async disconnectAccountToken(accountId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke("criafy-instagram-oauth", {
      body: { action: "disconnect-account", accountId },
    });

    if (error || !data?.success) {
      throw new Error(data?.error || error?.message || "Erro ao desconectar conta.");
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
        criafy_content_accounts ( account_id )
      `)
      .eq("company_id", companyId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    let items = (data || []).map((item: any) => ({
      ...item,
      linked_account_ids: item.criafy_content_accounts
        ? item.criafy_content_accounts.map((ca: any) => ca.account_id)
        : [],
    }));

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

    const bucketName = "chat-media"; // Standard public bucket in Qualify

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
