import { describe, it, expect } from "vitest";
import { getTool, getAgent, QUALIFY_ORCHESTRATOR_AGENT, criafyContentAgentDefinition } from "@/ai";

describe("Copiloto IA & Roteamento Agêntico do Instagram", () => {
  it("deve conter a tool instagram.get_metrics registrada e executável", async () => {
    const tool = getTool("instagram.get_metrics");
    expect(tool).toBeDefined();
    expect(tool?.name).toBe("instagram.get_metrics");
    expect(tool?.permission).toBe("instagram.read");

    const result = await tool?.handler({}, { company_id: "empresa-teste-123" });
    expect(result).toBeDefined();
    expect(result.planner_pipeline).toBeDefined();
    expect(result.benchmarks_industria).toBeDefined();
  });

  it("deve conter as ferramentas de Instagram atribuídas tanto ao Criafy Agent quanto ao Orquestrador", () => {
    // Orquestrador
    expect(QUALIFY_ORCHESTRATOR_AGENT.tools).toContain("instagram.get_metrics");
    expect(QUALIFY_ORCHESTRATOR_AGENT.tools).toContain("instagram.audit_profile");
    expect(QUALIFY_ORCHESTRATOR_AGENT.tools).toContain("ai.score_hook");

    // Agente Criafy
    expect(criafyContentAgentDefinition.tools).toContain("instagram.get_metrics");
    expect(criafyContentAgentDefinition.tools).toContain("instagram.audit_profile");
    expect(criafyContentAgentDefinition.tools).toContain("instagram.analyze_viral_swipes");
    expect(criafyContentAgentDefinition.tools).toContain("ai.detect_slop");
    expect(criafyContentAgentDefinition.tools).toContain("ai.humanize_text");
  });

  it("deve carregar as 13 skills com definições operacionais para o Agente Criafy", () => {
    expect(criafyContentAgentDefinition.skills.length).toBe(13);
    expect(criafyContentAgentDefinition.skills).toContain("ig-audit");
    expect(criafyContentAgentDefinition.skills).toContain("ig-viral");
    expect(criafyContentAgentDefinition.skills).toContain("ig-human");
  });
});
