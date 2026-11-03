/**
 * profileRubric.ts
 * Matriz para auditar o perfil do Instagram (pontuação máxima: 100).
 */

export interface LegacyProfileRubricItem {
  id: string;
  category: "IDENTIDADE" | "BIO" | "CONVERSÃO" | "CONTEÚDO";
  name: string;
  points: number;
  criteria: string;
  fix: string;
}

export const PROFILE_RUBRIC: LegacyProfileRubricItem[] = [
  {
    id: "handle",
    category: "IDENTIDADE",
    name: "Nome de Usuário (@handle)",
    points: 10,
    criteria: "Simples, fácil de memorizar, sem excesso de números, pontos ou underlines repetidos.",
    fix: "Remova caracteres especiais supérfluos e adote um nome direto e reconhecível."
  },
  {
    id: "name_field",
    category: "IDENTIDADE",
    name: "Campo Nome (SEO da Busca)",
    points: 10,
    criteria: "Contém a profissão ou palavra-chave buscada pelo cliente além do nome pessoal.",
    fix: "Adicione seu nicho ou função no campo Nome (ex: 'Seu Nome | Gestão de Tráfego B2B')."
  },
  {
    id: "photo",
    category: "IDENTIDADE",
    name: "Foto de Perfil",
    points: 10,
    criteria: "Rosto iluminado, fundo contrastante, sem ruídos visuais, olhar para a câmera ou logo nítida.",
    fix: "Use uma foto profissional com iluminação frontal e fundo contrastante."
  },
  {
    id: "who_for",
    category: "BIO",
    name: "Para Quem É (ICP)",
    points: 10,
    criteria: "A primeira linha diz imediatamente para quem a conta foi feita.",
    fix: "Especifique o público exato nos primeiros 5 segundos de leitura da bio."
  },
  {
    id: "value_prop",
    category: "BIO",
    name: "Proposta de Valor / Transformação",
    points: 10,
    criteria: "Diz o que o cliente conquista ou resolve (sem frases motivacionais genéricas).",
    fix: "Substitua frases abstratas pelo benefício concreto do seu método ou produto."
  },
  {
    id: "proof",
    category: "BIO",
    name: "Autoridade / Prova Concreta",
    points: 10,
    criteria: "Número verificável (clientes atendidos, faturamento gerado, anos de atuação, alunos).",
    fix: "Inclua um número real que comprove sua experiência ou resultado dos clientes."
  },
  {
    id: "cta",
    category: "CONVERSÃO",
    name: "Chamada para Ação (CTA na Bio)",
    points: 10,
    criteria: "Instrui exatamente onde clicar ou qual palavra mandar na DM.",
    fix: "Adicione uma linha final apontando para o link (ex: 'Receba o diagnóstico abaixo 👇')."
  },
  {
    id: "link",
    category: "CONVERSÃO",
    name: "Link da Bio Direto",
    points: 10,
    criteria: "Leva diretamente para a ação principal sem árvores de links confusas com 10 opções.",
    fix: "Mantenha no máximo 1 ou 2 botões principais na sua página de destino."
  },
  {
    id: "highlights",
    category: "CONVERSÃO",
    name: "Destaques Estruturados",
    points: 10,
    criteria: "Destaques cobrem Comece Aqui, Método/Serviços, Depoimentos e Resultados.",
    fix: "Organize 4 a 5 pastas de destaques com capas limpas e títulos de 1 palavra."
  },
  {
    id: "pinned_posts",
    category: "CONTEÚDO",
    name: "3 Posts Fixados",
    points: 10,
    criteria: "Fixados cobrem: 1. Quem sou/Método, 2. Estudo de caso/Maior prova, 3. Oferta/Como contratar.",
    fix: "Fixe no topo exatamente os 3 posts que vendem e geram autoridade imediata."
  }
];

export function calculateProfileScore(checkedIds: string[]): {
  score: number;
  missingItems: LegacyProfileRubricItem[];
  achievedItems: LegacyProfileRubricItem[];
} {
  const achievedItems = PROFILE_RUBRIC.filter((item) => checkedIds.includes(item.id));
  const missingItems = PROFILE_RUBRIC.filter((item) => !checkedIds.includes(item.id));
  const score = achievedItems.reduce((acc, item) => acc + item.points, 0);

  return { score, missingItems, achievedItems };
}

