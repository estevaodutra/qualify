import {
  ScoreHookInput,
  ScoreHookOutput,
  HookScoreItem,
  ScoreHookInputSchema,
  ScoreHookOutputSchema,
  ToolDefinition,
} from "../../schemas";
import { INSTAGRAM_HOOK_FORMULAS } from "@/services/ai/instagram/hooksData";

export function calculateSingleHookScore(hook: string): HookScoreItem {
  const cleanHook = hook.trim();
  const words = cleanHook.match(/[A-Za-z0-9$%'’.\-áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]+/g) || [];
  const wordCount = words.length;
  const estimatedSeconds = Number((wordCount / (165 / 60)).toFixed(1));

  const checks = [];
  const flags: string[] = [];

  // Check 1: Duração & Tamanho ideal (<= 14 palavras, <= 3.5s)
  const isGoodLength = wordCount >= 3 && wordCount <= 14 && estimatedSeconds <= 3.5;
  checks.push({
    name: "Duração e Tamanho do Hook",
    passed: isGoodLength,
    weight: 25,
    reason: isGoodLength
      ? "Tamanho ideal para prender a atenção nos primeiros 3 segundos."
      : estimatedSeconds > 3.5
      ? `Gancho longo (${estimatedSeconds}s / ${wordCount} palavras). Espectadores pulam vídeos com introdução acima de 3s.`
      : "Gancho muito curto para estabelecer uma promessa relevante.",
  });
  if (estimatedSeconds > 3.5) flags.push("HOOK_TOO_LONG");

  // Check 2: Especificidade Numérica ou Concreta
  const hasNumbers = /\d+|r\$|%|mil|dias|minutos|horas/i.test(cleanHook);
  checks.push({
    name: "Especificidade Numérica",
    passed: hasNumbers,
    weight: 25,
    reason: hasNumbers
      ? "Contém métrica ou valor tangível, o que gera credibilidade imediata."
      : "Sem números ou valores concretos. Fórmulas com dados exatos convertem 2x mais.",
  });
  if (!hasNumbers) flags.push("LACKS_SPECIFICITY");

  // Check 3: Quebra de Padrão / Tensão / Confissão de Custo
  const hasPatternInterrupt =
    /pare de|nunca|ninguém te conta|o motivo de|o erro|segredo|verdade|cuidado|não faça|custou|perdi|errei|prejuízo|risco|cláusula|falha/i.test(
      cleanHook
    );
  checks.push({
    name: "Quebra de Padrão e Tensão",
    passed: hasPatternInterrupt,
    weight: 25,
    reason: hasPatternInterrupt
      ? "Utiliza tensão, comando negativo ou revelação que desperta curiosidade imediata."
      : "Gancho neutro. Falta atrito ou quebra de padrão no primeiro segundo.",
  });
  if (!hasPatternInterrupt) flags.push("NO_PATTERN_INTERRUPT");

  // Check 4: Ausência de clichês vazios
  const hasCliches = /você sabia|neste vídeo|vou te ensinar|olá pessoal|bom dia|bem-vindo/i.test(
    cleanHook
  );
  checks.push({
    name: "Zero Enrolação & Clichês",
    passed: !hasCliches,
    weight: 25,
    reason: !hasCliches
      ? "Direto ao ponto, sem enrolações introdutórias amadoras."
      : "Contém clichê prejudicial (ex: 'você sabia', 'neste vídeo'). Corte imediatamente.",
  });
  if (hasCliches) flags.push("CLICHE_DETECTED");

  // Verificar matching com fórmulas famosas
  let matchedFormula = "";
  for (const formula of INSTAGRAM_HOOK_FORMULAS) {
    if (cleanHook.toLowerCase().includes(formula.name.toLowerCase().split(" ")[0].toLowerCase())) {
      matchedFormula = formula.name;
      break;
    }
  }

  // Cálculo da pontuação total
  let totalScore = 0;
  for (const check of checks) {
    if (check.passed) totalScore += check.weight;
  }

  // Bonus se casou com fórmula ou tem contraste de tempo/valor
  if (/->|virou|passou de|para/i.test(cleanHook)) {
    totalScore = Math.min(100, totalScore + 10);
  }

  let verdict: HookScoreItem["verdict"] = "POOR";
  if (totalScore >= 80) verdict = "EXCELLENT";
  else if (totalScore >= 60) verdict = "GOOD";
  else if (totalScore >= 40) verdict = "NEEDS_IMPROVEMENT";

  const failedChecks = checks.filter((c) => !c.passed);
  const weakest = failedChecks.length > 0 ? failedChecks[0].name : undefined;

  return {
    hook: cleanHook,
    score: totalScore,
    verdict,
    word_count: wordCount,
    estimated_seconds: estimatedSeconds,
    formula_match: matchedFormula || undefined,
    checks,
    weakest,
    flags,
  };
}

export const scoreHookTool: ToolDefinition<ScoreHookInput, ScoreHookOutput> = {
  name: "ai.score_hook",
  description:
    "Avalia uma lista de ganchos de vídeo (hooks) com base em métricas de retenção, contagem de palavras, especificidade e impacto nos primeiros 3 segundos.",
  type: "read_only",
  permission: "ai.use_tools",
  input_schema: ScoreHookInputSchema,
  output_schema: ScoreHookOutputSchema,
  timeout: 10,
  retry_policy: { max_retries: 2, backoff: "linear" },
  handler: async (input: ScoreHookInput) => {
    const items = input.hooks.map(calculateSingleHookScore);
    // Ordenar pelo maior score
    const sorted = [...items].sort((a, b) => b.score - a.score);
    const winner = sorted[0];

    return {
      items,
      winner,
    };
  },
};
