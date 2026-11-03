import { DEFAULT_SLOP_LEXICON, SlopLexicon } from "./slopLexicon";

export interface SlopDetectionResult {
  humanScore: number; // 0 a 100 (quanto maior, mais humano)
  isHuman: boolean; // true se score >= 70
  verdict: "HUMAN" | "POSSIBLY_AI" | "HIGHLY_ARTIFICIAL";
  breakdown: {
    burstinessScore: number;
    burstinessDetail: string;
    specificityScore: number;
    specificityDetail: string;
    slopScore: number;
    slopDetail: string;
    fingerprintScore: number;
    fingerprintDetail: string;
  };
  detectedSlopTokens: string[];
}

export interface HumanizeOptions {
  cleanInvisible?: boolean;
  cleanTypographic?: boolean;
  replaceLexical?: boolean;
  lexicon?: SlopLexicon;
}

export interface HumanizeResult {
  cleanedText: string;
  invisibleHits: Array<{ name: string; count: number; action: string }>;
  typographicHits: Array<{ name: string; count: number; to: string }>;
  lexicalHits: Array<{ find: string; count: number; replacedWith: string }>;
  originalLength: number;
  cleanedLength: number;
}

const URL_REGEX = /https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+/gi;
const SENTENCE_REGEX = /[^.!?\n]+[.!?]*/g;
const WORD_REGEX = /[A-Za-z0-9$%'’.\-áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]+/g;
const NUMBER_REGEX = /\b\d[\d,.]*%?\b|\$\d|r\$\s?\d/gi;
const PROPER_NOUN_REGEX = /(?<![.!?]\s)(?<!^)\b[A-ZÁÉÍÓÚÂÊÔÇ][a-záéíóúâêîôûãõç]{2,}\b/g;

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function scale(value: number, human: number, machine: number): number {
  if (human === machine) return 50.0;
  return clamp(((value - machine) / (human - machine)) * 100);
}

function getSentences(text: string): string[] {
  const matches = text.match(SENTENCE_REGEX) || [];
  return matches
    .map((s) => s.trim())
    .filter((s) => {
      const words = s.match(WORD_REGEX) || [];
      return words.length > 2;
    });
}

function getWords(text: string): string[] {
  return text.match(WORD_REGEX) || [];
}

/**
 * 1. BURSTINESS: Variação de extensão de sentenças.
 * Humanos variam muito (desvio padrão alto); IAs geram sentenças de comprimentos quase homogêneos.
 */
function checkBurstiness(text: string): { score: number; detail: string } {
  const sents = getSentences(text);
  if (sents.length < 3) {
    return { score: 65, detail: "Texto muito curto para avaliar desvio de sentenças." };
  }
  const lens = sents.map((s) => getWords(s).length);
  const mean = lens.reduce((acc, v) => acc + v, 0) / lens.length;
  if (mean === 0) return { score: 50, detail: "Sem palavras válidas." };

  const variance = lens.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / lens.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean; // Coeficiente de variação

  // cv ideal humano ~0.65+, IA ~0.25
  const score = scale(cv, 0.7, 0.22);
  return {
    score: Math.round(score),
    detail: `Variação de sentenças (CV): ${cv.toFixed(2)} em ${lens.length} frases (almeje 0.55+).`,
  };
}

/**
 * 2. SPECIFICITY: Presença de números, valores, prazos e nomes concretos.
 * IAs tendem a generalizações abstratas.
 */
function checkSpecificity(text: string): { score: number; detail: string } {
  const w = getWords(text);
  if (w.length < 15) {
    return { score: 60, detail: "Trecho curto para análise de especificidade." };
  }
  const numbersCount = (text.match(NUMBER_REGEX) || []).length;
  const properNouns = new Set(text.match(PROPER_NOUN_REGEX) || []).size;
  const totalMarkers = numbersCount + properNouns;
  const density = (totalMarkers * 100) / w.length;

  // densidade humana ~6.0 por 100 palavras, IA ~0.5
  const score = scale(density, 6.0, 0.5);
  return {
    score: Math.round(score),
    detail: `${totalMarkers} marcadores concretos (${density.toFixed(1)} a cada 100 palavras). Almeje 4.0+.`,
  };
}

/**
 * 3. SLOP DENSITY: Densidade de vocabulário e clichês robóticos.
 */
function checkSlop(
  text: string,
  lexicon: SlopLexicon = DEFAULT_SLOP_LEXICON
): { score: number; detail: string; hits: string[] } {
  const w = getWords(text);
  if (w.length === 0) {
    return { score: 50, detail: "Texto vazio.", hits: [] };
  }

  const allEntries = [...lexicon.phrases, ...lexicon.words];
  let hitCount = 0;
  const found: string[] = [];

  for (const entry of allEntries) {
    const escaped = entry.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      hitCount += matches.length;
      found.push(entry.find);
    }
  }

  const density = (hitCount * 100) / w.length;
  // 0% slop -> 100 humano, 4.0% slop -> 0 humano
  const score = scale(density, 0.0, 4.0);
  const detail =
    hitCount === 0
      ? "Nenhum clichê de IA detectado."
      : `${hitCount} clichê(s) detectados (${density.toFixed(1)} a cada 100 palavras): ${found.slice(0, 4).join(", ")}${found.length > 4 ? "..." : ""}`;

  return {
    score: Math.round(score),
    detail,
    hits: found,
  };
}

