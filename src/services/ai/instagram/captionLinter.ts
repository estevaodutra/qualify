/**
 * captionLinter.ts
 * Valida legendas do Instagram conforme as diretrizes do algoritmo moderno:
 * 1. Janela visível de 125 caracteres (antes do "... mais").
 * 2. Limite recomendado de até 5 hashtags direcionadas (diretriz oficial Creators).
 * 3. Presença de CTA único.
 * 4. Limite de 2.200 caracteres totais.
 */

export interface CaptionLintResult {
  visibleWindow: string;
  isTruncated: boolean;
  totalLength: number;
  hashtagCount: number;
  hashtags: string[];
  hasSingleAsk: boolean;
  warnings: string[];
  passes: string[];
}

export function lintInstagramCaption(caption: string): CaptionLintResult {
  const clean = (caption || "").trim();
  const TRUNCATE_LIMIT = 125;
  const HARD_LIMIT = 2200;

  const isTruncated = clean.length > TRUNCATE_LIMIT;
  const visibleWindow = isTruncated ? clean.slice(0, TRUNCATE_LIMIT) : clean;

  // Extrair hashtags
  const hashtagMatches = clean.match(/(?:^|\s)(#[A-Za-z0-9_]+)/g) || [];
  const hashtags = hashtagMatches.map((h) => h.trim());

  const warnings: string[] = [];
  const passes: string[] = [];

  // Checagens
  if (clean.length > HARD_LIMIT) {
    warnings.push(`Legenda excede o limite do Instagram (${clean.length}/${HARD_LIMIT} caracteres)`);
  } else {
    passes.push(`Tamanho adequado (${clean.length}/${HARD_LIMIT} caracteres)`);
  }

  if (clean.length > TRUNCATE_LIMIT) {
    // Verificar se o corte acontece no meio de uma frase
    const cutSlice = clean.slice(TRUNCATE_LIMIT - 10, TRUNCATE_LIMIT + 5);
    if (!cutSlice.includes(".") && !cutSlice.includes("?") && !cutSlice.includes("\n")) {
      warnings.push("O corte de 125 caracteres do feed acontece no meio da frase. Garanta que o gancho principal esteja nas 2 primeiras linhas.");
    }
  }

  if (hashtags.length > 5) {
    warnings.push(`Você usou ${hashtags.length} hashtags. A recomendação oficial é de no máximo 3 a 5 hashtags focadas.`);
  } else if (hashtags.length > 0) {
    passes.push(`Número de hashtags ideal (${hashtags.length} hashtags focadas)`);
  }

  // Verificar CTA
  const ctaRegex = /(comente|comente a palavra|mande|envie|clique no link|salve|compartilhe)/i;
  const hasSingleAsk = ctaRegex.test(clean);
  if (hasSingleAsk) {
    passes.push("Contém chamada para ação (CTA) clara.");
  } else {
    warnings.push("Não foi detectada uma chamada para ação (CTA) explícita (ex: 'Comente...', 'Salve...', 'Compartilhe').");
  }

  return {
    visibleWindow,
    isTruncated,
    totalLength: clean.length,
    hashtagCount: hashtags.length,
    hashtags,
    hasSingleAsk,
    warnings,
    passes,
  };
}
