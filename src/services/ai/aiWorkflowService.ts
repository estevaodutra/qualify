import { AIExecutionService } from "./aiExecutionService";
import { AiExecutionResult } from "@/types/aiSkills";

export interface StrategicReelWorkflowParams {
  companyId?: string;
  accountId?: string;
  theme: string;
  objective?: string;
  customInstruction?: string;
}

export interface StrategicReelWorkflowResult {
  workflow: "create_strategic_reel";
  strategy: AiExecutionResult;
  script: AiExecutionResult;
  design: AiExecutionResult;
  summary: {
    strategicAngle: string;
    hook: string;
    headline: string;
    totalTokens: number;
    totalLatencyMs: number;
    totalEstimatedCost: number;
  };
}

export const AIWorkflowService = {
  /**
   * Executa o workflow sequencial explícito create_strategic_reel:
   * 1. estrategista-digital -> briefing estratégico
   * 2. roteirista-reels -> roteiro baseado no briefing
   * 3. designer-criativos -> direção visual e capa
   */
  async createStrategicReel(params: StrategicReelWorkflowParams): Promise<StrategicReelWorkflowResult> {
    const { companyId, accountId, theme, objective, customInstruction } = params;

    // ETAPA 1: ESTRATEGISTA DIGITAL
    const strategyResult = await AIExecutionService.generate({
      action: "strategy_plan",
      skillSlug: "estrategista-digital",
      companyId,
      accountId,
      theme,
      objective: objective || "Autoridade e conversão qualificada",
      customInstruction: customInstruction || "Estruture o direcionamento estratégico para gravação de um Reel de alto impacto.",
    });

    const strategyOutput = strategyResult.structured_output || {};
    const recommendedAngle = strategyOutput.recommended_angle || "Ângulo focado em mecanismo único";
    const coreMessage = strategyOutput.core_message || theme;

    // ETAPA 2: ROTEIRISTA DE REELS
    const scriptResult = await AIExecutionService.generate({
      action: "generate_reel",
      skillSlug: "roteirista-reels",
      companyId,
      accountId,
      theme: coreMessage,
      objective: strategyOutput.objective || objective,
      angle: recommendedAngle,
      customInstruction: `Use estritamente o briefing estratégico do Estrategista Digital:
- Mensagem central: ${coreMessage}
- Ângulo recomendado: ${recommendedAngle}
- Resumo estratégico: ${strategyOutput.strategic_summary || ""}`,
    });

    const scriptOutput = scriptResult.structured_output || {};
    const hook = scriptOutput.hook || "";
    const script = scriptOutput.script || "";

    // ETAPA 3: DESIGNER DE CRIATIVOS (DIREÇÃO VISUAL & CAPA)
    const designResult = await AIExecutionService.generate({
      action: "generate_creative_direction",
      skillSlug: "designer-criativos",
      companyId,
      accountId,
      format: "CAPA_REEL",
      theme: coreMessage,
      objective: strategyOutput.objective || objective,
      angle: recommendedAngle,
      customInstruction: `Defina a direção visual e capa para o Reel roteirizado:
- Hook da capa: ${hook}
- Roteiro falado: ${script.slice(0, 300)}...
- Mensagem central: ${coreMessage}`,
    });

    const designOutput = designResult.structured_output || {};

    const totalTokens =
      strategyResult.tokens.total + scriptResult.tokens.total + designResult.tokens.total;
    const totalLatencyMs =
      strategyResult.latency_ms + scriptResult.latency_ms + designResult.latency_ms;
    const totalEstimatedCost =
      Number(strategyResult.estimated_cost) +
      Number(scriptResult.estimated_cost) +
      Number(designResult.estimated_cost);

    return {
      workflow: "create_strategic_reel",
      strategy: strategyResult,
      script: scriptResult,
      design: designResult,
      summary: {
        strategicAngle: recommendedAngle,
        hook: hook,
        headline: designOutput.headline || hook,
        totalTokens,
        totalLatencyMs,
        totalEstimatedCost,
      },
    };
  },
};
