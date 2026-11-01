import { supabase } from "@/integrations/supabase/client";
import { ContextProviderDefinition } from "../schemas";

export const ContextProviderRegistry: Record<string, ContextProviderDefinition> = {
  // 1. Dados da Empresa
  company: {
    slug: "company",
    name: "Dados da Empresa",
    description: "Informações cadastrais e segmento da empresa.",
    resolve: async ({ company_id }) => {
      if (!company_id) return {};
      const { data } = await (supabase as any)
        .from("companies")
        .select("id, name, cnpj, segment")
        .eq("id", company_id)
        .maybeSingle();
      return data || { id: company_id, name: "Empresa Qualify" };
    },
  },

  // 2. Manual de Marca
  brand_manual: {
    slug: "brand_manual",
    name: "Manual de Marca",
    description: "Diretrizes de identidade, tom de voz, personas e pilares.",
    resolve: async ({ company_id }) => {
      if (!company_id) return {};
      try {
        const { data: workspaces } = await (supabase as any)
          .from("sprint_os_workspaces")
          .select("id, name, data, updated_at")
          .eq("company_id", company_id)
          .is("archived_at", null)
          .order("updated_at", { ascending: false });

        if (Array.isArray(workspaces)) {
          for (const ws of workspaces) {
            const bm = ws?.data?.brandManual;
            if (bm) {
              const activeFields = (bm.fields || []).filter((f: any) => !f.archived && !f.removed);
              const answered = activeFields.filter((f: any) => {
                const text = (f.response || f.value || "").trim();
                return text.length > 5;
              });

              if (answered.length > 0 || bm.overallStatus === "completed" || bm.masterPrompt) {
                const formattedAnswers = answered
                  .map((f: any) => `• ${f.label || f.question || "Item"}: ${(f.response || f.value || "").trim()}`)
                  .join("\n");

                return {
                  ...bm,
                  workspace_name: ws.name,
                  tone_of_voice: bm.toneOfVoice || bm.archetype || "Autoridade, clareza e ritmo dinâmico",
                  summary_text: formattedAnswers,
                  answered_count: answered.length,
                };
              }
            }
          }
        }
      } catch (err) {
        console.warn("[contextRegistry] Erro ao resolver brand_manual:", err);
      }
      return {
        tone_of_voice: "Profissional, direto, pragmático e sem enrolação",
        guidelines: "Priorizar clareza, especificidade numérica e quebra de clichês.",
      };
    },
  },

  // 3. Conta do Instagram
  instagram_account: {
    slug: "instagram_account",
    name: "Conta do Instagram",
    description: "Identificador, @username e status da conta vinculada.",
    resolve: async ({ account_id }) => {
      if (!account_id) return {};
      try {
        const { data: acc } = await (supabase as any)
          .from("criafy_instagram_accounts")
          .select("id, username, name, profile_picture_url")
          .eq("id", account_id)
          .maybeSingle();
        return acc || {};
      } catch {
        return {};
      }
    },
  },

  // 4. Estratégia da Conta
  account_strategy: {
    slug: "account_strategy",
    name: "Estratégia Editorial da Conta",
    description: "Briefing permanente, público-alvo, vocabulário proibido e CTAs preferidos.",
    resolve: async ({ account_id }) => {
      if (!account_id) return {};
      try {
        const { data: briefing } = await (supabase as any)
          .from("criafy_account_briefings")
          .select("*")
          .eq("account_id", account_id)
          .maybeSingle();

        if (briefing) {
          return {
            brand_name: briefing.brand_name,
            objective: briefing.objective,
            target_audience: briefing.target_audience,
            brand_positioning: briefing.brand_positioning,
            tone_of_voice: briefing.tone_of_voice,
            allowed_topics: briefing.allowed_topics,
            forbidden_topics: briefing.forbidden_topics,
            preferred_vocabulary: briefing.preferred_vocabulary,
            forbidden_vocabulary: briefing.forbidden_vocabulary,
            preferred_ctas: briefing.preferred_ctas,
          };
        }
      } catch {
        // Fallback
      }
      return {
        objective: "Crescimento de autoridade e conversão qualificada",
        target_audience: "Empreendedores e tomadores de decisão",
      };
    },
  },

  // 5. Histórico de Conteúdo
  content_history: {
    slug: "content_history",
    name: "Histórico de Conteúdo",
    description: "Últimas publicações e performance de engajamento.",
    resolve: async ({ company_id, account_id }) => {
      try {
        let query = (supabase as any)
          .from("criafy_publications")
          .select("id, title, status, format, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        if (account_id) query = query.eq("account_id", account_id);
        else if (company_id) query = query.eq("company_id", company_id);

        const { data } = await query;
        return { recent_publications: data || [] };
      } catch {
        return { recent_publications: [] };
      }
    },
  },

  // 6. Campanha Ativa
  campaign: {
    slug: "campaign",
    name: "Campanha Ativa",
    description: "Briefing de campanhas ativas no momento.",
    resolve: async ({ campaign_id }) => {
      if (!campaign_id) return {};
      return { campaign_id };
    },
  },

  // 7. Lead do CRM
  crm_lead: {
    slug: "crm_lead",
    name: "Lead do CRM",
    description: "Dados cadastrais, qualificação e histórico do lead.",
    resolve: async ({ lead_id, company_id }) => {
      if (!lead_id) return {};
      try {
        const { data } = await (supabase as any)
          .from("leads")
          .select("id, name, phone, email, status, qualification_score, tags")
          .eq("id", lead_id)
          .eq("company_id", company_id)
          .maybeSingle();
        return data || {};
      } catch {
        return {};
      }
    },
  },

  // 8. Histórico Comercial
  sales_history: {
    slug: "sales_history",
    name: "Histórico Comercial",
    description: "Negociações e histórico de faturamento.",
    resolve: async ({ company_id, lead_id }) => {
      return { total_deals: 0, notes: [] };
    },
  },

  // 9. Usuário Operador
  user: {
    slug: "user",
    name: "Usuário Operador",
    description: "Informações sobre o operador que iniciou a ação.",
    resolve: async ({ user_id }) => {
      if (!user_id) return {};
      return { user_id };
    },
  },
};

/**
 * Resolve apenas os providers solicitados pelo Agente/Workflow.
 */
export async function resolveContextForAgent(
  providerSlugs: string[],
  params: {
    company_id: string;
    account_id?: string;
    user_id?: string;
    lead_id?: string;
    campaign_id?: string;
  }
): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  for (const slug of providerSlugs) {
    const provider = ContextProviderRegistry[slug];
    if (provider) {
      try {
        result[slug] = await provider.resolve(params);
      } catch (err: any) {
        result[slug] = { error: err?.message || "Failed to resolve context" };
      }
    }
  }

  return result;
}
