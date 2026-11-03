import {
  AnalyzeSwipesInput,
  AnalyzeSwipesOutput,
  AnalyzeSwipesInputSchema,
  AnalyzeSwipesOutputSchema,
  ToolDefinition,
} from "../../schemas";
import { analyzeViralSwipes } from "@/services/ai/instagram/swipeAnalyzer";

export const analyzeSwipesTool: ToolDefinition<AnalyzeSwipesInput, AnalyzeSwipesOutput> = {
  name: "instagram.analyze_viral_swipes",
  description:
    "Analisa vídeos virais de referência calculando o multiplicador real sobre a mediana da conta (outlier multiple) e classificando automaticamente os ganchos contra as 26 fórmulas oficiais de Reels para montar swipe files com alto potencial de tração.",
  type: "read_only",
  permission: "ai.use_tools",
  input_schema: AnalyzeSwipesInputSchema,
  output_schema: AnalyzeSwipesOutputSchema,
  timeout: 10,
  retry_policy: { max_retries: 2, backoff: "linear" },
  handler: async (input: AnalyzeSwipesInput): Promise<AnalyzeSwipesOutput> => {
    const res = analyzeViralSwipes(
      input.items.map((it) => ({
        account: it.account,
        followers: it.followers,
        median: it.median,
        views: it.views,
        hook: it.hook,
        onScreen: it.on_screen,
        lengthSeconds: it.length_seconds,
        cta: it.cta,
      }))
    );

    return {
      total_analyzed: res.totalAnalyzed,
      strong_outliers_count: res.strongOutliersCount,
      top_formulas: res.topFormulas.map((f) => ({
        formula_name: f.formulaName,
        count: f.count,
        avg_multiple: f.avgMultiple,
      })),
      items: res.items.map((it) => ({
        account: it.account,
        views: it.views,
        baseline: it.baseline,
        outlier_multiple: it.outlierMultiple,
        formula_id: it.formulaId,
        formula_name: it.formulaName,
        signal_grade: it.signalGrade,
        hook: it.hook,
      })),
      actionable_insights: res.actionableInsights,
    };
  },
};
