import { CriafyStrategyData } from "@/types/criafyStrategy";
import { createEmptyStrategy } from "@/utils/criafyStrategyDefaults";

export interface ParseResult {
  success: boolean;
  strategy: CriafyStrategyData;
  sectionsFound: string[];
  missingSections: string[];
  stats: {
    painsCount: number;
    objectionsCount: number;
    pillarsCount: number;
    rulesCount: number;
    phrasesCount: number;
  };
  warnings: string[];
}

export function parseAnamneseMarkdown(
  rawText: string,
  accountId: string,
  companyId: string,
  baseStrategy?: CriafyStrategyData
): ParseResult {
  const strategy = baseStrategy
    ? JSON.parse(JSON.stringify(baseStrategy))
    : createEmptyStrategy(accountId, companyId);

  const sectionsFound: string[] = [];
  const warnings: string[] = [];

  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      strategy,
      sectionsFound: [],
      missingSections: ["Documento vazio"],
      stats: { painsCount: 0, objectionsCount: 0, pillarsCount: 0, rulesCount: 0, phrasesCount: 0 },
      warnings: ["Nenhum texto foi fornecido para análise."],
    };
  }

  // 1. Tentar localizar bloco de código JSON embutido
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsedJson = JSON.parse(jsonMatch[1]);
      if (typeof parsedJson === "object" && parsedJson !== null) {
        // Hydrate from structured JSON
        hydrateStrategyFromJson(strategy, parsedJson);
        sectionsFound.push("Bloco Estruturado JSON");
      }
    } catch {
      // Non-fatal, prosseguir para parse de Markdown
    }
  }

  // 2. Extração via seções Markdown (Regex por cabeçalhos ## ou ###)
  const extractSection = (headingRegex: RegExp): string => {
    const match = rawText.match(headingRegex);
    if (!match) return "";
    return match[1].trim();
  };

  const extractListItems = (text: string): string[] => {
    if (!text) return [];
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- ") || line.startsWith("* ") || /^\d+\.\s/.test(line))
      .map((line) => line.replace(/^[-*]\s+|\d+\.\s+/, "").trim())
      .filter((item) => item.length > 0 && !item.toLowerCase().startsWith("exemplo:"));
  };

  // Helper para buscar bloco delimitado entre dois headers ##
  const getBlockBetweenHeaders = (headerPattern: RegExp): string => {
    const lines = rawText.split("\n");
    let capturing = false;
    const captured: string[] = [];

    for (const line of lines) {
      if (headerPattern.test(line)) {
        capturing = true;
        continue;
      }
      if (capturing && /^##\s+\d+|^#\s+/i.test(line)) {
        break;
      }
      if (capturing) {
        captured.push(line);
      }
    }
    return captured.join("\n").trim();
  };

  // 1. Contexto da Marca
  const brandBlock = getBlockBetweenHeaders(/##\s*(?:1\.)?\s*Contexto/i);
  if (brandBlock) {
    sectionsFound.push("Contexto da Marca");
    const whatIs = extractSection(/###\s*O que é\s*\n([\s\S]*?)(?=###|$)/i);
    const objective = extractSection(/###\s*Objetivo\s*\n([\s\S]*?)(?=###|$)/i);
    const offer = extractSection(/###\s*Oferta\s*\n([\s\S]*?)(?=###|$)/i);
    const moment = extractSection(/###\s*Momento\s*\n([\s\S]*?)(?=###|$)/i);

    if (whatIs) strategy.brandContext.whatIs = whatIs;
    if (objective) strategy.brandContext.profileObjective = objective;
    if (offer) strategy.brandContext.mainOffer = offer;
    if (moment) strategy.brandContext.currentMoment = moment;
  }

  // 2. Público
  const audienceBlock = getBlockBetweenHeaders(/##\s*(?:2\.)?\s*Público/i);
  if (audienceBlock) {
    sectionsFound.push("Público");
    const mainAud = extractSection(/###\s*Público principal\s*\n([\s\S]*?)(?=###|$)/i);
    const client = extractSection(/###\s*Cliente típico\s*\n([\s\S]*?)(?=###|$)/i);
    const situation = extractSection(/###\s*Situação atual\s*\n([\s\S]*?)(?=###|$)/i);
    const routine = extractSection(/###\s*Rotina\s*\n([\s\S]*?)(?=###|$)/i);
    const habits = extractSection(/###\s*Hábitos\s*\n([\s\S]*?)(?=###|$)/i);
    const consumption = extractSection(/###\s*Consumo de conteúdo\s*\n([\s\S]*?)(?=###|$)/i);
    const buying = extractSection(/###\s*Padrões de compra|Decisão de compra\s*\n([\s\S]*?)(?=###|$)/i);
    const tried = extractSection(/###\s*Soluções já tentadas\s*\n([\s\S]*?)(?=###|$)/i);
    const whyFailed = extractSection(/###\s*Por que falharam\s*\n([\s\S]*?)(?=###|$)/i);
    const stage = extractSection(/###\s*Estágio do público\s*\n([\s\S]*?)(?=###|$)/i);

    if (mainAud) strategy.audience.mainAudience = cleanMd(mainAud);
    if (client) strategy.audience.typicalClient = cleanMd(client);
    if (situation) strategy.audience.currentSituation = cleanMd(situation);
    if (routine) strategy.audience.routine = cleanMd(routine);
    if (habits) strategy.audience.habits = cleanMd(habits);
    if (consumption) strategy.audience.contentConsumption = cleanMd(consumption);
    if (buying) strategy.audience.buyingPatterns = cleanMd(buying);
    if (tried) strategy.audience.triedSolutions = cleanMd(tried);
    if (whyFailed) strategy.audience.whyFailed = cleanMd(whyFailed);
    if (stage) strategy.audience.audienceStage = cleanMd(stage);
  }

  // 3. Problemas e Dores
  const problemsBlock = getBlockBetweenHeaders(/##\s*(?:3\.)?\s*Problemas/i);
  if (problemsBlock) {
    sectionsFound.push("Problemas e Dores");
    const coreProb = extractSection(/###\s*Problema central\s*\n([\s\S]*?)(?=###|$)/i);
    const secProb = extractSection(/###\s*Problemas secundários\s*\n([\s\S]*?)(?=###|$)/i);
    const practical = extractSection(/###\s*Dor prática\s*\n([\s\S]*?)(?=###|$)/i);
    const emotional = extractSection(/###\s*Dor emocional\s*\n([\s\S]*?)(?=###|$)/i);
    const financial = extractSection(/###\s*Dor financeira\s*\n([\s\S]*?)(?=###|$)/i);
    const time = extractSection(/###\s*Dor de tempo\s*\n([\s\S]*?)(?=###|$)/i);
    const identity = extractSection(/###\s*Dor de identidade|Dor de status\s*\n([\s\S]*?)(?=###|$)/i);
    const consequences = extractSection(/###\s*Consequências\s*\n([\s\S]*?)(?=###|$)/i);

    if (coreProb) strategy.problemDesire.coreProblem = cleanMd(coreProb);
    if (secProb) {
      const items = extractListItems(secProb);
      if (items.length) strategy.problemDesire.secondaryProblems = items;
      else strategy.problemDesire.secondaryProblems = [cleanMd(secProb)];
    }
    if (practical) strategy.problemDesire.practicalPain = cleanMd(practical);
    if (emotional) strategy.problemDesire.emotionalPain = cleanMd(emotional);
    if (financial) strategy.problemDesire.financialPain = cleanMd(financial);
    if (time) strategy.problemDesire.timePain = cleanMd(time);
    if (identity) strategy.problemDesire.identityPain = cleanMd(identity);
    if (consequences) strategy.problemDesire.consequences = cleanMd(consequences);
  }

  // 4. Medos, Crenças e Objeções
  const fearsBlock = getBlockBetweenHeaders(/##\s*(?:4\.)?\s*Medos/i);
  if (fearsBlock) {
    sectionsFound.push("Medos e Objeções");
    const fears = extractSection(/###\s*Medos\s*\n([\s\S]*?)(?=###|$)/i);
    const beliefs = extractSection(/###\s*Crenças limitantes\s*\n([\s\S]*?)(?=###|$)/i);
    const objections = extractSection(/###\s*Objeções\s*\n([\s\S]*?)(?=###|$)/i);
    const inertia = extractSection(/###\s*Motivos de inércia\s*\n([\s\S]*?)(?=###|$)/i);

    if (fears) strategy.problemDesire.deepFears = extractListItems(fears).length ? extractListItems(fears) : [cleanMd(fears)];
    if (beliefs) strategy.problemDesire.limitingBeliefs = extractListItems(beliefs).length ? extractListItems(beliefs) : [cleanMd(beliefs)];
    if (objections) strategy.problemDesire.objections = extractListItems(objections).length ? extractListItems(objections) : [cleanMd(objections)];
    if (inertia) strategy.problemDesire.inertiaReasons = cleanMd(inertia);
  }

  // 5. Desejos e Transformação (com Antes vs Depois)
  const desiresBlock = getBlockBetweenHeaders(/##\s*(?:5\.)?\s*Desejos/i);
  if (desiresBlock) {
    sectionsFound.push("Desejos e Transformação");
    const coreDes = extractSection(/###\s*Desejo central\s*\n([\s\S]*?)(?=###|$)/i);
    const practicalRes = extractSection(/###\s*Resultado prático\s*\n([\s\S]*?)(?=###|$)/i);
    const financialRes = extractSection(/###\s*Resultado financeiro\s*\n([\s\S]*?)(?=###|$)/i);
    const emotionalRes = extractSection(/###\s*Resultado emocional\s*\n([\s\S]*?)(?=###|$)/i);
    const identityRes = extractSection(/###\s*Resultado de identidade\s*\n([\s\S]*?)(?=###|$)/i);
    const beforeText = extractSection(/###\s*Antes\s*\n([\s\S]*?)(?=###|$)/i);
    const afterText = extractSection(/###\s*Depois\s*\n([\s\S]*?)(?=###|$)/i);
    const identityTrans = extractSection(/###\s*Transformação de identidade\s*\n([\s\S]*?)(?=###|$)/i);

    if (coreDes) strategy.problemDesire.coreDesire = cleanMd(coreDes);
    if (practicalRes) strategy.problemDesire.practicalResult = cleanMd(practicalRes);
    if (financialRes) strategy.problemDesire.financialResult = cleanMd(financialRes);
    if (emotionalRes) strategy.problemDesire.emotionalResult = cleanMd(emotionalRes);
    if (identityRes) strategy.problemDesire.identityResult = cleanMd(identityRes);
    if (identityTrans) strategy.problemDesire.identityTransformation = cleanMd(identityTrans);

    // Comparativo Antes vs Depois
    if (beforeText || afterText) {
      const beforeList = extractListItems(beforeText);
      const afterList = extractListItems(afterText);
      const pairsCount = Math.max(beforeList.length, afterList.length);
      const pairs: Array<{ before: string; after: string }> = [];

      for (let i = 0; i < pairsCount; i++) {
        pairs.push({
          before: beforeList[i] || cleanMd(beforeText),
          after: afterList[i] || cleanMd(afterText),
        });
      }
      if (pairs.length > 0) strategy.problemDesire.beforeAfter = pairs;
    }
  }

  // 6. Linguagem do Público
  const langBlock = getBlockBetweenHeaders(/##\s*(?:6\.)?\s*Linguagem/i);
  if (langBlock) {
    sectionsFound.push("Linguagem do Público");
    const phrases = extractSection(/###\s*Frases reais\s*\n([\s\S]*?)(?=###|$)/i);
    const words = extractSection(/###\s*Palavras recorrentes\s*\n([\s\S]*?)(?=###|$)/i);
    const questions = extractSection(/###\s*Perguntas recorrentes\s*\n([\s\S]*?)(?=###|$)/i);
    const triggers = extractSection(/###\s*Gatilhos emocionais\s*\n([\s\S]*?)(?=###|$)/i);

    if (phrases) strategy.audience.realPhrases = extractListItems(phrases).length ? extractListItems(phrases) : [cleanMd(phrases)];
    if (words) strategy.audience.recurringWords = extractListItems(words).length ? extractListItems(words) : [cleanMd(words)];
    if (questions) strategy.audience.recurringQuestions = extractListItems(questions).length ? extractListItems(questions) : [cleanMd(questions)];
    if (triggers) strategy.audience.emotionalTriggers = extractListItems(triggers).length ? extractListItems(triggers) : [cleanMd(triggers)];
  }

  // 7. Promessa (Quem -> Problema -> Mecanismo -> Promessa)
  const promiseBlock = getBlockBetweenHeaders(/##\s*(?:7\.)?\s*Promessa/i);
  if (promiseBlock) {
    sectionsFound.push("Promessa");
    const whom = extractSection(/###\s*Quem\s*\n([\s\S]*?)(?=###|$)/i);
    const prob = extractSection(/###\s*Problema\s*\n([\s\S]*?)(?=###|$)/i);
    const mech = extractSection(/###\s*Mecanismo\s*\n([\s\S]*?)(?=###|$)/i);
    const finalPromise = extractSection(/###\s*Promessa final\s*\n([\s\S]*?)(?=###|$)/i);

    if (whom) strategy.promise.forWhom = cleanMd(whom);
    if (prob) strategy.promise.problem = cleanMd(prob);
    if (mech) strategy.promise.mechanism = cleanMd(mech);
    if (finalPromise) strategy.promise.corePromise = cleanMd(finalPromise);
  }

  // 8. Método (Ponto A -> Etapas -> Ponto B)
  const methodBlock = getBlockBetweenHeaders(/##\s*(?:8\.)?\s*Método/i);
  if (methodBlock) {
    sectionsFound.push("Método");
    const name = extractSection(/###\s*Nome\s*\n([\s\S]*?)(?=###|$)/i);
    const pointA = extractSection(/###\s*Ponto A\s*\n([\s\S]*?)(?=###|$)/i);
    const pointB = extractSection(/###\s*Ponto B\s*\n([\s\S]*?)(?=###|$)/i);
    const diff = extractSection(/###\s*Diferencial\s*\n([\s\S]*?)(?=###|$)/i);
    const stepsText = extractSection(/###\s*Etapas\s*\n([\s\S]*?)(?=###|$)/i);

    if (name) strategy.method.name = cleanMd(name);
    if (pointA) strategy.method.pointA = cleanMd(pointA);
    if (pointB) strategy.method.pointB = cleanMd(pointB);
    if (diff) strategy.method.differential = cleanMd(diff);

    if (stepsText) {
      const stepItems = extractListItems(stepsText);
      if (stepItems.length > 0) {
        strategy.method.steps = stepItems.map((step, idx) => ({
          stepNumber: idx + 1,
          name: step,
          objective: `Etapa ${idx + 1} da jornada do cliente.`,
        }));
      }
    }
  }

  // 9. Posicionamento
  const posBlock = getBlockBetweenHeaders(/##\s*(?:9\.)?\s*Posicionamento/i);
  if (posBlock) {
    sectionsFound.push("Posicionamento");
    const desired = extractSection(/###\s*Percepção desejada\s*\n([\s\S]*?)(?=###|$)/i);
    const diff = extractSection(/###\s*Diferencial\s*\n([\s\S]*?)(?=###|$)/i);
    const gap = extractSection(/###\s*Lacuna de mercado\s*\n([\s\S]*?)(?=###|$)/i);
    const trans = extractSection(/###\s*Transformação\s*\n([\s\S]*?)(?=###|$)/i);

    if (desired) strategy.positioning.desiredPerception = cleanMd(desired);
    if (diff) strategy.positioning.differential = cleanMd(diff);
    if (gap) strategy.positioning.marketGap = cleanMd(gap);
    if (trans) strategy.positioning.transformation = cleanMd(trans);
  }

  // 10. Big Idea
  const bigIdeaBlock = getBlockBetweenHeaders(/##\s*(?:10\.)?\s*Big Idea/i);
  if (bigIdeaBlock) {
    sectionsFound.push("Big Idea");
    const lie = extractSection(/###\s*A mentira\s*\n([\s\S]*?)(?=###|$)/i);
    const hiddenTruth = extractSection(/###\s*A verdade oculta\s*\n([\s\S]*?)(?=###|$)/i);
    const newWay = extractSection(/###\s*O novo caminho\s*\n([\s\S]*?)(?=###|$)/i);
    const finalIdea = extractSection(/###\s*Big Idea final\s*\n([\s\S]*?)(?=###|$)/i);

    if (lie) strategy.positioning.bigIdea.lie = cleanMd(lie);
    if (hiddenTruth) strategy.positioning.bigIdea.hiddenTruth = cleanMd(hiddenTruth);
    if (newWay) strategy.positioning.bigIdea.newWay = cleanMd(newWay);
    if (finalIdea) strategy.positioning.bigIdea.finalBigIdea = cleanMd(finalIdea);
  }

  // 11. Arquétipo
  const archetypeBlock = getBlockBetweenHeaders(/##\s*(?:11\.)?\s*Arquétipo/i);
  if (archetypeBlock) {
    sectionsFound.push("Arquétipo");
    const primary = extractSection(/###\s*Principal\s*\n([\s\S]*?)(?=###|$)/i);
    const secondary = extractSection(/###\s*Secundário\s*\n([\s\S]*?)(?=###|$)/i);
    const manifests = extractSection(/###\s*Como se manifesta\s*\n([\s\S]*?)(?=###|$)/i);

    if (primary) strategy.positioning.archetype.primary = cleanMd(primary);
    if (secondary) strategy.positioning.archetype.secondary = cleanMd(secondary);
    if (manifests) strategy.positioning.archetype.howItManifests = cleanMd(manifests);
  }

  // 12. Movimento
  const movementBlock = getBlockBetweenHeaders(/##\s*(?:12\.)?\s*Movimento/i);
  if (movementBlock) {
    sectionsFound.push("Movimento");
    const idea = extractSection(/###\s*Ideia que une a comunidade\s*\n([\s\S]*?)(?=###|$)/i);
    const enemy = extractSection(/###\s*Inimigo em comum\s*\n([\s\S]*?)(?=###|$)/i);
    const belief = extractSection(/###\s*Crença central\s*\n([\s\S]*?)(?=###|$)/i);
    const mantra = extractSection(/###\s*Mantra\s*\n([\s\S]*?)(?=###|$)/i);

    if (idea) strategy.positioning.movement.unifyingIdea = cleanMd(idea);
    if (enemy) strategy.positioning.movement.commonEnemy = cleanMd(enemy);
    if (belief) strategy.positioning.movement.coreBelief = cleanMd(belief);
    if (mantra) strategy.positioning.movement.mantra = cleanMd(mantra);
  }

  // 13. Autoridade e Provas
  const authBlock = getBlockBetweenHeaders(/##\s*(?:13\.)?\s*Autoridade/i);
  if (authBlock) {
    sectionsFound.push("Autoridade");
    const exp = extractSection(/###\s*Experiência\s*\n([\s\S]*?)(?=###|$)/i);
    const results = extractSection(/###\s*Resultados\s*\n([\s\S]*?)(?=###|$)/i);
    const cases = extractSection(/###\s*Cases\s*\n([\s\S]*?)(?=###|$)/i);
    const other = extractSection(/###\s*Outros elementos de autoridade|Depoimentos\s*\n([\s\S]*?)(?=###|$)/i);

    if (exp) strategy.positioning.authority.experience = cleanMd(exp);
    if (results) strategy.positioning.authority.ownResults = cleanMd(results);
    if (cases) strategy.positioning.authority.cases = cleanMd(cases);
    if (other) {
      const proofs = extractListItems(other);
      if (proofs.length) strategy.positioning.authority.proofs = proofs;
    }
  }

  // 14. Comunicação
  const commBlock = getBlockBetweenHeaders(/##\s*(?:14\.)?\s*Comunicação/i);
  if (commBlock) {
    sectionsFound.push("Comunicação");
    const tone = extractSection(/###\s*Tom de voz\s*\n([\s\S]*?)(?=###|$)/i);
    const personality = extractSection(/###\s*Personalidade\s*\n([\s\S]*?)(?=###|$)/i);
    const dialects = extractSection(/###\s*Expressões e dialetos\s*\n([\s\S]*?)(?=###|$)/i);
    const prefWords = extractSection(/###\s*Palavras preferidas\s*\n([\s\S]*?)(?=###|$)/i);
    const forbWords = extractSection(/###\s*Palavras proibidas\s*\n([\s\S]*?)(?=###|$)/i);
    const sentence = extractSection(/###\s*Estilo de frase\s*\n([\s\S]*?)(?=###|$)/i);
    const formality = extractSection(/###\s*Formalidade\s*\n([\s\S]*?)(?=###|$)/i);
    const humor = extractSection(/###\s*Humor\s*\n([\s\S]*?)(?=###|$)/i);

    if (tone) {
      const toneTags = tone.includes("·")
        ? tone.split("·").map((t) => t.trim())
        : tone.includes(",")
        ? tone.split(",").map((t) => t.trim())
        : extractListItems(tone);
      if (toneTags.length) strategy.communication.toneOfVoice = toneTags;
      else strategy.communication.toneOfVoice = [cleanMd(tone)];
    }
    if (personality) strategy.communication.expertPersonality = cleanMd(personality);
    if (dialects) strategy.communication.expressionsAndDialects = extractListItems(dialects).length ? extractListItems(dialects) : [cleanMd(dialects)];
    if (prefWords) strategy.communication.preferredWords = extractListItems(prefWords).length ? extractListItems(prefWords) : [cleanMd(prefWords)];
    if (forbWords) strategy.communication.forbiddenWords = extractListItems(forbWords).length ? extractListItems(forbWords) : [cleanMd(forbWords)];
    if (sentence) strategy.communication.sentenceStyle = cleanMd(sentence);
    if (formality) strategy.communication.formalityLevel = cleanMd(formality);
    if (humor) strategy.communication.humor = cleanMd(humor);
  }

  // 15. Pilares de Conteúdo
  const pillarsBlock = getBlockBetweenHeaders(/##\s*(?:15\.)?\s*Pilares de Conteúdo/i);
  if (pillarsBlock) {
    sectionsFound.push("Pilares de Conteúdo");
    const pillarMatches = Array.from(pillarsBlock.matchAll(/###\s*(?:Pilar\s*\d+|[^\n]+)\s*\n([\s\S]*?)(?=###|$)/gi));
    if (pillarMatches.length > 0) {
      strategy.communication.contentPillars = pillarMatches.map((m, idx) => {
        const text = m[1].trim();
        const firstLine = text.split("\n")[0].replace(/^[-*#]\s*/, "");
        return {
          id: `pillar-${idx + 1}`,
          name: firstLine || `Pilar 0${idx + 1}`,
          objective: text.length > firstLine.length ? text.substring(firstLine.length).trim() : "Objetivo do pilar editorial.",
          themes: extractListItems(text),
        };
      });
    }
  }

  // 16. CTAs
  const ctasBlock = getBlockBetweenHeaders(/##\s*(?:16\.)?\s*CTAs/i);
  if (ctasBlock) {
    sectionsFound.push("CTAs");
    const list = extractListItems(ctasBlock);
    if (list.length) strategy.communication.ctas = list;
  }

  // 17. Perfil
  const profileBlock = getBlockBetweenHeaders(/##\s*(?:17\.)?\s*Perfil/i);
  if (profileBlock) {
    sectionsFound.push("Perfil");
    const name = extractSection(/###\s*Nome\s*\n([\s\S]*?)(?=###|$)/i);
    const bio = extractSection(/###\s*Bio\s*\n([\s\S]*?)(?=###|$)/i);
    const cta = extractSection(/###\s*CTA\s*\n([\s\S]*?)(?=###|$)/i);
    const link = extractSection(/###\s*Link\s*\n([\s\S]*?)(?=###|$)/i);

    if (name) strategy.profile.displayName = cleanMd(name);
    if (bio) strategy.profile.bio = cleanMd(bio);
    if (cta) strategy.profile.cta = cleanMd(cta);
    if (link) strategy.profile.link = cleanMd(link);
  }

  // 18. Referências
  const refBlock = getBlockBetweenHeaders(/##\s*(?:18\.)?\s*Referências/i);
  if (refBlock) {
    sectionsFound.push("Referências");
    const perfis = extractSection(/###\s*Perfis\s*\n([\s\S]*?)(?=###|$)/i);
    const concorrentes = extractSection(/###\s*Concorrentes\s*\n([\s\S]*?)(?=###|$)/i);
    const oQueGosta = extractSection(/###\s*O que gosta\s*\n([\s\S]*?)(?=###|$)/i);
    const oQueNao = extractSection(/###\s*O que não quer copiar\s*\n([\s\S]*?)(?=###|$)/i);

    const refHandles = extractListItems(perfis);
    if (refHandles.length > 0) {
      strategy.references.references = refHandles.map((h) => ({
        handle: h.startsWith("@") ? h : `@${h}`,
        whatILike: oQueGosta || "Comunicação e posicionamento de referência.",
        whatNotToCopy: oQueNao || "",
      }));
    }

    const compList = extractListItems(concorrentes);
    if (compList.length > 0) {
      strategy.references.competitors = compList.map((c) => ({
        name: c,
        notes: "Concorrente mapeado na anamnese.",
      }));
    }
  }

  // 19. Regras para IA (A IA DEVE vs A IA NÃO DEVE)
  const rulesBlock = getBlockBetweenHeaders(/##\s*(?:19\.)?\s*Regras para IA/i);
  if (rulesBlock) {
    sectionsFound.push("Regras para IA");
    const mustDo = extractSection(/###\s*A IA deve\s*\n([\s\S]*?)(?=###|$)/i);
    const mustNotDo = extractSection(/###\s*A IA não deve\s*\n([\s\S]*?)(?=###|$)/i);

    if (mustDo) {
      const items = extractListItems(mustDo);
      if (items.length) strategy.references.aiRules.mustDo = items;
    }
    if (mustNotDo) {
      const items = extractListItems(mustNotDo);
      if (items.length) strategy.references.aiRules.mustNotDo = items;
    }
  }

  // 20. Oferta
  const offerBlock = getBlockBetweenHeaders(/##\s*(?:20\.)?\s*Oferta/i);
  if (offerBlock) {
    sectionsFound.push("Oferta");
    const prod = extractSection(/###\s*Produto|serviço\s*\n([\s\S]*?)(?=###|$)/i);
    const ticket = extractSection(/###\s*Ticket\s*\n([\s\S]*?)(?=###|$)/i);
    const entreg = extractSection(/###\s*Entregáveis\s*\n([\s\S]*?)(?=###|$)/i);
    const prox = extractSection(/###\s*Próximo passo\s*\n([\s\S]*?)(?=###|$)/i);

    if (prod) strategy.offer.productOrService = cleanMd(prod);
    if (ticket) strategy.offer.ticket = cleanMd(ticket);
    if (entreg) strategy.offer.deliverables = cleanMd(entreg);
    if (prox) strategy.offer.nextStep = cleanMd(prox);
  }

  // 21. Resumo Estratégico Final
  const summaryBlock = getBlockBetweenHeaders(/##\s*(?:21\.)?\s*Resumo Estratégico/i);
  if (summaryBlock) {
    sectionsFound.push("Resumo Estratégico");
    strategy.strategicSummary = cleanMd(summaryBlock);
  }

  // Preservar documento original
  strategy.originalDocument = {
    rawMarkdown: rawText,
    importedAt: new Date().toISOString(),
    source: "Importação de Anamnese",
  };

  // Registrar histórico
  strategy.history.unshift({
    id: `import-${Date.now()}`,
    timestamp: new Date().toISOString(),
    title: "Anamnese Estratégica importada",
    author: "Importador Criafy",
    description: `Importação realizada com ${sectionsFound.length} categorias identificadas.`,
  });

  strategy.updatedAt = new Date().toISOString();

  // Contagens para relatório da importação
  const stats = {
    painsCount:
      [
        strategy.problemDesire.practicalPain,
        strategy.problemDesire.emotionalPain,
        strategy.problemDesire.financialPain,
        strategy.problemDesire.timePain,
        strategy.problemDesire.identityPain,
      ].filter(Boolean).length + (strategy.problemDesire.secondaryProblems?.length || 0),
    objectionsCount: strategy.problemDesire.objections?.length || 0,
    pillarsCount: strategy.communication.contentPillars?.length || 0,
    rulesCount:
      (strategy.references.aiRules.mustDo?.length || 0) +
      (strategy.references.aiRules.mustNotDo?.length || 0),
    phrasesCount: strategy.audience.realPhrases?.length || 0,
  };

  const expectedSections = [
    "Público",
    "Problemas e Dores",
    "Medos e Objeções",
    "Desejos e Transformação",
    "Promessa",
    "Método",
    "Posicionamento",
    "Big Idea",
    "Comunicação",
    "Pilares de Conteúdo",
    "Regras para IA",
  ];

  const missingSections = expectedSections.filter((s) => !sectionsFound.includes(s));

  return {
    success: sectionsFound.length > 0,
    strategy,
    sectionsFound,
    missingSections,
    stats,
    warnings,
  };
}

function cleanMd(text: string): string {
  if (!text) return "";
  return text
    .replace(/^[-*#]+\s*/gm, "")
    .trim();
}

function hydrateStrategyFromJson(target: CriafyStrategyData, src: any) {
  if (src.strategic_summary) target.strategicSummary = src.strategic_summary;

  if (src.audience) {
    if (src.audience.main_audience) target.audience.mainAudience = src.audience.main_audience;
    if (src.audience.typical_client) target.audience.typicalClient = src.audience.typical_client;
    if (src.audience.current_situation) target.audience.currentSituation = src.audience.current_situation;
    if (src.audience.routine) target.audience.routine = src.audience.routine;
    if (src.audience.habits) target.audience.habits = src.audience.habits;
    if (src.audience.content_consumption) target.audience.contentConsumption = src.audience.content_consumption;
  }

  if (src.problems) {
    if (src.problems.core_problem) target.problemDesire.coreProblem = src.problems.core_problem;
    if (src.problems.practical) target.problemDesire.practicalPain = src.problems.practical;
    if (src.problems.emotional) target.problemDesire.emotionalPain = src.problems.emotional;
    if (src.problems.financial) target.problemDesire.financialPain = src.problems.financial;
    if (src.problems.time) target.problemDesire.timePain = src.problems.time;
    if (src.problems.identity) target.problemDesire.identityPain = src.problems.identity;
  }

  if (src.fears && Array.isArray(src.fears.objections)) {
    target.problemDesire.objections = src.fears.objections;
  }

  if (src.desires) {
    if (src.desires.core_desire) target.problemDesire.coreDesire = src.desires.core_desire;
  }

  if (src.promise) {
    if (src.promise.for_whom) target.promise.forWhom = src.promise.for_whom;
    if (src.promise.problem) target.promise.problem = src.promise.problem;
    if (src.promise.mechanism) target.promise.mechanism = src.promise.mechanism;
    if (src.promise.core_promise) target.promise.corePromise = src.promise.core_promise;
  }

  if (src.method) {
    if (src.method.name) target.method.name = src.method.name;
    if (src.method.point_a) target.method.pointA = src.method.point_a;
    if (src.method.point_b) target.method.pointB = src.method.point_b;
  }

  if (src.big_idea) {
    if (src.big_idea.lie) target.positioning.bigIdea.lie = src.big_idea.lie;
    if (src.big_idea.hidden_truth) target.positioning.bigIdea.hiddenTruth = src.big_idea.hidden_truth;
    if (src.big_idea.new_way) target.positioning.bigIdea.newWay = src.big_idea.new_way;
    if (src.big_idea.final_big_idea) target.positioning.bigIdea.finalBigIdea = src.big_idea.final_big_idea;
  }

  if (src.archetype) {
    if (src.archetype.primary) target.positioning.archetype.primary = src.archetype.primary;
    if (src.archetype.secondary) target.positioning.archetype.secondary = src.archetype.secondary;
    if (src.archetype.manifests) target.positioning.archetype.howItManifests = src.archetype.manifests;
  }

  if (src.movement) {
    if (src.movement.mantra) target.positioning.movement.mantra = src.movement.mantra;
    if (src.movement.common_enemy) target.positioning.movement.commonEnemy = src.movement.common_enemy;
  }

  if (src.communication) {
    if (Array.isArray(src.communication.tone_of_voice)) target.communication.toneOfVoice = src.communication.tone_of_voice;
    if (src.communication.personality) target.communication.expertPersonality = src.communication.personality;
    if (Array.isArray(src.communication.expressions)) target.communication.expressionsAndDialects = src.communication.expressions;
  }

  if (Array.isArray(src.content_pillars)) {
    target.communication.contentPillars = src.content_pillars.map((p: any, idx: number) => ({
      id: `p-${idx}`,
      name: p.name || `Pilar ${idx + 1}`,
      objective: p.objective || "",
      themes: Array.isArray(p.themes) ? p.themes : [],
    }));
  }

  if (src.ai_rules) {
    if (Array.isArray(src.ai_rules.must_do)) target.references.aiRules.mustDo = src.ai_rules.must_do;
    if (Array.isArray(src.ai_rules.must_not_do)) target.references.aiRules.mustNotDo = src.ai_rules.must_not_do;
  }
}
