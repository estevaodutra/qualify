import { describe, it, expect, vi } from "vitest";
import {
  QualifyAI,
  scoreHookTool,
  beatSheetTool,
  RBACEngine,
  SecurityError,
  ToolRegistry,
  AgentRegistry,
  WorkflowRegistry,
  buildStrategicReelGraph,
  createLangChainToolsForAgent,
  calculateSingleHookScore,
  generateReelBeatSheet,
} from "@/ai";

describe("Central Agêntica da Qualify (OpenAI + LangChain + LangGraph)", () => {
  // 1. TOOL: ai.score_hook
  describe("ai.score_hook (Hook Score Engine)", () => {
    it("deve pontuar um hook com números e contraste como EXCELLENT ou GOOD", async () => {
      const result = await scoreHookTool.handler(
        {
          hooks: [
            "R$ 18.000 foi o que esse erro me custou.",
            "Olá pessoal, bem-vindo ao meu canal hoje vou falar de finanças.",
          ],
        },
        { company_id: "test-company" }
      );

      expect(result.items.length).toBe(2);
      expect(result.winner).toBeDefined();
      expect(result.winner.hook).toContain("R$ 18.000");
      expect(result.winner.score).toBeGreaterThan(60);
      expect(result.winner.checks.length).toBeGreaterThan(0);
      expect(result.winner.estimated_seconds).toBeLessThanOrEqual(3.5);

      // Segundo hook contém clichê detectado
      const clichyHook = result.items[1];
      expect(clichyHook.flags).toContain("CLICHE_DETECTED");
      expect(clichyHook.score).toBeLessThan(result.winner.score);
    });

    it("deve sinalizar HOOK_TOO_LONG para ganchos falados acima de 3.5 segundos", () => {
      const longHook =
        "Hoje eu vou explicar detalhadamente tudo o que você precisa saber sobre o mercado financeiro e investimentos de longo prazo em 2026.";
      const score = calculateSingleHookScore(longHook);
      expect(score.flags).toContain("HOOK_TOO_LONG");
      expect(score.estimated_seconds).toBeGreaterThan(3.5);
    });
  });

  // 2. TOOL: ai.generate_beat_sheet
  describe("ai.generate_beat_sheet (Beat Sheet Engine)", () => {
    it("deve calcular o tempo de fala a ~165 WPM e separar por blocos lógicos", async () => {
      const script = `R$ 18.000 foi o que esse erro me custou.
Todo empresário comete esse deslize nos primeiros meses.
Mas existe uma regra simples para proteger seu caixa.
Comente ESCALA para receber o checklist.`;

      const result = await beatSheetTool.handler(
        { script, target_duration: 30, wpm: 165 },
        { company_id: "test-company" }
      );

      expect(result.total_words).toBeGreaterThan(20);
      expect(result.total_seconds).toBeGreaterThan(5);
      expect(result.beats.length).toBe(4);
      expect(result.beats[0].type).toBe("HOOK");
      expect(result.beats[result.beats.length - 1].type).toBe("LOOP");
      expect(result.hook_valid).toBe(true);
    });
  });

  // 3. RBAC & TENANCY
  describe("RBAC & Multi-Tenancy Protection", () => {
    it("InstagramAgent não deve ter permissão para chamar ferramentas não autorizadas", () => {
      const igAgent = AgentRegistry["InstagramAgent"];
      expect(igAgent).toBeDefined();

      // InstagramAgent PODE usar ai.score_hook
      expect(() =>
        RBACEngine.validateAgentCanUseTool(igAgent, "ai.score_hook")
      ).not.toThrow();

      // InstagramAgent NÃO PODE usar billing.refund ou crm.delete_lead
      expect(() =>
        RBACEngine.validateAgentCanUseTool(igAgent, "billing.refund")
      ).toThrow(SecurityError);

      expect(() =>
        RBACEngine.validateAgentCanUseTool(igAgent, "crm.delete_lead")
      ).toThrow(SecurityError);
    });

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

  // 4. REGISTROS
  describe("Registros Globais (Tools, Agents, Workflows, Skills)", () => {
    it("deve ter todas as tools requeridas registradas", () => {
      const required = [
        "ai.score_hook",
        "ai.generate_beat_sheet",
        "company.get_brand_manual",
        "criafy.save_content",
        "criafy.create_demand",
        "instagram.get_metrics",
        "crm.get_lead",
        "crm.move_lead",
        "crm.create_note",
      ];
      required.forEach((tool) => {
        expect(ToolRegistry[tool]).toBeDefined();
      });
    });

    it("deve converter tools para LangChain DynamicStructuredTools nativos", () => {
      const igAgent = AgentRegistry["InstagramAgent"];
      const lcTools = createLangChainToolsForAgent(igAgent, {
        company_id: "empresa-123",
      });
      expect(lcTools.length).toBe(igAgent.tools.length);
      expect(lcTools[0].name).toBeDefined();
    });

    it("deve ter o workflow create_strategic_reel registrado", () => {
      const wf = WorkflowRegistry["create_strategic_reel"];
      expect(wf).toBeDefined();
      expect(wf.version).toBe(1);
      expect(wf.loop_guards.max_retries).toBe(3);
    });
  });

  // 5. WORKFLOW LANGGRAPH: create_strategic_reel
  describe("LangGraph StateGraph Workflow (create_strategic_reel)", () => {
    it("deve executar o StateGraph do início ao fim com conditional edges e checkpoints", async () => {
      const graph = buildStrategicReelGraph();

      const initialState = {
        company_id: "empresa-test-langgraph",
        user_id: "user-123",
        account_id: "account-456",
        run_id: "test-run-123",
        idea: "Como prospectar clientes B2B qualificados",
        objective: "Autoridade e agendamento de reuniões",
      };

      const result = await graph.invoke(initialState, {
        configurable: { thread_id: "thread-test-123" },
      });

      // Validação de nós executados
      expect(result.hooks.length).toBe(3);
      expect(result.hook_scores.length).toBe(3);
      expect(result.selected_hook).toBeDefined();
      expect(result.script).toContain(result.selected_hook.hook);
      expect(result.beat_sheet).toBeDefined();
      expect(result.beat_sheet.beats.length).toBeGreaterThan(0);
      expect(result.validation.is_valid).toBe(true);
      expect(result.content_id).toBeDefined();

      // Verificar histórico de passos no State
      const steps = result.step_trace.map((s: any) => s.step);
      expect(steps).toContain("load_context");
      expect(steps).toContain("generate_hooks");
      expect(steps).toContain("score_hooks");
      expect(steps).toContain("select_hook");
      expect(steps).toContain("write_script");
      expect(steps).toContain("generate_beat_sheet");
      expect(steps).toContain("validate");
      expect(steps).toContain("save_content");
    });
  });

  // 6. QUALIFY AI ENTRYPOINT
  describe("QualifyAI Entrypoint", () => {
    it("deve executar createStrategicReel via entrypoint central e registrar trace", async () => {
      const response = await QualifyAI.createStrategicReel({
        company_id: "tenant-empresa-alpha",
        idea: "Automação de processos financeiros",
        objective: "Gerar leads qualificados",
      });

      expect(response.success).toBe(true);
      expect(response.data.title).toBe("Automação de processos financeiros");
      expect(response.data.selected_hook).toBeDefined();
      expect(response.data.script.length).toBeGreaterThan(20);
      expect(response.data.beat_sheet).toBeDefined();
      expect(response.trace).toBeDefined();
      expect(response.trace.company_id).toBe("tenant-empresa-alpha");
      expect(response.trace.workflow).toBe("create_strategic_reel");
      expect(response.trace.status).toBe("success");
    });

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