/**
 * 4. FINGERPRINT: Caracteres invisíveis, travessões sintéticos (em dash) e aspas curvas.
 */
function checkFingerprint(text: string): { score: number; detail: string } {
  const emDashCount = (text.match(/—/g) || []).length;
  const curlyQuotesCount = (text.match(/[‘’“”]/g) || []).length;
  const ellipsisCount = (text.match(/…/g) || []).length;
  const hardSpacesCount = (text.match(/[\u00A0\u202F\u2009]/g) || []).length;
  const invisibleFormatCount = (text.match(/[\u200B\u200C\u200D\u2060\uFEFF\u00AD]/g) || []).length;

  const total = invisibleFormatCount * 4 + emDashCount * 2 + curlyQuotesCount + ellipsisCount + hardSpacesCount;
  const per1k = (total * 1000) / Math.max(text.length, 1);
  const score = scale(per1k, 0.0, 12.0);

  const detail = `${invisibleFormatCount} invisíveis, ${emDashCount} em dash (—), ${curlyQuotesCount} aspas curvas, ${ellipsisCount} reticências unificadas.`;
  return {
    score: Math.round(score),
    detail,
  };
}

/**
 * Analisa e calcula o human score do texto (0 a 100).
 */
export function detectSlop(text: string, lexicon: SlopLexicon = DEFAULT_SLOP_LEXICON): SlopDetectionResult {
  const b = checkBurstiness(text);
  const s = checkSpecificity(text);
  const slop = checkSlop(text, lexicon);
  const f = checkFingerprint(text);

  // Média ponderada
  const humanScore = Math.round(
    b.score * 0.25 + s.score * 0.25 + slop.score * 0.35 + f.score * 0.15
  );

  let verdict: SlopDetectionResult["verdict"] = "POSSIBLY_AI";
  if (humanScore >= 75) verdict = "HUMAN";
  else if (humanScore < 50) verdict = "HIGHLY_ARTIFICIAL";

  return {
    humanScore,
    isHuman: humanScore >= 70,
    verdict,
    breakdown: {
      burstinessScore: b.score,
      burstinessDetail: b.detail,
      specificityScore: s.score,
      specificityDetail: s.detail,
      slopScore: slop.score,
      slopDetail: slop.detail,
      fingerprintScore: f.score,
      fingerprintDetail: f.detail,
    },
    detectedSlopTokens: slop.hits,
  };
}

/**
 * Protege links e URLs para que não sejam alterados pelas substituições.
 */
function protectUrls(text: string): { protectedText: string; urls: string[] } {
  const urls: string[] = [];
  const protectedText = text.replace(URL_REGEX, (match) => {
    urls.push(match);
    return `__URL_PLACEHOLDER_${urls.length - 1}__`;
  });
  return { protectedText, urls };
}

