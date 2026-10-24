import {
  CriafyStrategyData,
  StrategySectionId,
  SectionStatus,
} from "@/types/criafyStrategy";

export const ANAMNESE_PROMPT_TEMPLATE = `# PROMPT — ANAMNESE ESTRATÉGICA COMPLETA PARA CRIAFY
## Cole este prompt em um novo chat do ChatGPT e responda às perguntas uma por vez

Quero que você atue como um **estrategista sênior de posicionamento, público, comunicação, conteúdo e marca pessoal**.

Sua missão é me entrevistar profundamente para construir um **Diagnóstico Estratégico Completo da minha marca/perfil**, que será utilizado posteriormente como base de contexto para uma IA gerar conteúdos, roteiros, anúncios, carrosséis, Stories, Reels, legendas, ideias de pauta e campanhas.

## REGRA MAIS IMPORTANTE

NÃO me envie todas as perguntas de uma vez.

Você deverá:

1. Fazer UMA pergunta por vez.
2. Esperar minha resposta.
3. Avaliar se a resposta está clara, específica e útil.
4. Se estiver vaga, genérica ou superficial, fazer 1 a 3 perguntas de aprofundamento.
5. Só avançar quando tiver informação suficiente.
6. Sempre que necessário, me dar exemplos para eu entender a pergunta.
7. Não inventar informações.
8. Não presumir respostas que eu não dei.
9. Quando houver contradição entre respostas, me avisar e pedir esclarecimento.
10. Ao final, consolidar tudo em um documento estratégico completo em Markdown.

Se eu responder algo como:
"Meu público são empresários."

NÃO aceite isso como resposta suficiente.
Você deve aprofundar, por exemplo:
"Que tipo de empresário?"
"Eles vendem produtos, serviços ou informação?"
"Qual o tamanho médio do negócio?"
"Qual problema mais incomoda esse empresário hoje?"

Quero que a entrevista seja natural, humana e progressiva.

---

# COMO VOCÊ DEVE CONDUZIR A ENTREVISTA

Durante a entrevista:
- use linguagem simples;
- evite termos técnicos sem explicar;
- quando usar termos como "Big Idea", "arquétipo", "mecanismo", "posicionamento" ou "proposta de valor", explique antes;
- dê exemplos curtos;
- não tente parecer acadêmico;
- procure exemplos reais;
- procure frases que eu realmente usaria;
- procure detalhes de comportamento;
- procure emoções, objeções, desejos, crenças e contexto;
- diferencie fatos de hipóteses;
- se eu não souber responder, me ajude a descobrir;
- se eu disser "não sei", transforme a pergunta em perguntas menores.

Sempre que perceber uma resposta boa, você pode resumir em uma frase e pedir:
"Entendi assim: [resumo]. Está correto?"
Só depois continue.

---

# BLOCOS DE INVESTIGAÇÃO

- BLOCO 1: Contexto da Marca / Perfil (o que é, objetivo, oferta principal, momento)
- BLOCO 2: Público (público principal, cliente típico, situação atual, rotina, hábitos, consumo, compra, soluções anteriores, por que falharam)
- BLOCO 3: Problemas, Dores e Conflitos (problema central e secundários, dor prática, emocional, financeira, tempo, status, consequências)
- BLOCO 4: Medos, Crenças e Objeções (medos profundos, crenças limitantes, objeções de compra, motivos de inércia)
- BLOCO 5: Desejos e Transformação (desejo central, resultados concretos, antes e depois, transformação de identidade)
- BLOCO 6: Linguagem Real do Público (frases reais, palavras recorrentes, perguntas, gatilhos emocionais)
- BLOCO 7: Gatilhos Emocionais
- BLOCO 8: Classificação do Momento (Inconformado, Frustrado, Desenvolvido)
- BLOCO 9: Promessa (Quem, Problema, Mecanismo, Promessa consolidada)
- BLOCO 10: Método (Ponto A, Ponto B, Nome do método, Etapas estruturadas, Diferencial)
- BLOCO 11: Posicionamento (Percepção desejada, Diferencial, Lacuna, Transformação)
- BLOCO 12: Big Idea (A mentira, A verdade oculta, O novo caminho, Big Idea final)
- BLOCO 13: Arquétipo (Principal, Secundário, Como se manifesta)
- BLOCO 14: Movimento, Inimigo e Mantra (Ideia comunitária, Inimigo comum, Mantra)
- BLOCO 15: Autoridade e Provas (Resultados próprios, clientes, cases, números)
- BLOCO 16: Comunicação (Tom de voz, Personalidade do especialista, Expressões e dialetos, Palavras preferidas e proibidas, Estilo, Formalidade, Humor)
- BLOCO 17: Temas e Pilares de Conteúdo
- BLOCO 18: CTAs principais e secundários
- BLOCO 19: Perfil Instagram (Checklist, bio, destaques, fixados)
- BLOCO 20: Referências e Concorrentes
- BLOCO 21: Regras Absolutas para IA (A IA deve vs A IA não deve)
- BLOCO 22: Oferta e Conversão
- BLOCO 23: Revisão Final e Consolidação

---

# FORMATO DE SAÍDA FINAL

Ao terminar a entrevista, NÃO faça apenas um resumo curto.
Gere exatamente esta estrutura em Markdown:

\`\`\`markdown
# ANAMNESE ESTRATÉGICA COMPLETA

## 1. Contexto da Marca
### O que é
### Objetivo do perfil
### Oferta principal
### Momento atual

## 2. Público
### Público principal
### Cliente típico
### Situação atual
### Rotina
### Hábitos
### Consumo de conteúdo
### Padrões de compra
### Soluções já tentadas
### Por que falharam
### Estágio do público

## 3. Problemas e Dores
### Problema central
### Problemas secundários
### Dor prática
### Dor emocional
### Dor financeira
### Dor de tempo
### Dor de identidade/status
### Consequências

## 4. Medos, Crenças e Objeções
### Medos
### Crenças limitantes
### Objeções
### Motivos de inércia

## 5. Desejos e Transformação
### Desejo central
### Resultado prático
### Resultado financeiro
### Resultado emocional
### Resultado de identidade
### Antes
### Depois
### Transformação de identidade

## 6. Linguagem do Público
### Frases reais
### Palavras recorrentes
### Perguntas recorrentes
### Gatilhos emocionais

## 7. Promessa
### Quem
### Problema
### Mecanismo
### Promessa final

## 8. Método
### Nome
### Ponto A
### Ponto B
### Etapas
### Diferencial

## 9. Posicionamento
### Percepção desejada
### Diferencial
### Lacuna de mercado
### Transformação

## 10. Big Idea
### A mentira
### A verdade oculta
### O novo caminho
### Big Idea final

## 11. Arquétipo
### Principal
### Secundário
### Como se manifesta

## 12. Movimento
### Ideia que une a comunidade
### Inimigo em comum
### Crença central
### Mantra

## 13. Autoridade e Provas
### Experiência
### Resultados
### Cases
### Depoimentos
### Outros elementos de autoridade

## 14. Comunicação
### Tom de voz
### Personalidade
### Expressões e dialetos
### Palavras preferidas
### Palavras proibidas
### Estilo de frase
### Formalidade
### Humor

## 15. Pilares de Conteúdo
### Pilar 1
### Pilar 2
### Pilar 3
### Pilar 4
### Pilar 5

## 16. CTAs
### CTA principal
### CTAs secundários

## 17. Perfil
### Nome
### Bio
### CTA
### Link
### Destaques
### Conteúdos fixados

## 18. Referências
### Perfis
### Concorrentes
### O que gosta
### O que não quer copiar

## 19. Regras para IA
### A IA deve
### A IA não deve

## 20. Oferta
### Produto/serviço
### Ticket
### Entregáveis
### Canal de venda
### Próximo passo
### Objeções da oferta

## 21. Resumo Estratégico Final
\`\`\`

Depois do Markdown, gere também um bloco JSON seguindo esta estrutura conceitual:

\`\`\`json
{
  "brand_context": {},
  "audience": {},
  "problems": {},
  "fears": {},
  "desires": {},
  "language": {},
  "promise": {},
  "method": {},
  "positioning": {},
  "big_idea": {},
  "archetype": {},
  "movement": {},
  "authority": {},
  "communication": {},
  "content_pillars": [],
  "ctas": [],
  "profile": {},
  "references": {},
  "ai_rules": {},
  "offer": {},
  "strategic_summary": ""
}
\`\`\`

Comece agora. Faça apenas a primeira pergunta.`;

