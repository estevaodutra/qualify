import { describe, it, expect, vi } from "vitest";
import {
  QualifyAI,
  RBACEngine,
  SecurityError,
  AgentRegistry,
  ToolRegistry,
  WorkflowRegistry,
  PREPARED_AGENTS,
  PREPARED_SKILLS,
  ALL_TOOLS,
  registerAgent,
  registerTool,
  registerWorkflow,
  createLangChainToolsForAgent,
} from "@/ai";
import { z } from "zod";

describe("Central Agêntica da Qualify (OpenAI + LangChain + LangGraph)", () => {
  // 1. HOOK SCORE ENGINE
  describe("ai.score_hook (Hook Score Engine)", () => {
    it("deve pontuar um hook com números e contraste como EXCELLENT ou GOOD", async () => {
      const hooks = [
        "R$ 15.000 foi o que ignorar Reels custou para essa empresa.",
        "Como crescer no Instagram.",
      ];

      const { calculateSingleHookScore } = await import("@/ai/tools/ai/scoreHookTool");
      const scores = hooks.map(calculateSingleHookScore);

      expect(scores[0].score).toBeGreaterThan(scores[1].score);
      expect(["EXCELLENT", "GOOD"]).toContain(scores[0].verdict);
    });

    it("deve sinalizar HOOK_TOO_LONG para ganchos falados acima de 3.5 segundos", async () => {
      const longHook =
        "Neste vídeo eu vou te mostrar exatamente o passo a passo completo de como estruturar uma estratégia completa de funil de vendas dentro do Instagram para atrair leads todos os dias sem parar.";

      const { calculateSingleHookScore } = await import("@/ai/tools/ai/scoreHookTool");
      const result = calculateSingleHookScore(longHook);

      expect(result.estimated_seconds).toBeGreaterThan(3.5);
      expect(result.flags).toContain("HOOK_TOO_LONG");
    });
  });

  // 2. BEAT SHEET ENGINE
  describe("ai.generate_beat_sheet (Beat Sheet Engine)", () => {
    it("deve calcular o tempo de fala a ~165 WPM e separar por blocos lógicos", async () => {
      const script = `
        Gancho: Pare de perder vendas.
        Desenvolvimento: O segredo está no posicionamento claro e qualificação automática dos leads. Se você não tem filtro, seu time perde tempo com curiosos.
        CTA: Comente ESCALA para receber o diagnóstico gratuito.
      `;

      const { generateReelBeatSheet } = await import("@/ai/tools/ai/beatSheetTool");
      const result = generateReelBeatSheet(script, 30, 165);

      expect(result.beats.length).toBeGreaterThanOrEqual(3);
      expect(result.beats[0].type).toBe("HOOK");
      expect(result.beats[result.beats.length - 1].type).toBe("LOOP");
      expect(result.hook_valid).toBe(true);
    });
  });

  // 3. RBAC & TENANCY
  describe("RBAC & Multi-Tenancy Protection", () => {
    it("deve rejeitar chamadas sem company_id no contexto", () => {
      expect(() =>
        RBACEngine.validateTenantIsolation(undefined)
      ).toThrow(SecurityError);
    });

    it("deve detectar e barrar violação cross-tenant", () => {
      expect(() =>
        RBACEngine.validateTenantIsolation("empresa-a", "empresa-b")
      ).toThrow(SecurityError);
    });
  });

  // 4. MARCO ZERO DA CENTRAL DE IA (Catálogo Limpo)
  describe("Marco Zero da Central de IA (Ambiente Limpo)", () => {
    it("deve iniciar com o catálogo pré-configurado zerado para reconstrução individual", () => {
      expect(PREPARED_AGENTS.length).toBe(0);
      expect(PREPARED_SKILLS.length).toBe(0);
      expect(ALL_TOOLS.length).toBe(0);
      expect(Object.keys(WorkflowRegistry).length).toBe(0);
    });

    it("deve permitir registrar e validar permissões de novos agentes dinamicamente", () => {
      const testTool = {
        name: "test.sample_action",
        description: "Ferramenta de teste",
        type: "read_only" as const,
        permission: "test.read",
        input_schema: z.object({ query: z.string() }),
        handler: async () => ({ ok: true }),
      };
      registerTool(testTool);
      expect(ToolRegistry["test.sample_action"]).toBeDefined();

      const testAgent = {
        slug: "TestAuditAgent",
        name: "Agente de Teste",
        description: "Agente de teste unitário",
        status: "active" as const,
        version: 1,
        model_profile: "CONTENT_STANDARD",
        skills: [],
        tools: ["test.sample_action"],
        context_providers: [],
        permissions: ["test.read"],
        system_prompt: "Você é um agente de teste.",
      };
      registerAgent(testAgent);
      expect(AgentRegistry["TestAuditAgent"]).toBeDefined();

      // Pode usar a tool registrada
      expect(() =>
        RBACEngine.validateAgentCanUseTool(testAgent, "test.sample_action")
      ).not.toThrow();

      // Não pode usar tool não autorizada
      expect(() =>
        RBACEngine.validateAgentCanUseTool(testAgent, "billing.refund")
      ).toThrow(SecurityError);

      // Converte para LangChain DynamicStructuredTool
      const lcTools = createLangChainToolsForAgent(testAgent, { company_id: "test-corp" });
      expect(lcTools.length).toBe(1);
      expect(lcTools[0].name).toBe("test_sample_action");
    });
  });

  // 5. QUALIFY AI ENTRYPOINT
  describe("QualifyAI Entrypoint", () => {
    it("deve rejeitar execução quando company_id não for informado", async () => {
      await expect(
        QualifyAI.createStrategicReel({
          company_id: "",
          idea: "Qualquer ideia",
        })
      ).rejects.toThrow();
    });
  });
});
