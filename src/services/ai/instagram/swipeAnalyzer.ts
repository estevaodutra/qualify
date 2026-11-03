import { classifyHookFormula } from "./hooksData";

export interface SwipeItemInput {
  account: string;
  followers?: number | null;
  median?: number | null;
  views: number;
  hook: string;
  onScreen?: string;
  lengthSeconds?: number;
  cta?: string;
}

export interface AnalyzedSwipeItem extends SwipeItemInput {
  baseline: number;
  outlierMultiple: number;
  formulaId: number | null;
  formulaName: string;
  signalGrade: "MEGA_VIRAL" | "STRONG_OUTLIER" | "AVERAGE_PERFORMANCE" | "BELOW_BASELINE";
}

export interface SwipeAnalysisSummary {
  totalAnalyzed: number;
  strongOutliersCount: number;
  topFormulas: Array<{ formulaName: string; count: number; avgMultiple: number }>;
  items: AnalyzedSwipeItem[];
  actionableInsights: string[];
}

export function analyzeViralSwipes(items: SwipeItemInput[]): SwipeAnalysisSummary {
  const analyzed: AnalyzedSwipeItem[] = [];

  for (const item of items) {
    const base = item.median || item.followers || 1;
    const views = Math.max(0, item.views || 0);
    const outlierMultiple = Number((views / Math.max(1, base)).toFixed(2));

    const { formulaId, formulaName } = classifyHookFormula(item.hook);

    let signalGrade: AnalyzedSwipeItem["signalGrade"] = "AVERAGE_PERFORMANCE";
    if (outlierMultiple >= 5.0) signalGrade = "MEGA_VIRAL";
    else if (outlierMultiple >= 2.5) signalGrade = "STRONG_OUTLIER";
    else if (outlierMultiple < 1.0) signalGrade = "BELOW_BASELINE";

    analyzed.push({
      ...item,
      baseline: base,
      outlierMultiple,
      formulaId,
      formulaName,
      signalGrade,
    });
  }

  // Ordenar decrescente pelo outlier multiple
  analyzed.sort((a, b) => b.outlierMultiple - a.outlierMultiple);

  // Mapear fórmulas com melhor performance
  const formulaStats = new Map<string, { count: number; totalMultiple: number }>();
  for (const row of analyzed) {
    if (row.formulaName && row.formulaName !== "Fórmula Livre / Não classificada") {
      const current = formulaStats.get(row.formulaName) || { count: 0, totalMultiple: 0 };
      current.count += 1;
      current.totalMultiple += row.outlierMultiple;
      formulaStats.set(row.formulaName, current);
    }
  }

  const topFormulas = Array.from(formulaStats.entries())
    .map(([formulaName, stat]) => ({
      formulaName,
      count: stat.count,
      avgMultiple: Number((stat.totalMultiple / stat.count).toFixed(2)),
    }))
    .sort((a, b) => b.avgMultiple - a.avgMultiple);

  const strongOutliersCount = analyzed.filter((a) => a.outlierMultiple >= 2.5).length;
  const insights: string[] = [];

  if (topFormulas.length > 0) {
    insights.push(
      `A fórmula com maior índice de tração neste lote foi '${topFormulas[0].formulaName}' (média de ${topFormulas[0].avgMultiple}x sobre a linha de base).`
    );
  }

  if (analyzed.length > 0 && analyzed[0].outlierMultiple >= 5.0) {
    insights.push(
      `Vídeo destaque da conta ${analyzed[0].account} alcançou ${analyzed[0].outlierMultiple}x a mediana com o gancho: "${analyzed[0].hook}". Recomenda-se modelar a estrutura sem copiar as palavras exatas.`
    );
  }

  insights.push(
    "Regra de ouro: vídeos com multiplicador abaixo de 1.5x representam o fluxo orgânico normal do criador. Foque em adaptar os ganchos acima de 3.0x."
  );

  return {
    totalAnalyzed: analyzed.length,
    strongOutliersCount,
    topFormulas,
    items: analyzed,
    actionableInsights: insights,
  };
}
