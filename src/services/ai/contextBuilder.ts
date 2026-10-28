import { supabase } from "@/integrations/supabase/client";
import { ContextPackage } from "@/types/aiSkills";

export interface BuildContextParams {
  companyId?: string;
  accountId?: string;
  contentId?: string;
  format?: string;
  theme?: string;
  objective?: string;
  angle?: string;
  cta?: string;
  customInstruction?: string;
}

export const ContextBuilder = {
  /**
   * Constrói o Context Package isolado por tenant (company_id e account_id).
   * Garante que dados de uma empresa nunca vazem para outra.
   */
  async build(params: BuildContextParams): Promise<ContextPackage> {
    const {
      companyId,
      accountId,
      contentId,
      format = "REEL",
      theme = "",
      objective = "",
      angle = "",
      cta = "",
      customInstruction = "",
    } = params;

    let companyData: { id?: string; name?: string; brand_manual?: Record<string, any> } = {};
    let accountData: { id?: string; username?: string; network?: string; strategy?: Record<string, any> } = {};
    let mediaReference: any = null;

    // 1. Contexto da Empresa (Brand Manual)
    if (companyId) {
      const { data: comp } = await (supabase as any)
        .from("companies")
        .select("id, name")
        .eq("id", companyId)
        .maybeSingle();

      let brandManual: Record<string, any> = {};

      // Buscar Brand Manual do Sprint OS
      const { data: sprintWs } = await (supabase as any)
        .from("sprint_os_workspaces")
        .select("data")
        .eq("company_id", companyId)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sprintWs?.data?.brandManual) {
        brandManual = sprintWs.data.brandManual;
      }

      companyData = {
        id: comp?.id,
        name: comp?.name,
        brand_manual: brandManual,
      };
    }

    // 2. Contexto da Conta (Estratégia e Briefing Permanente)
    if (accountId) {
      const { data: acc } = await (supabase as any)
        .from("criafy_instagram_accounts")
        .select("id, username, name")
        .eq("id", accountId)
        .maybeSingle();

      const { data: briefing } = await (supabase as any)
        .from("criafy_account_briefings")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();

      let strategy: Record<string, any> = {};
      if (briefing) {
        strategy = {
          brand_name: briefing.brand_name || acc?.name || acc?.username,
          about: briefing.about,
          objective: briefing.objective,
          target_audience: briefing.target_audience,
          brand_positioning: briefing.brand_positioning,
          tone_of_voice: briefing.tone_of_voice,
          allowed_topics: briefing.allowed_topics,
          forbidden_topics: briefing.forbidden_topics,
          preferred_vocabulary: briefing.preferred_vocabulary,
          forbidden_vocabulary: briefing.forbidden_vocabulary,
          preferred_ctas: briefing.preferred_ctas,
          free_ai_context: briefing.free_ai_context,
        };
      }

      accountData = {
        id: acc?.id,
        username: acc?.username,
        network: "instagram",
        strategy,
      };
    }

    // 3. Conteúdo ou Mídia Referenciada
    if (contentId) {
      const { data: media } = await (supabase as any)
        .from("criafy_contents")
        .select("title, media_type, duration_seconds, aspect_ratio, ai_analysis")
        .eq("id", contentId)
        .maybeSingle();
      mediaReference = media;
    }

    // 4. Montar Context Package enxuto e relevante
    return {
      company: companyData,
      account: accountData,
      content_request: {
        format,
        theme: theme || "Conteúdo relevante de alta retenção",
        objective: objective || accountData.strategy?.objective || "Engajamento e autoridade",
        angle,
        cta,
        custom_instruction: customInstruction,
      },
      media_reference: mediaReference,
    };
  },
};
