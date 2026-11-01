import { supabase } from "@/integrations/supabase/client";
import {
  CriafyAccountActivation,
  CriafyPlannerItem,
  CriafyDemand,
  CriafySeedProgress,
  CriafySeedPrerequisites,
  CriafySeedStatus,
} from "@/types/criafy";

export const SEED_CAMPAIGN_NAME = "Conteúdo Semente";

/**
 * Determina se uma estrutura de Brand Manual possui respostas preenchidas.
 * Suporta a estrutura real do Sprint OS (fields com f.response, overallStatus, etc.).
 */
export function isBrandManualPopulated(bm: any): boolean {
  if (!bm) return false;
  if (bm.overallStatus === "completed" || bm.overallStatus === "approved") return true;
  if (typeof bm.masterPrompt === "string" && bm.masterPrompt.trim().length > 20) return true;
  if (Array.isArray(bm.copyAds) && bm.copyAds.length > 0) return true;

  if (Array.isArray(bm.fields)) {
    const answered = bm.fields.filter((f: any) => {
      const resp = f?.response || f?.value || f?.answer || f?.transcription || "";
      return typeof resp === "string" && resp.trim().length > 0;
    });
    if (answered.length > 0) return true;
  }

  if (bm.brandName || bm.positioning || bm.toneOfVoice || (Array.isArray(bm.pillars) && bm.pillars.length > 0)) {
    return true;
  }

  return false;
}

