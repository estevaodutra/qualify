/**
 * humanizer.ts
 * Sanitiza textos gerados por IA, removendo artefatos invisíveis,
 * pontuações artificiais de LLM (como em-dashes excessivos) e clichês artificiais.
 */

// Caracteres invisíveis comuns que LLMs injetam
const INVISIBLE_CHARS_REGEX = /[\u200B\u200C\u200D\u2060\uFEFF\u00AD\u180E\u061C\u200E\u200F\uE000-\uF8FF]/g;

// Substituições de caracteres de pontuação artificial
const PUNCTUATION_MAP: Array<[RegExp, string]> = [
  [/—/g, " - "], // Em-dash substituído por traço comum
  [/–/g, "-"],   // En-dash
  [/’|‘/g, "'"], // Aspas curvas
  [/”|“/g, '"'],
  [/…/g, "..."],
];

// Clichês em português e termos de IA que devem ser higienizados
const SLOP_TERMS_PT: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bno mundo de hoje\b/gi, replacement: "hoje" },
  { pattern: /\bno cen[aá]rio atual\b/gi, replacement: "atualmente" },
  { pattern: /\bé importante lembrar que\b/gi, replacement: "" },
  { pattern: /\bvale ressaltar que\b/gi, replacement: "" },
  { pattern: /\bvamos mergulhar\b/gi, replacement: "vamos ver" },
  { pattern: /\bvamos explorar\b/gi, replacement: "olha isso" },
  { pattern: /\bdescubra os segredos\b/gi, replacement: "veja como funciona" },
  { pattern: /\bum divisor de [aá]guas\b/gi, replacement: "decisivo" },
  { pattern: /\brevolucion[aá]rio\b/gi, replacement: "muito eficiente" },
  { pattern: /\bdesvendar\b/gi, replacement: "entender" },
  { pattern: /\bsem mais delongas\b/gi, replacement: "direto ao ponto" },
  { pattern: /\bol[aá] pessoal, hoje eu quero falar sobre\b/gi, replacement: "" },
  { pattern: /\bfala galera, hoje vamos\b/gi, replacement: "" },
];

export interface HumanizeResult {
  cleanedText: string;
  changesMade: string[];
  cleanScore: number; // 0 a 100
}

export function humanizeInstagramText(rawText: string): HumanizeResult {
  if (!rawText) {
    return { cleanedText: "", changesMade: [], cleanScore: 100 };
  }

  let text = rawText;
  const changes: string[] = [];

  // 1. Remover caracteres invisíveis
  if (INVISIBLE_CHARS_REGEX.test(text)) {
    text = text.replace(INVISIBLE_CHARS_REGEX, "");
    changes.push("Removidos caracteres invisíveis de formatação de IA");
  }

  // 2. Normalizar pontuação artificial
  for (const [regex, rep] of PUNCTUATION_MAP) {
    if (regex.test(text)) {
      text = text.replace(regex, rep);
      changes.push(`Normalizada pontuação artificial (${rep})`);
    }
  }

  // 3. Substituir clichês artificiais
  for (const item of SLOP_TERMS_PT) {
    if (item.pattern.test(text)) {
      text = text.replace(item.pattern, item.replacement);
      changes.push(`Higienizado clichê/termo artificial: ${item.pattern.source}`);
    }
  }

  // 4. Limpar espaços duplos remanescentes
  text = text.replace(/ {2,}/g, " ").trim();

  // Calcular score de limpeza
  const cleanScore = Math.max(70, 100 - (changes.length * 5));

  return {
    cleanedText: text,
    changesMade: changes,
    cleanScore,
  };
}