function restoreUrls(text: string, urls: string[]): string {
  let res = text;
  urls.forEach((url, i) => {
    res = res.replace(new RegExp(`__URL_PLACEHOLDER_${i}__`, "g"), url);
  });
  return res;
}

/**
 * Normaliza e humaniza o texto em 3 passagens:
 * 1. Remove caracteres invisíveis (zero-width, soft hyphens, BOM).
 * 2. Normaliza tipografia mecânica de LLMs (em dash -> vírgula, aspas curvas -> retas).
 * 3. Substitui termos clichês por vocabulário direto e natural.
 */
export function humanizeText(
  text: string,
  options: HumanizeOptions = {}
): HumanizeResult {
  const {
    cleanInvisible = true,
    cleanTypographic = true,
    replaceLexical = true,
    lexicon = DEFAULT_SLOP_LEXICON,
  } = options;

  const originalLength = text.length;
  const { protectedText, urls } = protectUrls(text);
  let currentText = protectedText;

  const invisibleHits: HumanizeResult["invisibleHits"] = [];
  const typographicHits: HumanizeResult["typographicHits"] = [];
  const lexicalHits: HumanizeResult["lexicalHits"] = [];

  // Passagem 1: Invisíveis
  if (cleanInvisible) {
    for (const rule of lexicon.invisible) {
      for (const ch of rule.chars) {
        const count = (currentText.split(ch).length - 1);
        if (count > 0) {
          invisibleHits.push({
            name: `${rule.cp} ${rule.name}`,
            count,
            action: rule.action,
          });
          currentText = currentText.split(ch).join(rule.action === "space" ? " " : "");
        }
      }
    }
  }

  // Passagem 2: Tipografia sintética
  if (cleanTypographic) {
    for (const rule of lexicon.typographic) {
      const ch = rule.from;
      const count = (currentText.split(ch).length - 1);
      if (count > 0) {
        typographicHits.push({
          name: `${ch} ${rule.name}`,
          count,
          to: rule.to,
        });

        if (ch === "—") {
          currentText = currentText.replace(/\s*—\s*/g, ", ");
        } else if (ch === "–") {
          // 5–10 vira 5-10
          currentText = currentText.replace(/\s*–\s*(?=\d)/g, "-");
          currentText = currentText.replace(/\s+–\s+/g, ", ");
          currentText = currentText.split("–").join("-");
        } else {
          currentText = currentText.split(ch).join(rule.to);
        }
      }
    }
    // Ajustar vírgulas duplicadas antes de pontuação
    currentText = currentText.replace(/,\s*([,.;:!?])/g, "$1");
    currentText = currentText.replace(/,\s*\n/g, "\n");
  }

  // Passagem 3: Léxica (substituição de frases e palavras clichês)
  if (replaceLexical) {
    const allEntries = [...lexicon.phrases, ...lexicon.words].sort(
      (a, b) => b.find.length - a.find.length
    );

    for (const entry of allEntries) {
      const escaped = entry.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
      const regex = new RegExp(`\\b${escaped}\\b`, "gi");
      const matches = currentText.match(regex);
      if (matches && matches.length > 0) {
        lexicalHits.push({
          find: entry.find,
          count: matches.length,
          replacedWith: entry.replace,
        });
        currentText = currentText.replace(regex, (match) => {
          if (!entry.replace) return "";
          if (match === match.toUpperCase() && match.length > 1) {
            return entry.replace.toUpperCase();
          }
          if (match[0] === match[0].toUpperCase()) {
            return entry.replace.charAt(0).toUpperCase() + entry.replace.slice(1);
          }
          return entry.replace;
        });
      }
    }
    // Limpar espaços duplos remanescentes
    currentText = currentText.replace(/[ \t]{2,}/g, " ");
  }

  const cleanedText = restoreUrls(currentText, urls);

  return {
    cleanedText,
    invisibleHits,
    typographicHits,
    lexicalHits,
    originalLength,
    cleanedLength: cleanedText.length,
  };
}
