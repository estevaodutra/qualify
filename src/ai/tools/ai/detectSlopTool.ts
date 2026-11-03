import {
  DetectSlopInput,
  DetectSlopOutput,
  DetectSlopInputSchema,
  DetectSlopOutputSchema,
  ToolDefinition,
} from "../../schemas";
import { detectSlop } from "@/services/ai/instagram/aiHumanizer";

export const detectSlopTool: ToolDefinition<DetectSlopInput, DetectSlopOutput> = {
  name: "ai.detect_slop",
  description:
    "Analisa um texto de roteiro ou legenda em 4 heurísticas de IA (variação de tamanho de frases/burstiness, termos clichês/slop, densidade de marcadores concretos e caracteres sintéticos/fingerprint), retornando human score de 0 a 100 e veredito.",
  type: "read_only",
  permission: "ai.use_tools",
  input_schema: DetectSlopInputSchema,
  output_schema: DetectSlopOutputSchema,
  timeout: 10,
  retry_policy: { max_retries: 2, backoff: "linear" },
  handler: async (input: DetectSlopInput): Promise<DetectSlopOutput> => {
    const res = detectSlop(input.text);
    return {
      human_score: res.humanScore,
      is_human: res.isHuman,
      verdict: res.verdict,
      breakdown: {
        burstiness_score: res.breakdown.burstinessScore,
        burstiness_detail: res.breakdown.burstinessDetail,
        specificity_score: res.breakdown.specificityScore,
        specificity_detail: res.breakdown.specificityDetail,
        slop_score: res.breakdown.slopScore,
        slop_detail: res.breakdown.slopDetail,
        fingerprint_score: res.breakdown.fingerprintScore,
        fingerprint_detail: res.breakdown.fingerprintDetail,
      },
      detected_slop_tokens: res.detectedSlopTokens,
    };
  },
};