export const CriafySeedContentService = {
  /**
   * 1. Consulta o estado de ativação da conta.
   */
  async getActivation(accountId: string): Promise<CriafyAccountActivation | null> {
    if (!accountId || accountId === "all") return null;

    try {
      const { data, error } = await (supabase as any)
        .from("criafy_account_activations")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.warn("[SeedService] Aviso ao buscar ativação:", error.message);
      }

      return data || null;
    } catch (err) {
      console.warn("[SeedService] Erro ao buscar ativação:", err);
      return null;
    }
  },

  /**
   * 2. Valida pré-requisitos estratégicos antes de permitir o início.
   * - Conta selecionada
   * - Manual da Marca / Briefing preenchido
   */
  async checkPrerequisites(companyId: string, accountId: string): Promise<CriafySeedPrerequisites> {
    const missingReasons: string[] = [];

    if (!accountId || accountId === "all") {
      missingReasons.push("Nenhuma conta do Instagram selecionada.");
      return {
        hasAccount: false,
        hasBrandManual: false,
        hasStrategy: false,
        canStart: false,
        missingReasons,
      };
    }

    // Verificar se a conta existe
    let hasAccount = false;
    try {
      const { data: acc } = await (supabase as any)
        .from("criafy_instagram_accounts")
        .select("id, name, username")
        .eq("id", accountId)
        .maybeSingle();
      hasAccount = Boolean(acc);
    } catch {
      hasAccount = false;
    }

    if (!hasAccount) {
      missingReasons.push("Conta do Instagram não encontrada.");
    }

    // Verificar Manual da Marca (Sprint OS Workspace ou Briefing Permanente)
    let hasBrandManual = false;
    let hasStrategy = false;

    try {
      // 1. Verificar Workspaces do Sprint OS (procura em todos os workspaces da empresa)
      const { data: workspaces } = await (supabase as any)
        .from("sprint_os_workspaces")
        .select("id, name, data, updated_at")
        .eq("company_id", companyId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false });

      if (Array.isArray(workspaces)) {
        for (const ws of workspaces) {
          const bm = ws?.data?.brandManual;
          if (isBrandManualPopulated(bm)) {
            hasBrandManual = true;
            break;
          }
        }
      }

      // Fallback para cache local no browser
      if (!hasBrandManual && typeof localStorage !== "undefined") {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(`sprint_os_ws_${companyId}`) || key.startsWith("sprint_os_ws_"))) {
              const item = JSON.parse(localStorage.getItem(key) || "{}");
              if (isBrandManualPopulated(item?.brandManual)) {
                hasBrandManual = true;
                break;
              }
            }
          }
        } catch {}
      }

      // 2. Verificar Briefing da Conta
      const { data: briefing } = await (supabase as any)
        .from("criafy_account_briefings")
        .select("id, brand_name, objective, brand_positioning, tone_of_voice")
        .eq("account_id", accountId)
        .maybeSingle();

      if (briefing && (briefing.brand_name || briefing.brand_positioning || briefing.tone_of_voice)) {
        hasStrategy = true;
        hasBrandManual = true;
      }
    } catch (err) {
      console.warn("[SeedService] Erro ao checar manual de marca:", err);
    }

    if (!hasBrandManual && !hasStrategy) {
      missingReasons.push(
        "Complete as informações estratégicas do Manual da Marca antes de gerar o Conteúdo Semente."
      );
    }

    const canStart = hasAccount && (hasBrandManual || hasStrategy);

    return {
      hasAccount,
      hasBrandManual,
      hasStrategy,
      canStart,
      missingReasons,
    };
  },

  /**
   * 3. Busca itens existentes do Planner vinculados ao Conteúdo Semente da conta.
   */
  async getSeedPlannerItems(companyId: string, accountId: string): Promise<CriafyPlannerItem[]> {
    if (!accountId || accountId === "all") return [];

    try {
      const { data, error } = await (supabase as any)
        .from("criafy_planner_items")
        .select("*")
        .eq("company_id", companyId)
        .eq("account_id", accountId)
        .eq("campaign", SEED_CAMPAIGN_NAME)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[SeedService] Erro ao listar itens semente:", error.message);
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  },

  /**
   * 4. Inicia o Conteúdo Semente com IDEMPOTÊNCIA rigorosa.
   * Cria registro de ativação, os 5 Planner Items e as Demandas vinculadas.
   */
  async startSeedContent(
    companyId: string,
    accountId: string,
    userId?: string
  ): Promise<{
    activation: CriafyAccountActivation;
    items: CriafyPlannerItem[];
    demands: CriafyDemand[];
  }> {
    if (!companyId || !accountId || accountId === "all") {
      throw new Error("company_id e account_id são obrigatórios para iniciar o Conteúdo Semente.");
    }

    // A. Verificar itens existentes da campanha (Idempotência - Regra #16)
    const existingItems = await this.getSeedPlannerItems(companyId, accountId);

    // B. Buscar ou criar registro de ativação
    let activation = await this.getActivation(accountId);
    const nowIso = new Date().toISOString();

    if (!activation) {
      const { data: newAct, error: actError } = await (supabase as any)
        .from("criafy_account_activations")
        .insert({
          company_id: companyId,
          account_id: accountId,
          seed_status: existingItems.length >= 5 ? "generated" : "started",
          seed_started_at: nowIso,
          created_by: userId || null,
        })
        .select("*")
        .single();

      if (actError) {
        // Se der conflito unique, recupera o existente
        activation = await this.getActivation(accountId);
      } else {
        activation = newAct;
      }
    } else if (activation.seed_status === "not_started") {
      const { data: updAct } = await (supabase as any)
        .from("criafy_account_activations")
        .update({
          seed_status: existingItems.length >= 5 ? "generated" : "started",
          seed_started_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", activation.id)
        .select("*")
        .single();

      if (updAct) activation = updAct;
    }

    // C. Se os 5 itens já existem, não duplicar (Regra #16)
    if (existingItems.length >= 5) {
      const existingDemands = await this.getSeedDemands(companyId, accountId);
      await this.syncActivationStatus(companyId, accountId);
      const updatedAct = (await this.getActivation(accountId)) || activation!;
      return {
        activation: updatedAct,
        items: existingItems,
        demands: existingDemands,
      };
    }

    // D. Criar exatamente os 5 itens no Planner (Regra #6)
    const createdItems = await this.createSeedPlannerItems(companyId, accountId, userId);

    // E. Criar as demandas necessárias vinculadas a planner_item_id (Regra #7)
    const createdDemands = await this.createSeedDemands(companyId, accountId, createdItems, userId);

    // F. Atualizar status para 'generated'
    if (activation) {
      const { data: updAct } = await (supabase as any)
        .from("criafy_account_activations")
        .update({
          seed_status: "generated",
          seed_generated_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", activation.id)
        .select("*")
        .single();

      if (updAct) activation = updAct;
    }

    return {
      activation: activation!,
      items: createdItems,
      demands: createdDemands,
    };
  },

  /**
   * 5. Cria exatamente os 5 itens do Planner especificados na regra #6.
   */
  async createSeedPlannerItems(
    companyId: string,
    accountId: string,
    userId?: string
  ): Promise<CriafyPlannerItem[]> {
    const seedTemplates = [
      // 1. Reel
      {
        company_id: companyId,
        account_id: accountId,
        format: "REEL" as const,
        theme: "Reel Semente — Método",
        objective: "autoridade",
        pillar: "Método",
        angle: "Apresentação do mecanismo e método único da marca para retenção inicial.",
        priority: "alta" as const,
        status: "pauta" as const,
        campaign: SEED_CAMPAIGN_NAME,
        created_by: userId || null,
      },
      // 2. Destaque (Story)
      {
        company_id: companyId,
        account_id: accountId,
        format: "STORY" as const,
        theme: "Destaque Semente — Posicionamento e Método",
        objective: "autoridade",
        pillar: "Posicionamento",
        angle: "Sequência estruturada de stories para fixar no destaque principal do perfil.",
        priority: "alta" as const,
        status: "pauta" as const,
        campaign: SEED_CAMPAIGN_NAME,
        created_by: userId || null,
      },
      // 3. Post 01
      {
        company_id: companyId,
        account_id: accountId,
        format: "POST" as const,
        theme: "Post Semente 01 — Posicionamento",
        objective: "autoridade",
        pillar: "Posicionamento",
        angle: "Manifesto inicial da marca e tese central de diferenciação.",
        priority: "alta" as const,
        status: "pauta" as const,
        campaign: SEED_CAMPAIGN_NAME,
        created_by: userId || null,
      },
      // 4. Post 02
      {
        company_id: companyId,
        account_id: accountId,
        format: "POST" as const,
        theme: "Post Semente 02 — Problema / Visão",
        objective: "identificacao",
        pillar: "Visão",
        angle: "Diagnóstico da dor principal do público e a visão contrária ao mercado comum.",
        priority: "alta" as const,
        status: "pauta" as const,
        campaign: SEED_CAMPAIGN_NAME,
        created_by: userId || null,
      },
      // 5. Post 03
      {
        company_id: companyId,
        account_id: accountId,
        format: "POST" as const,
        theme: "Post Semente 03 — Método / Solução",
        objective: "educacao",
        pillar: "Método",
        angle: "Passo a passo prático do método para gerar valor e salvar no feed.",
        priority: "alta" as const,
        status: "pauta" as const,
        campaign: SEED_CAMPAIGN_NAME,
        created_by: userId || null,
      },
    ];

    const { data, error } = await (supabase as any)
      .from("criafy_planner_items")
      .insert(seedTemplates)
      .select("*");

    if (error) {
      throw new Error(`Falha ao criar itens do Planner: ${error.message}`);
    }

    return data || [];
  },

  /**
   * 6. Cria as demandas vinculadas aos Planner Items criados (Regra #7).
   */
  async createSeedDemands(
    companyId: string,
    accountId: string,
    plannerItems: CriafyPlannerItem[],
    userId?: string
  ): Promise<CriafyDemand[]> {
    const demandsToCreate = plannerItems.map((item) => {
      let type: CriafyDemand["type"] = "aprovar_conteudo";
      let title = `Aprovar ${item.theme}`;
      let description = `Revisar e aprovar o conteúdo para a campanha ${SEED_CAMPAIGN_NAME}.`;

      if (item.format === "REEL") {
        type = "gravar_video";
        title = "Gravar Reel Semente — Método";
        description = "Gravação do primeiro Reel estratégico da conta apresentando o método central.";
      } else if (item.format === "STORY") {
        type = "revisar_copy";
        title = "Revisar Copy do Destaque Semente";
        description = "Revisar textos e roteiro da sequência de stories para o destaque principal.";
      }

      return {
        company_id: companyId,
        account_id: accountId,
        planner_item_id: item.id,
        title,
        description,
        type,
        priority: "alta" as const,
        status: "pending" as const,
        origin: "usuario" as const,
        created_by: userId || null,
      };
    });

    const { data, error } = await (supabase as any)
      .from("criafy_demands")
      .insert(demandsToCreate)
      .select("*");

    if (error) {
      console.warn("[SeedService] Aviso ao criar demandas:", error.message);
      return [];
    }

    return data || [];
  },

  /**
   * 7. Consulta demandas vinculadas ao Conteúdo Semente.
   */
  async getSeedDemands(companyId: string, accountId: string): Promise<CriafyDemand[]> {
    if (!accountId || accountId === "all") return [];

    try {
      const items = await this.getSeedPlannerItems(companyId, accountId);
      if (items.length === 0) return [];

      const itemIds = items.map((i) => i.id);
      const { data } = await (supabase as any)
        .from("criafy_demands")
        .select("*")
        .in("planner_item_id", itemIds);

      return data || [];
    } catch {
      return [];
    }
  },

  /**
   * 8. Calcula o progresso real (0/5 até 5/5) e estado atual (Regra #9 & #10).
   * Itens finalizados: status em 'pronto', 'agendado' ou 'publicado'.
   */
  async calculateProgress(companyId: string, accountId: string): Promise<CriafySeedProgress> {
    const activation = await this.getActivation(accountId);
    const items = await this.getSeedPlannerItems(companyId, accountId);

    const total = 5;
    const completedStatuses = ["pronto", "agendado", "publicado"];
    const inProductionStatuses = ["roteirizado", "aguardando_gravacao", "em_edicao"];

    const completed = items.filter((i) => completedStatuses.includes(i.status)).length;
    const inProduction = items.filter((i) => inProductionStatuses.includes(i.status)).length;
    const pauta = items.filter((i) => i.status === "pauta" || i.status === "ideia").length;

    let computedStatus: CriafySeedStatus = activation?.seed_status || "not_started";

    if (items.length === 0) {
      computedStatus = "not_started";
    } else if (completed === total) {
      computedStatus = "completed";
    } else if (inProduction > 0 || completed > 0) {
      computedStatus = "in_production";
    } else if (items.length >= total) {
      computedStatus = "generated";
    }

    const percentage = Math.round((completed / total) * 100);

    return {
      total,
      completed,
      inProduction,
      pauta,
      percentage,
      status: computedStatus,
      items,
    };
  },

  /**
   * 9. Verifica se o Conteúdo Semente está 100% completo (Regra #9).
   */
  async isSeedContentComplete(companyId: string, accountId: string): Promise<boolean> {
    const progress = await this.calculateProgress(companyId, accountId);
    return progress.completed === progress.total;
  },

  /**
   * 10. Sincroniza o estado de ativação no banco com base no progresso dos itens.
   */
  async syncActivationStatus(companyId: string, accountId: string): Promise<CriafySeedStatus> {
    const progress = await this.calculateProgress(companyId, accountId);
    const activation = await this.getActivation(accountId);
    const nowIso = new Date().toISOString();

    if (!activation) return progress.status;

    if (activation.seed_status !== progress.status) {
      const updates: Record<string, any> = {
        seed_status: progress.status,
        updated_at: nowIso,
      };

      if (progress.status === "completed" && !activation.seed_completed_at) {
        updates.seed_completed_at = nowIso;
      }

      await (supabase as any)
        .from("criafy_account_activations")
        .update(updates)
        .eq("id", activation.id);
    }

    return progress.status;
  },
};
