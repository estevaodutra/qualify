export interface InvisibleCharRule {
  cp: string;
  name: string;
  action: "delete" | "space";
  chars: string[];
}

export interface TypographicRule {
  from: string;
  name: string;
  to: string;
}

export interface SlopLexiconEntry {
  find: string;
  replace: string;
}

export interface SlopLexicon {
  version: string;
  invisible: InvisibleCharRule[];
  typographic: TypographicRule[];
  words: SlopLexiconEntry[];
  phrases: SlopLexiconEntry[];
}

export const DEFAULT_SLOP_LEXICON: SlopLexicon = {
  version: "1.0",
  invisible: [
    { cp: "U+200B", name: "ZERO WIDTH SPACE", action: "delete", chars: ["\u200B"] },
    { cp: "U+200C", name: "ZERO WIDTH NON-JOINER", action: "delete", chars: ["\u200C"] },
    { cp: "U+200D", name: "ZERO WIDTH JOINER", action: "delete", chars: ["\u200D"] },
    { cp: "U+2060", name: "WORD JOINER", action: "delete", chars: ["\u2060"] },
    { cp: "U+FEFF", name: "ZERO WIDTH NO-BREAK SPACE / BOM", action: "delete", chars: ["\uFEFF"] },
    { cp: "U+00AD", name: "SOFT HYPHEN", action: "delete", chars: ["\u00AD"] },
    { cp: "U+180E", name: "MONGOLIAN VOWEL SEPARATOR", action: "delete", chars: ["\u180E"] },
    { cp: "U+061C", name: "ARABIC LETTER MARK", action: "delete", chars: ["\u061C"] },
    { cp: "U+200E", name: "LEFT-TO-RIGHT MARK", action: "delete", chars: ["\u200E"] },
    { cp: "U+200F", name: "RIGHT-TO-LEFT MARK", action: "delete", chars: ["\u200F"] },
    { cp: "U+00A0", name: "NO-BREAK SPACE", action: "space", chars: ["\u00A0"] },
    { cp: "U+202F", name: "NARROW NO-BREAK SPACE", action: "space", chars: ["\u202F"] },
    { cp: "U+2009", name: "THIN SPACE", action: "space", chars: ["\u2009"] },
    { cp: "U+2007", name: "FIGURE SPACE", action: "space", chars: ["\u2007"] },
    { cp: "U+2003", name: "EM SPACE", action: "space", chars: ["\u2003"] },
    { cp: "U+2002", name: "EN SPACE", action: "space", chars: ["\u2002"] },
    { cp: "U+2063", name: "INVISIBLE SEPARATOR", action: "delete", chars: ["\u2063"] },
  ],
  typographic: [
    { from: "—", name: "EM DASH", to: ", " },
    { from: "–", name: "EN DASH", to: "-" },
    { from: "‘", name: "LEFT SINGLE QUOTE", to: "'" },
    { from: "’", name: "RIGHT SINGLE QUOTE", to: "'" },
    { from: "“", name: "LEFT DOUBLE QUOTE", to: "\"" },
    { from: "”", name: "RIGHT DOUBLE QUOTE", to: "\"" },
    { from: "…", name: "HORIZONTAL ELLIPSIS", to: "..." },
    { from: "′", name: "PRIME", to: "'" },
    { from: "·", name: "MIDDLE DOT", to: "-" },
    { from: "•", name: "BULLET", to: "-" },
    { from: "→", name: "RIGHTWARDS ARROW", to: "->" },
  ],
  words: [
    { find: "delve", replace: "look into" },
    { find: "tapestry", replace: "mix" },
    { find: "beacon", replace: "guide" },
    { find: "cornerstone", replace: "basis" },
    { find: "leverage", replace: "use" },
    { find: "utilize", replace: "use" },
    { find: "seamless", replace: "smooth" },
    { find: "testament", replace: "proof" },
    { find: "pivotal", replace: "key" },
    { find: "foster", replace: "build" },
    { find: "holistic", replace: "complete" },
    { find: "paramount", replace: "crucial" },
    { find: "plethora", replace: "plenty" },
    { find: "myriad", replace: "many" },
    { find: "embark", replace: "start" },
    { find: "unwavering", replace: "steady" },
    { find: "revolutionize", replace: "change" },
    { find: "transformative", replace: "major" },
    { find: "bespoke", replace: "custom" },
    { find: "game-changer", replace: "breakthrough" },
    // Termos em Português
    { find: "mergulhar", replace: "analisar" },
    { find: "alavancar", replace: "aumentar" },
    { find: "revolucionário", replace: "eficiente" },
    { find: "revolucionária", replace: "eficiente" },
    { find: "revolucionários", replace: "eficientes" },
    { find: "revolucionárias", replace: "eficientes" },
    { find: "transformador", replace: "prático" },
    { find: "transformadora", replace: "prática" },
    { find: "ecossistema", replace: "estrutura" },
    { find: "disruptivo", replace: "diferente" },
    { find: "disruptiva", replace: "diferente" },
    { find: "holístico", replace: "completo" },
    { find: "holística", replace: "completa" },
    { find: "sinergia", replace: "parceria" },
    { find: "resiliência", replace: "firmeza" },
  ],
  phrases: [
    { find: "in today's fast-paced world", replace: "today" },
    { find: "in the digital age", replace: "nowadays" },
    { find: "it's important to remember", replace: "remember" },
    { find: "at the end of the day", replace: "ultimately" },
    { find: "a testament to", replace: "proof of" },
    { find: "shed light on", replace: "explain" },
    { find: "dive deep into", replace: "explore" },
    { find: "game changer", replace: "huge shift" },
    { find: "unlock your potential", replace: "grow" },
    { find: "take your business to the next level", replace: "grow your business" },
    // Frases em Português
    { find: "no mundo dinâmico de hoje", replace: "hoje" },
    { find: "na era digital", replace: "atualmente" },
    { find: "levar seu negócio para o próximo nível", replace: "aumentar seu faturamento" },
    { find: "destravar seu potencial", replace: "evoluir" },
    { find: "virada de chave", replace: "mudança de método" },
    { find: "mergulho profundo", replace: "passo a passo" },
    { find: "olhar com outros olhos", replace: "avaliar" },
    { find: "você sabia que", replace: "" },
    { find: "neste vídeo você vai aprender", replace: "" },
    { find: "sem mais delongas", replace: "" },
  ],
};