export function createEmptyStrategy(accountId: string, companyId: string): CriafyStrategyData {
  return {
    accountId,
    companyId,
    version: "v1",
    brandContext: {},
    audience: {
      realPhrases: [],
      recurringWords: [],
      recurringQuestions: [],
      emotionalTriggers: [],
    },
    problemDesire: {
      secondaryProblems: [],
      deepFears: [],
      limitingBeliefs: [],
      objections: [],
      beforeAfter: [],
    },
    promise: {
      versions: [],
    },
    method: {
      steps: [],
    },
    positioning: {
      bigIdea: {},
      archetype: {},
      movement: {},
      authority: {
        proofs: [],
      },
    },
    communication: {
      toneOfVoice: [],
      expressionsAndDialects: [],
      preferredWords: [],
      forbiddenWords: [],
      priorityThemes: [],
      forbiddenThemes: [],
      contentPillars: [],
      ctas: [],
    },
    profile: {
      checklist: {
        photo: false,
        nameWithKeyword: false,
        promiseInBio: false,
        ctaInBio: false,
        correctLink: false,
        highlightsOrganized: false,
        pinnedPostsActive: false,
      },
      highlights: [],
      pinnedPosts: [
        { slot: 1, title: "Post 01 - Venda", type: "Venda", suggestion: "Oferta direta do produto ou serviço principal." },
        { slot: 2, title: "Post 02 - Princípios", type: "Valores", suggestion: "Posicionamento, valores e por que a marca existe." },
        { slot: 3, title: "Post 03 - Descoberta", type: "Topo de Funil", suggestion: "Conteúdo magnético para novos seguidores e autoridade." },
      ],
    },
    references: {
      references: [],
      competitors: [],
      aiRules: {
        mustDo: [
          "Falar de maneira direta, didática e acessível",
          "Usar exemplos práticos e analogias do dia a dia",
          "Respeitar o tom e os pilares editoriais da conta",
        ],
        mustNotDo: [
          "Prometer resultados irreais ou garantias financeiras falsas",
          "Usar palavrões ou gírias fora da persona",
          "Inventar dados, depoimentos ou números não fornecidos",
        ],
      },
    },
    offer: {
      offerObjections: [],
    },
    history: [
      {
        id: "initial",
        timestamp: new Date().toISOString(),
        title: "Central Estratégica criada",
        author: "Sistema",
        description: "Estrutura estratégica inicial gerada para a conta.",
      },
    ],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export interface SectionCalculation {
  status: SectionStatus;
  label: string;
  fieldsFilled: number;
  totalFields: number;
  issues: string[];
}

export function calculateStrategyCompleteness(strategy: CriafyStrategyData) {
  const sections: Record<StrategySectionId, SectionCalculation> = {
    overview: {
      status: "COMPLETE",
      label: "Visão Geral",
      fieldsFilled: 1,
      totalFields: 1,
      issues: [],
    },
    audience: {
      status: "EMPTY",
      label: "01 Público",
      fieldsFilled: 0,
      totalFields: 4,
      issues: [],
    },
    problem_desire: {
      status: "EMPTY",
      label: "02 Problema & Desejo",
      fieldsFilled: 0,
      totalFields: 4,
      issues: [],
    },
    promise: {
      status: "EMPTY",
      label: "03 Promessa",
      fieldsFilled: 0,
      totalFields: 4,
      issues: [],
    },
    method: {
      status: "EMPTY",
      label: "04 Método",
      fieldsFilled: 0,
      totalFields: 4,
      issues: [],
    },
    positioning: {
      status: "EMPTY",
      label: "05 Posicionamento",
      fieldsFilled: 0,
      totalFields: 4,
      issues: [],
    },
    communication: {
      status: "EMPTY",
      label: "06 Comunicação",
      fieldsFilled: 0,
      totalFields: 4,
      issues: [],
    },
    profile: {
      status: "EMPTY",
      label: "07 Perfil",
      fieldsFilled: 0,
      totalFields: 4,
      issues: [],
    },
    references: {
      status: "EMPTY",
      label: "08 Referências",
      fieldsFilled: 0,
      totalFields: 2,
      issues: [],
    },
    original_document: {
      status: strategy.originalDocument ? "COMPLETE" : "EMPTY",
      label: "Documento original",
      fieldsFilled: strategy.originalDocument ? 1 : 0,
      totalFields: 1,
      issues: [],
    },
    history: {
      status: "COMPLETE",
      label: "Histórico",
      fieldsFilled: 1,
      totalFields: 1,
      issues: [],
    },
  };

  // 1. Audience
  let audFilled = 0;
  if (strategy.audience.mainAudience) audFilled++;
  if (strategy.audience.typicalClient) audFilled++;
  if (strategy.audience.currentSituation) audFilled++;
  if ((strategy.audience.realPhrases?.length || 0) > 0) audFilled++;
  sections.audience.fieldsFilled = audFilled;
  sections.audience.status =
    audFilled === 4 ? "COMPLETE" : audFilled > 0 ? "PARTIAL" : "EMPTY";
  if (!strategy.audience.mainAudience) {
    sections.audience.issues.push("Público principal não preenchido");
  }

  // 2. Problem & Desire
  let probFilled = 0;
  if (strategy.problemDesire.coreProblem) probFilled++;
  if (strategy.problemDesire.practicalPain || strategy.problemDesire.emotionalPain) probFilled++;
  if ((strategy.problemDesire.objections?.length || 0) > 0) probFilled++;
  if (strategy.problemDesire.coreDesire || (strategy.problemDesire.beforeAfter?.length || 0) > 0) probFilled++;
  sections.problem_desire.fieldsFilled = probFilled;
  sections.problem_desire.status =
    probFilled === 4 ? "COMPLETE" : probFilled > 0 ? "PARTIAL" : "EMPTY";
  if (!strategy.problemDesire.coreProblem) {
    sections.problem_desire.issues.push("Problema central não definido");
  }

  // 3. Promise
  let promFilled = 0;
  if (strategy.promise.forWhom) promFilled++;
  if (strategy.promise.problem) promFilled++;
  if (strategy.promise.mechanism) promFilled++;
  if (strategy.promise.corePromise) promFilled++;
  sections.promise.fieldsFilled = promFilled;
  sections.promise.status =
    promFilled === 4 ? "COMPLETE" : promFilled > 0 ? "PARTIAL" : "EMPTY";
  if (!strategy.promise.corePromise) {
    sections.promise.issues.push("Promessa principal ainda não foi formulada");
  }

  // 4. Method
  let methFilled = 0;
  if (strategy.method.name) methFilled++;
  if (strategy.method.pointA) methFilled++;
  if (strategy.method.pointB) methFilled++;
  if ((strategy.method.steps?.length || 0) > 0) methFilled++;
  sections.method.fieldsFilled = methFilled;
  sections.method.status =
    methFilled === 4 ? "COMPLETE" : methFilled > 0 ? "PARTIAL" : "EMPTY";
  if ((strategy.method.steps?.length || 0) === 0) {
    sections.method.issues.push("Nenhuma etapa do método cadastrada");
  }

  // 5. Positioning
  let posFilled = 0;
  if (strategy.positioning.desiredPerception || strategy.positioning.transformation) posFilled++;
  if (strategy.positioning.bigIdea?.finalBigIdea) posFilled++;
  if (strategy.positioning.archetype?.primary) posFilled++;
  if (strategy.positioning.movement?.mantra) posFilled++;
  sections.positioning.fieldsFilled = posFilled;
  sections.positioning.status =
    posFilled === 4 ? "COMPLETE" : posFilled > 0 ? "PARTIAL" : "EMPTY";
  if (!strategy.positioning.bigIdea?.finalBigIdea) {
    sections.positioning.issues.push("Big Idea ainda não definida");
  }

  // 6. Communication
  let comFilled = 0;
  if ((strategy.communication.toneOfVoice?.length || 0) > 0) comFilled++;
  if (strategy.communication.expertPersonality) comFilled++;
  if ((strategy.communication.expressionsAndDialects?.length || 0) > 0) comFilled++;
  if ((strategy.communication.contentPillars?.length || 0) > 0) comFilled++;
  sections.communication.fieldsFilled = comFilled;
  sections.communication.status =
    comFilled === 4 ? "COMPLETE" : comFilled > 0 ? "PARTIAL" : "EMPTY";
  if ((strategy.communication.contentPillars?.length || 0) === 0) {
    sections.communication.issues.push("Nenhum pilar de conteúdo cadastrado");
  }

  // 7. Profile
  const ch = strategy.profile.checklist;
  const chCount = [
    ch.photo,
    ch.nameWithKeyword,
    ch.promiseInBio,
    ch.ctaInBio,
    ch.correctLink,
    ch.highlightsOrganized,
    ch.pinnedPostsActive,
  ].filter(Boolean).length;
  sections.profile.fieldsFilled = chCount;
  sections.profile.totalFields = 7;
  sections.profile.status = chCount >= 5 ? "COMPLETE" : chCount > 0 ? "PARTIAL" : "EMPTY";

  // 8. References
  let refFilled = 0;
  if ((strategy.references.references?.length || 0) > 0) refFilled++;
  if (
    (strategy.references.aiRules.mustDo?.length || 0) > 0 ||
    (strategy.references.aiRules.mustNotDo?.length || 0) > 0
  ) {
    refFilled++;
  }
  sections.references.fieldsFilled = refFilled;
  sections.references.status =
    refFilled === 2 ? "COMPLETE" : refFilled > 0 ? "PARTIAL" : "EMPTY";
  if ((strategy.references.references?.length || 0) === 0) {
    sections.references.issues.push("Nenhum perfil de referência informado");
  }

  // 8 Core Areas: audience, problem_desire, promise, method, positioning, communication, profile, references
  const coreKeys: StrategySectionId[] = [
    "audience",
    "problem_desire",
    "promise",
    "method",
    "positioning",
    "communication",
    "profile",
    "references",
  ];

  let completedAreas = 0;
  let partialAreas = 0;
  const allIssues: Array<{ section: string; issue: string }> = [];

  coreKeys.forEach((key) => {
    const sec = sections[key];
    if (sec.status === "COMPLETE") completedAreas++;
    else if (sec.status === "PARTIAL") partialAreas++;

    sec.issues.forEach((issue) => {
      allIssues.push({ section: sec.label, issue });
    });
  });

  // Calculate percentage: each complete is 12.5%, partial gives 6.25%
  const percentage = Math.round(
    ((completedAreas * 1.0 + partialAreas * 0.5) / coreKeys.length) * 100
  );

  return {
    percentage: Math.min(100, Math.max(0, percentage)),
    completedAreas,
    totalAreas: coreKeys.length,
    sections,
    allIssues,
  };
}
