export interface CaptionCheckItem {
  check: string;
  status: "PASS" | "WARN" | "FAIL";
  detail: string;
}

export interface CaptionAnalysisResult {
  characters: number;
  limit: number;
  truncateAt: number;
  visibleWindow: string;
  truncated: boolean;
  firstLineChars: number;
  hashtags: string[];
  mentions: string[];
  links: string[];
  emojiCount: number;
  emojiDensity: number;
  asks: string[];
  checks: CaptionCheckItem[];
  verdict: "READY" | "REVIEW" | "FIX";
}

export interface CaptionLintOptions {
  truncateAt?: number;
  keywords?: string[];
}

const LIMIT = 2200; // Limite do Instagram
const TRUNCATE_DEFAULT = 125; // Janela antes do "... mais"
const HASHTAG_LIMIT = 5; // Limite oficial de até 5 hashtags

const HASHTAG_RE = /(?:^|\s)(#[A-Za-z0-9_]+)/g;
const MENTION_RE = /(?:^|\s)(@[A-Za-z0-9_.]+)/g;
const LINK_RE = /https?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+\.(?:com|co|io|net|org|ai|app|com\.br)\/\S*/gi;
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/gu;
const CONCRETE_RE = /\$\s?\d|r\$\s?\d|\b\d[\d,.]*\b|(?<!^)\b[A-ZÁÉÍÓÚÂÊÔÇ][a-záéíóúâêôãõç]{2,}\b/gm;

const ASKS_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\b(comente|comentar|comenta|comment)\s+(a palavra|o termo|")?[A-Z0-9]{2,}\b/i, name: "comentar palavra-chave" },
  { pattern: /\b(me mande|mande|envie|chama no|direct|dm)\b/i, name: "chamar na DM" },
  { pattern: /\b(salve|salva|salvar)\s+(este|esse|este post|esse post|para ver depois)\b/i, name: "salvar conteúdo" },
  { pattern: /\b(compartilhe|compartilha|mande para um amigo)\b/i, name: "compartilhar" },
  { pattern: /\b(siga|segue|acompanhe|follow)\b/i, name: "seguir perfil" },
  { pattern: /\b(link na bio|link na biografia)\b/i, name: "link na bio" },
  { pattern: /\b(arrasta para o lado|deslize|veja o próximo)\b/i, name: "deslizar carrossel" },
  { pattern: /\b(me conta|qual sua opinião|qual você|o que você acha)\b/i, name: "responder pergunta" },
];

const FILLER_TAGS = new Set([
  "#viral", "#fyp", "#explore", "#explorepage", "#foryou", "#foryoupage",
  "#trending", "#instagood", "#love", "#follow", "#like4like", "#reels",
  "#reelsinstagram", "#viralreels", "#instadaily", "#marketing", "#sucesso",
  "#empreendedorismo", "#motivacao", "#foco"
]);

export function lintAdvancedInstagramCaption(
  caption: string,
  options: CaptionLintOptions = {}
): CaptionAnalysisResult {
  const cut = options.truncateAt ?? TRUNCATE_DEFAULT;
  const keywords = options.keywords ?? [];

  const text = (caption || "").trimEnd();
  const stripped = text.trim();
  const chars = stripped.length;
  const lines = stripped.split("\n");
  const firstLine = lines.length > 0 ? lines[0].trim() : "";

  const hashtags = (stripped.match(HASHTAG_RE) || []).map((t) => t.trim());
  const mentions = (stripped.match(MENTION_RE) || []).map((m) => m.trim());
  const links = (stripped.match(LINK_RE) || []).map((l) => l.trim());
  const emojis = stripped.match(EMOJI_RE) || [];
  const emojiCount = emojis.length;
  const emojiDensity = Number(((emojiCount * 100) / Math.max(chars, 1)).toFixed(1));

  // Janela visível
  const visibleWindow = chars <= cut ? stripped : stripped.slice(0, cut);
  const truncated = chars > cut;

  // Chamadas de ação
  const asks = ASKS_PATTERNS.filter((item) => item.pattern.test(stripped)).map((item) => item.name);
  const filler = hashtags.filter((t) => FILLER_TAGS.has(t.toLowerCase()));

  const checks: CaptionCheckItem[] = [];
  const addCheck = (check: string, status: "PASS" | "WARN" | "FAIL", detail: string) => {
    checks.push({ check, status, detail });
  };

  // 1. Limite de caracteres
  if (chars > LIMIT) {
    addCheck("LIMITE DE TAMANHO", "FAIL", `${chars} / ${LIMIT} caracteres (${chars - LIMIT} acima do limite da plataforma)`);
  } else {
    addCheck("LIMITE DE TAMANHO", "PASS", `${chars} / ${LIMIT} caracteres`);
  }

  // 2. Primeira Linha / Gancho da Janela
  if (!firstLine) {
    addCheck("PRIMEIRA LINHA", "FAIL", "A legenda começa com linha em branco.");
  } else if (firstLine.startsWith("#") || firstLine.startsWith("@")) {
    addCheck("PRIMEIRA LINHA", "FAIL", "Começa com hashtag ou menção, gastando o espaço mais valioso de retenção.");
  } else if (firstLine.length > cut) {
    addCheck("PRIMEIRA LINHA", "WARN", `${firstLine.length} caracteres. A frase será cortada na janela de ${cut} caracteres antes do '... mais'. Garanta que haja um cliffhanger.`);
  } else {
    addCheck("PRIMEIRA LINHA", "PASS", `${firstLine.length} caracteres, frase fecha inteira antes do corte.`);
  }

  // 3. Concreção na Janela Visível (primeiros 125 chars)
  const concreteMatches = visibleWindow.match(CONCRETE_RE) || [];
  if (concreteMatches.length > 0) {
    addCheck("CONCREÇÃO NO GANCHO", "PASS", `${concreteMatches.length} elemento(s) concreto(s) (números, moedas ou nomes) visíveis antes do clique.`);
  } else {
    addCheck("CONCREÇÃO NO GANCHO", "WARN", "Nenhum número, valor ou dado concreto identificável antes do botão '... mais'.");
  }

  // 4. Quantidade de Hashtags (Cap de 5)
  if (hashtags.length > HASHTAG_LIMIT) {
    addCheck("QUANTIDADE DE HASHTAGS", "FAIL", `${hashtags.length} hashtags. O teto recomendado pelo Instagram Creators é de no máximo 5 tags temáticas direcionadas.`);
  } else if (hashtags.length === HASHTAG_LIMIT && filler.length > 0) {
    addCheck("QUANTIDADE DE HASHTAGS", "WARN", `5 hashtags utilizadas, mas ${filler.length} são genéricas (${filler.join(", ")}). Substitua por termos de nicho.`);
  } else if (filler.length > 0) {
    addCheck("QUANTIDADE DE HASHTAGS", "WARN", `${hashtags.length} hashtags, sendo ${filler.length} genéricas (${filler.join(", ")}). Tags como #viral ou #explore não indexam públicos compradores.`);
  } else {
    addCheck("QUANTIDADE DE HASHTAGS", "PASS", `${hashtags.length} tag(s) ${hashtags.length > 0 ? `(${hashtags.join(" ")})` : "- sem excessos"}`);
  }

  // 5. Posicionamento das Hashtags
  if (hashtags.length === 0) {
    addCheck("POSICIONAMENTO DE TAGS", "PASS", "Sem hashtags poluindo o texto.");
  } else {
    const hasTagInWindow = hashtags.some((t) => visibleWindow.toLowerCase().includes(t.toLowerCase()));
    if (hasTagInWindow) {
      addCheck("POSICIONAMENTO DE TAGS", "WARN", "Hashtag presente dentro da janela visível de 125 chars. Empurre as tags para o final do post.");
    } else {
      addCheck("POSICIONAMENTO DE TAGS", "PASS", "Hashtags devidamente posicionadas no rodapé, abaixo da dobra.");
    }
  }

  // 6. Links na legenda
  if (links.length > 0) {
    addCheck("LINKS NO TEXTO", "WARN", `${links.length} link(s) no corpo da legenda. O Instagram não permite clicar em links no feed. Direcione para o link da bio ou envie por DM.`);
  } else {
    addCheck("LINKS NO TEXTO", "PASS", "Nenhum link quebrado ou inativo no corpo da legenda.");
  }

  // 7. Chamada de Ação Única (One Ask)
  if (asks.length === 1) {
    addCheck("OBJETIVO & CTA ÚNICO", "PASS", `1 chamada clara de ação: ${asks[0]}.`);
  } else if (asks.length === 0) {
    addCheck("OBJETIVO & CTA ÚNICO", "WARN", "Nenhuma chamada de ação detectada. Defina o objetivo desta publicação (ex: comente PALAVRA, envie DM, salve).");
  } else {
    addCheck("OBJETIVO & CTA ÚNICO", "WARN", `${asks.length} CTAs concorrentes identificadas (${asks.join(", ")}). Quem pede duas ações não ganha nenhuma.`);
  }

  // 8. Densidade de Emojis
  if (emojiDensity > 4.0) {
    addCheck("DENSIDADE DE EMOJIS", "WARN", `${emojiCount} emojis (${emojiDensity}% do texto). Poluição visual excessiva passa impressão amadora.`);
  } else {
    addCheck("DENSIDADE DE EMOJIS", "PASS", `${emojiCount} emoji(s) (${emojiDensity}% do texto), uso equilibrado.`);
  }

  // 9. Palavras-chave / SEO
  if (keywords.length > 0) {
    const lowText = stripped.toLowerCase();
    const foundKeywords = keywords.filter((k) => lowText.includes(k.toLowerCase()));
    const missingKeywords = keywords.filter((k) => !lowText.includes(k.toLowerCase()));
    const inWindowKeywords = foundKeywords.filter((k) => visibleWindow.toLowerCase().includes(k.toLowerCase()));

    const status = missingKeywords.length === 0 ? "PASS" : foundKeywords.length > 0 ? "WARN" : "FAIL";
    addCheck(
      "PALAVRAS-CHAVE / SEO",
      status,
      `${foundKeywords.length}/${keywords.length} presentes${inWindowKeywords.length > 0 ? ` (${inWindowKeywords.length} na janela visível)` : ""}.${missingKeywords.length > 0 ? ` Ausentes: ${missingKeywords.join(", ")}` : ""}`
    );
  }

  const fails = checks.filter((c) => c.status === "FAIL").length;
  const warns = checks.filter((c) => c.status === "WARN").length;
  const verdict: CaptionAnalysisResult["verdict"] = fails > 0 ? "FIX" : warns > 0 ? "REVIEW" : "READY";

  return {
    characters: chars,
    limit: LIMIT,
    truncateAt: cut,
    visibleWindow,
    truncated,
    firstLineChars: firstLine.length,
    hashtags,
    mentions,
    links,
    emojiCount,
    emojiDensity,
    asks,
    checks,
    verdict,
  };
}
