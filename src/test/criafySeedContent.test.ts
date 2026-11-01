import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CriafySeedContentService,
  SEED_CAMPAIGN_NAME,
} from "@/services/criafy/criafySeedContentService";
import { CriafyPlannerItem, CriafyDemand } from "@/types/criafy";

// Mock do supabase client
vi.mock("@/integrations/supabase/client", () => {
  // Simulação de banco em memória para o teste
  const db: {
    activations: any[];
    plannerItems: any[];
    demands: any[];
    accounts: any[];
    workspaces: any[];
    briefings: any[];
  } = {
    activations: [],
    plannerItems: [],
    demands: [],
    accounts: [
      { id: "account-alpha", username: "marca_alpha", name: "Marca Alpha" },
      { id: "account-beta", username: "marca_beta", name: "Marca Beta" },
    ],
    workspaces: [
      {
        company_id: "company-1",
        data: {
          brandManual: {
            brandName: "Marca Alpha",
            positioning: "Referência em Qualificação",
            toneOfVoice: "Autoritário e Direto",
          },
        },
      },
    ],
    briefings: [],
  };

  const createQueryBuilder = (tableName: string) => {
    let currentData = db[tableName as keyof typeof db] || [];
    let filterField: string | null = null;
    let filterVal: any = null;

    const builder: any = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation((rows: any | any[]) => {
        const toInsert = Array.isArray(rows) ? rows : [rows];
        const inserted = toInsert.map((r) => ({
          id: r.id || `mock_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...r,
        }));
        (db[tableName as keyof typeof db] as any[]).push(...inserted);
        return {
          select: vi.fn().mockImplementation(() => ({
            single: vi.fn().mockResolvedValue({ data: inserted[0], error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: inserted[0], error: null }),
            data: Array.isArray(rows) ? inserted : inserted[0],
            error: null,
          })),
          data: Array.isArray(rows) ? inserted : inserted[0],
          error: null,
        };
      }),
      update: vi.fn().mockImplementation((updates: any) => {
        return {
          eq: vi.fn().mockImplementation((field: string, val: any) => {
            const found = (db[tableName as keyof typeof db] as any[]).find((r) => r[field] === val);
            if (found) {
              Object.assign(found, updates);
            }
            return {
              select: vi.fn().mockImplementation(() => ({
                single: vi.fn().mockResolvedValue({ data: found, error: null }),
                maybeSingle: vi.fn().mockResolvedValue({ data: found, error: null }),
              })),
              data: found,
              error: null,
            };
          }),
        };
      }),
      eq: vi.fn().mockImplementation((field: string, val: any) => {
        builder._filtered = (builder._filtered || (db[tableName as keyof typeof db] as any[])).filter(
          (r) => r[field] === val
        );
        return builder;
      }),
      in: vi.fn().mockImplementation((field: string, vals: any[]) => {
        builder._filtered = (builder._filtered || (db[tableName as keyof typeof db] as any[])).filter(
          (r) => vals.includes(r[field])
        );
        return builder;
      }),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockImplementation(async () => {
        const rows = builder._filtered !== undefined ? builder._filtered : db[tableName as keyof typeof db];
        return { data: rows[0] || null, error: null };
      }),
      single: vi.fn().mockImplementation(async () => {
        const rows = builder._filtered !== undefined ? builder._filtered : db[tableName as keyof typeof db];
        return { data: rows[0] || null, error: null };
      }),
      then: (resolve: any) => {
        const rows = builder._filtered !== undefined ? builder._filtered : db[tableName as keyof typeof db];
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };
    return builder;
  };

  return {
    supabase: {
      from: vi.fn((tableName: string) => {
        if (tableName === "criafy_account_activations") return createQueryBuilder("activations");
        if (tableName === "criafy_planner_items") return createQueryBuilder("plannerItems");
        if (tableName === "criafy_demands") return createQueryBuilder("demands");
        if (tableName === "criafy_instagram_accounts") return createQueryBuilder("accounts");
        if (tableName === "sprint_os_workspaces") return createQueryBuilder("workspaces");
        if (tableName === "criafy_account_briefings") return createQueryBuilder("briefings");
        return createQueryBuilder(tableName);
      }),
    },
    __mockDb: db,
  };
});

describe("CriafySeedContentService — Marco Zero da Conta", () => {
  const companyId = "company-1";
  const accountIdAlpha = "account-alpha";
  const accountIdBeta = "account-beta";

  it("1. checkPrerequisites deve aprovar conta com Brand Manual preenchido", async () => {
    const prereqs = await CriafySeedContentService.checkPrerequisites(companyId, accountIdAlpha);
    expect(prereqs.hasAccount).toBe(true);
    expect(prereqs.hasBrandManual).toBe(true);
    expect(prereqs.canStart).toBe(true);
    expect(prereqs.missingReasons.length).toBe(0);
  });

  it("2. checkPrerequisites deve recusar se a empresa não tiver Manual da Marca preenchido", async () => {
    const prereqs = await CriafySeedContentService.checkPrerequisites("company-sem-manual", null);
    expect(prereqs.canStart).toBe(false);
    expect(prereqs.hasBrandManual).toBe(false);
    expect(prereqs.missingReasons.length).toBeGreaterThan(0);
  });

  it("3. startSeedContent deve criar exatamente 5 Planner Items e demandas úteis", async () => {
    const result = await CriafySeedContentService.startSeedContent(
      companyId,
      accountIdAlpha,
      "user-test"
    );

    expect(result.activation).toBeDefined();
    expect(result.activation.seed_status).toBe("generated");
    expect(result.items.length).toBe(5);

    // Validação dos formatos e temas conforme regra #6
    const reel = result.items.find((i) => i.format === "REEL");
    expect(reel).toBeDefined();
    expect(reel?.theme).toBe("Reel Semente — Método");
    expect(reel?.pillar).toBe("Método");
    expect(reel?.campaign).toBe(SEED_CAMPAIGN_NAME);
    expect(reel?.status).toBe("pauta");

    const story = result.items.find((i) => i.format === "STORY");
    expect(story).toBeDefined();
    expect(story?.theme).toBe("Destaque Semente — Posicionamento e Método");

    const posts = result.items.filter((i) => i.format === "POST");
    expect(posts.length).toBe(3);

    // Validação de demandas vinculadas (Regra #7)
    expect(result.demands.length).toBe(5);
    const videoDemand = result.demands.find((d) => d.type === "gravar_video");
    expect(videoDemand).toBeDefined();
    expect(videoDemand?.planner_item_id).toBe(reel?.id);

    const reviewDemand = result.demands.find((d) => d.type === "revisar_copy");
    expect(reviewDemand).toBeDefined();
  });

  it("4. startSeedContent deve ser estritamente IDEMPOTENTE (clicar novamente não duplica)", async () => {
    const secondCall = await CriafySeedContentService.startSeedContent(
      companyId,
      accountIdAlpha,
      "user-test"
    );

    // Continua sendo 5 itens
    expect(secondCall.items.length).toBe(5);
  });

  it("5. calculateProgress deve rastrear progresso de 0/5 até 5/5 e atualizar status", async () => {
    // Inicialmente todos em pauta
    let progress = await CriafySeedContentService.calculateProgress(companyId, accountIdAlpha);
    expect(progress.total).toBe(5);
    expect(progress.completed).toBe(0);
    expect(progress.pauta).toBe(5);
    expect(progress.status).toBe("generated");

    // Simula 1 item em produção
    progress.items[0].status = "roteirizado";
    let status = await CriafySeedContentService.syncActivationStatus(companyId, accountIdAlpha);
    expect(status).toBe("in_production");

    // Simula todos os 5 itens finalizados (pronto, agendado, publicado)
    progress.items.forEach((item) => {
      item.status = "publicado";
    });

    const isComplete = await CriafySeedContentService.isSeedContentComplete(companyId, accountIdAlpha);
    expect(isComplete).toBe(true);

    const finalStatus = await CriafySeedContentService.syncActivationStatus(companyId, accountIdAlpha);
    expect(finalStatus).toBe("completed");
  });

  it("6. Múltiplas contas devem ter estados totalmente independentes (Regra #15)", async () => {
    // @account-alpha está completed
    const actAlpha = await CriafySeedContentService.getActivation(accountIdAlpha);
    expect(actAlpha?.seed_status).toBe("completed");

    // @account-beta não foi iniciada ainda
    const actBeta = await CriafySeedContentService.getActivation(accountIdBeta);
    expect(actBeta).toBeNull();

    const progressBeta = await CriafySeedContentService.calculateProgress(companyId, accountIdBeta);
    expect(progressBeta.status).toBe("not_started");
    expect(progressBeta.items.length).toBe(0);
  });
});