// -------------------------------------------------------------
// RUBRICA EXPANDIDA DAS 12 REGRAS DE OURO DO INSTAGRAM AGENT
// -------------------------------------------------------------
export interface ProfileRubricItem {
  id: string;
  points: number;
  title: string;
  fullMarks: string;
  commonFail: string;
}

export interface ProfileEvaluationInput {
  nameField?: string;
  handle?: string;
  bioFirstLine?: string;
  bioBody?: string;
  pinnedPostsCount?: number;
  hasSpecificPinnedStrategy?: boolean;
  linkCount?: number;
  hasDirectLandingLink?: boolean;
  highlightsCount?: number;
  highlightsThemes?: string[];
  gridHasLegibleCovers?: boolean;
  photoQualityCloseUp?: boolean;
  hasProfessionalCategoryAndContact?: boolean;
  postedInLast7Days?: boolean;
  repliedToCommentsInFirstHour?: boolean;
  hasActiveStoriesToday?: boolean;
}

export interface ProfileEvaluationResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: "ELITE" | "PRO" | "AVERAGE" | "NEEDS_OPTIMIZATION";
  items: Array<{
    id: string;
    title: string;
    pointsEarned: number;
    maxPoints: number;
    status: "PASS" | "PARTIAL" | "FAIL";
    feedback: string;
  }>;
  priorityActions: string[];
}

export const PROFILE_RUBRIC_ITEMS: ProfileRubricItem[] = [
  {
    id: "name_field",
    points: 12,
    title: "Campo de Nome (Indexável para Busca)",
    fullMarks: "O campo de nome (30 chars em negrito, além do @arroba) inclui o nome + o que você faz em palavras que as pessoas buscam no Instagram (Ex: 'Seu Nome | Gestão de Tráfego' ou 'Marca | Automações de IA'). Esse campo é indexado no motor de busca.",
    commonFail: "Apenas o nome pessoal isolado ou nome com emojis aleatórios.",
  },
  {
    id: "bio_first_line",
    points: 12,
    title: "Primeira Linha da Bio (Público & Transformação)",
    fullMarks: "Nomeia para quem é o perfil e o que muda na vida ou negócio deles, usando as palavras do cliente. Sem cargo vago, sem lista de adjetivos, sem barras divisórias genéricas.",
    commonFail: "'Empresário | Apaixonado por café | Pai de pet'.",
  },
  {
    id: "bio_body",
    points: 8,
    title: "Corpo da Bio (Prova Concreta ou Mecanismo Único)",
    fullMarks: "Os caracteres restantes carregam 1 dado de prova concreto (faturamento gerado, clientes atendidos, anos de nicho) ou a tese central, escrita em frases fluidas em vez de sopa de palavras-chave.",
    commonFail: "Espaço vazio ou lista desconexa de palavras soltas sem tese.",
  },
  {
    id: "pinned_three",
    points: 10,
    title: "Os 3 Posts Fixados Estratégicos",
    fullMarks: "3 posts fixados no topo da grade cumprindo 3 funções distintas: (1) A melhor prova/resultado de cliente, (2) A explicação mais clara da oferta/mecanismo, (3) A melhor introdução pessoal/tese de autoridade. Nunca os 3 vídeos que mais deram views por acaso.",
    commonFail: "Nenhum post fixado, ou posts aleatórios de anos atrás fixados sem intenção de funil.",
  },
  {
    id: "link",
    points: 8,
    title: "Link da Bio (Destino Único de Conversão)",
    fullMarks: "Um destino direto que cumpre exatamente o que a bio acabou de prometer (ex: formulário de qualificação, WhatsApp direto ou página de produto específica). Mais de 2 links vira menu, e menu dispersa a atenção.",
    commonFail: "Linktree com 12 botões conflitantes ou sem nenhum link ativo.",
  },
  {
    id: "highlights",
    points: 8,
    title: "Destaques Focados em Dúvidas de Compra",
    fullMarks: "4 a 6 destaques nomeados pelas perguntas que um cliente realmente faz antes de comprar: 'Preços', 'Resultados', 'Como Funciona', 'Sobre'. Capas limpas e consistentes, nada com mais de 1 ano na frente.",
    commonFail: "Destaques 'Viagens', 'Aleatórios', 'Momentos' ou 15 bolinhas sem ordem nem foco comercial.",
  },
  {
    id: "grid_legibility",
    points: 8,
    title: "Legibilidade dos Primeiros 9 Posts da Grade",
    fullMarks: "As primeiras 9 capas são legíveis no tamanho miniatura do celular e revelam sobre o que o perfil trata sem precisar clicar. Capas de Reels escolhidas de forma intencional com títulos em alto contraste.",
    commonFail: "9 capas com foto de rosto cortado no meio da fala sem nenhum texto explicativo.",
  },
  {
    id: "photo",
    points: 6,
    title: "Foto de Perfil Profissional",
    fullMarks: "Rosto preenche aproximadamente 60% do círculo que renderiza a 40 pixels. Olhos visíveis, foto tirada nos últimos 2 anos, fundo neutro ou com bom contraste.",
    commonFail: "Foto de corpo inteiro minúscula, logo ilegível ou foto no escuro com braço esticado.",
  },
  {
    id: "handle",
    points: 6,
    title: "Arroba / Handle Limpo e Pronunciável",
    fullMarks: "Fácil de ler e dizer em voz alta, sem múltiplos underscores seguidos ou números substituindo letras.",
    commonFail: "Um arroba que ninguém consegue soletrar após ouvir uma vez num podcast.",
  },
  {
    id: "category_contact",
    points: 6,
    title: "Categoria Profissional e Botões de Contato",
    fullMarks: "Conta profissional com categoria alinhada à oferta e botões de contato (WhatsApp/Email/Telefone) configurados e ativos.",
    commonFail: "Conta pessoal sem dados analíticos nem botão direto de contato.",
  },
  {
    id: "recent_activity",
    points: 10,
    title: "Atividade Recente & Respostas nos Posts",
    fullMarks: "Postou nos últimos 7 dias e respondeu aos comentários na primeira hora da postagem mais recente. Um perfil sem post recente transmite abandono.",
    commonFail: "Último post publicado há 4 semanas ou comentários de potenciais clientes sem resposta.",
  },
  {
    id: "story_presence",
    points: 6,
    title: "Presença Ativa em Stories (Anel Colorido)",
    fullMarks: "Stories ativos nas últimas 24 horas. É a prova de que a empresa/especialista está ativa no dia a dia.",
    commonFail: "Sem nenhum story ativo na maioria dos dias da semana.",
  },
];

export function scoreInstagramProfile(input: ProfileEvaluationInput): ProfileEvaluationResult {
  let totalScore = 0;
  const items = [];
  const priorityActions: string[] = [];

  // 1. name_field (12 pts)
  const nameField = input.nameField?.trim() || "";
  let namePoints = 0;
  let nameStatus: "PASS" | "PARTIAL" | "FAIL" = "FAIL";
  let nameFeedback = "";

  if (nameField.length > 5 && (nameField.includes("|") || nameField.includes("-") || nameField.includes("•"))) {
    namePoints = 12;
    nameStatus = "PASS";
    nameFeedback = "Campo de nome indexável com palavras-chave de nicho.";
  } else if (nameField.length > 3) {
    namePoints = 5;
    nameStatus = "PARTIAL";
    nameFeedback = "Nome configurado, mas sem nicho/palavras-chave de busca após '|'. Você perde tráfego orgânico de pesquisa.";
    priorityActions.push("Adicione seu nicho/solução no campo de Nome (Ex: 'Seu Nome | Gestão de Tráfego').");
  } else {
    namePoints = 0;
    nameStatus = "FAIL";
    nameFeedback = "Campo de nome vazio ou genérico demais.";
    priorityActions.push("Preencha o campo de nome com sua especialidade para ser encontrado na pesquisa do Instagram.");
  }
  totalScore += namePoints;
  items.push({ id: "name_field", title: "Campo de Nome", pointsEarned: namePoints, maxPoints: 12, status: nameStatus, feedback: nameFeedback });

  // 2. bio_first_line (12 pts)
  const bio1 = input.bioFirstLine?.trim() || "";
  let b1Points = 0;
  let b1Status: "PASS" | "PARTIAL" | "FAIL" = "FAIL";
  let b1Feedback = "";
  if (bio1.length >= 15 && !bio1.includes("☕") && !/apaixonado por/i.test(bio1)) {
    b1Points = 12;
    b1Status = "PASS";
    b1Feedback = "Primeira linha clara com posicionamento e transformação de público.";
  } else if (bio1.length > 5) {
    b1Points = 6;
    b1Status = "PARTIAL";
    b1Feedback = "Linha muito curta ou com clichês de biografia.";
    priorityActions.push("Torne a 1ª linha da bio específica para o seu cliente ideal (para quem é + o que você resolve).");
  } else {
    b1Feedback = "Sem linha de impacto definindo público e transformação.";
    priorityActions.push("Crie uma primeira frase na bio com tese de impacto sem rodeios.");
  }
  totalScore += b1Points;
  items.push({ id: "bio_first_line", title: "Primeira Linha da Bio", pointsEarned: b1Points, maxPoints: 12, status: b1Status, feedback: b1Feedback });

  // 3. bio_body (8 pts)
  const bioBody = input.bioBody?.trim() || "";
  let bBodyPoints = 0;
  let bBodyStatus: "PASS" | "PARTIAL" | "FAIL" = "FAIL";
  if (/\d+|mais de|r\$|especialista|método|alunos|clientes/i.test(bioBody)) {
    bBodyPoints = 8;
    bBodyStatus = "PASS";
  } else if (bioBody.length > 10) {
    bBodyPoints = 4;
    bBodyStatus = "PARTIAL";
    priorityActions.push("Inclua um dado de prova concreto no corpo da bio (ex: '+200 projetos', '10 anos no nicho').");
  } else {
    priorityActions.push("Preencha o corpo da bio com uma prova irrefutável da sua autoridade.");
  }
  totalScore += bBodyPoints;
  items.push({
    id: "bio_body",
    title: "Corpo da Bio & Prova Concreta",
    pointsEarned: bBodyPoints,
    maxPoints: 8,
    status: bBodyStatus,
    feedback: bBodyPoints === 8 ? "Presença de dado ou mecanismo de autoridade." : "Falta número ou comprovação tangível.",
  });

  // 4. pinned_three (10 pts)
  const pinnedCount = input.pinnedPostsCount ?? 0;
  const pinnedStrat = input.hasSpecificPinnedStrategy ?? false;
  let pinPoints = 0;
  if (pinnedCount === 3 && pinnedStrat) pinPoints = 10;
  else if (pinnedCount >= 1) pinPoints = 5;
  totalScore += pinPoints;
  items.push({
    id: "pinned_three",
    title: "3 Posts Fixados Estratégicos",
    pointsEarned: pinPoints,
    maxPoints: 10,
    status: pinPoints === 10 ? "PASS" : pinPoints === 5 ? "PARTIAL" : "FAIL",
    feedback: pinPoints === 10 ? "Tríade de fixados (Prova, Oferta, Autoridade) ativa." : "Ajuste os 3 posts fixados para cobrirem: Resultado de cliente, Oferta detalhada e Sua tese.",
  });
  if (pinPoints < 10) priorityActions.push("Fixe 3 posts estratégicos: 1 de Prova/Case, 1 de Explicação da Oferta e 1 da sua Tese.");

  // 5. link (8 pts)
  const linkCount = input.linkCount ?? 1;
  const directLanding = input.hasDirectLandingLink ?? true;
  let linkPoints = 0;
  if (linkCount === 1 && directLanding) linkPoints = 8;
  else if (linkCount <= 2) linkPoints = 5;
  else linkPoints = 2;
  totalScore += linkPoints;
  items.push({
    id: "link",
    title: "Link da Bio (Funil Direto)",
    pointsEarned: linkPoints,
    maxPoints: 8,
    status: linkPoints === 8 ? "PASS" : "PARTIAL",
    feedback: linkPoints === 8 ? "Link único e direto para a oferta/WhatsApp." : "Excesso de links ou página confusa. Prefira 1 link direto para o canal de conversão.",
  });

  // 6. highlights (8 pts)
  const highlightsCount = input.highlightsCount ?? 0;
  let hPoints = 0;
  if (highlightsCount >= 4 && highlightsCount <= 6) hPoints = 8;
  else if (highlightsCount > 0) hPoints = 4;
  totalScore += hPoints;
  items.push({
    id: "highlights",
    title: "Destaques Focados em Dúvidas de Compra",
    pointsEarned: hPoints,
    maxPoints: 8,
    status: hPoints === 8 ? "PASS" : "PARTIAL",
    feedback: hPoints === 8 ? "4 a 6 destaques essenciais respondendo às objeções do comprador." : "Alinhe seus destaques com as 4 perguntas do comprador: Preços, Resultados, Como Funciona e Sobre.",
  });

  // 7. grid_legibility (8 pts)
  const gridLegible = input.gridHasLegibleCovers ?? true;
  const gridPoints = gridLegible ? 8 : 2;
  totalScore += gridPoints;
  items.push({
    id: "grid_legibility",
    title: "Legibilidade da Grade (Primeiros 9)",
    pointsEarned: gridPoints,
    maxPoints: 8,
    status: gridLegible ? "PASS" : "FAIL",
    feedback: gridLegible ? "Capas com títulos em alto contraste legíveis no celular." : "Crie capas padronizadas com tipografia grande para os 9 posts mais recentes.",
  });

  // 8. photo (6 pts)
  const photoOk = input.photoQualityCloseUp ?? true;
  const photoPoints = photoOk ? 6 : 2;
  totalScore += photoPoints;
  items.push({
    id: "photo",
    title: "Foto de Perfil",
    pointsEarned: photoPoints,
    maxPoints: 6,
    status: photoOk ? "PASS" : "PARTIAL",
    feedback: photoOk ? "Rosto em destaque, iluminação adequada e fundo limpo." : "Aproxime a foto para focar no rosto (60% do quadro) com bom contraste.",
  });

  // 9. handle (6 pts)
  const handle = input.handle || "";
  const handleClean = !handle.includes("__") && !/\d{3,}/.test(handle);
  const handlePoints = handleClean ? 6 : 3;
  totalScore += handlePoints;
  items.push({
    id: "handle",
    title: "Arroba Limpo",
    pointsEarned: handlePoints,
    maxPoints: 6,
    status: handleClean ? "PASS" : "PARTIAL",
    feedback: handleClean ? "Arroba fácil de pronunciar e memorizar." : "Evite múltiplos underlines ou sequências numéricas no arroba.",
  });

  // 10. category_contact (6 pts)
  const catOk = input.hasProfessionalCategoryAndContact ?? true;
  const catPoints = catOk ? 6 : 1;
  totalScore += catPoints;
  items.push({
    id: "category_contact",
    title: "Conta Profissional & Botões de Contato",
    pointsEarned: catPoints,
    maxPoints: 6,
    status: catOk ? "PASS" : "FAIL",
    feedback: catOk ? "Categoria comercial e botões de contato ativos." : "Ative o perfil profissional e configure o botão de WhatsApp/Email.",
  });

  // 11. recent_activity (10 pts)
  const activeRecent = input.postedInLast7Days ?? true;
  const repliesOk = input.repliedToCommentsInFirstHour ?? true;
  let actPoints = 0;
  if (activeRecent && repliesOk) actPoints = 10;
  else if (activeRecent) actPoints = 6;
  totalScore += actPoints;
  items.push({
    id: "recent_activity",
    title: "Atividade Recente & Interação em Comentários",
    pointsEarned: actPoints,
    maxPoints: 10,
    status: actPoints === 10 ? "PASS" : "PARTIAL",
    feedback: actPoints === 10 ? "Frequência ativa e respostas na 1ª hora." : "Poste semanalmente e responda aos comentários na 1ª hora para ativar o algoritmo.",
  });

  // 12. story_presence (6 pts)
  const storyActive = input.hasActiveStoriesToday ?? true;
  const storyPoints = storyActive ? 6 : 0;
  totalScore += storyPoints;
  items.push({
    id: "story_presence",
    title: "Presença Ativa em Stories",
    pointsEarned: storyPoints,
    maxPoints: 6,
    status: storyActive ? "PASS" : "FAIL",
    feedback: storyActive ? "Stories ativos no ar." : "Mantenha sequência diária de 3 a 5 stories para manter o público engajado.",
  });

  const percentage = Math.round((totalScore / 100) * 100);
  let grade: ProfileEvaluationResult["grade"] = "AVERAGE";
  if (totalScore >= 85) grade = "ELITE";
  else if (totalScore >= 70) grade = "PRO";
  else if (totalScore < 50) grade = "NEEDS_OPTIMIZATION";

  return {
    totalScore,
    maxScore: 100,
    percentage,
    grade,
    items,
    priorityActions,
  };
}
