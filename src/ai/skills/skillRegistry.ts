import { SkillDefinition } from "../schemas";
import { igReelSkill } from "./ig_reel/igReelSkill";

export { igReelSkill };

export const igCarouselSkill: SkillDefinition = {
  slug: "ig-carousel",
  name: "Carrossel de Alta Conversão (ig-carousel)",
  description:
    "Estruturação de carrosséis educativos em 7 lâminas com gancho de capa irresistível, quebra de objeção no meio e CTA conclusivo no final.",
  version: 1,
  category: "CONTEÚDO",
  status: "published",
  when_to_use: "Para temas conceituais, metodologias, tutoriais ou quebra de objeções aprofundadas.",
  target_objective: "Gerar retenção por múltiplos deslizes de tela (swipes), salvamentos e compartilhamentos.",
  required_tools: ["company.get_brand_manual", "criafy.save_content"],
  instructions:
    "Estruture o carrossel em 7 lâminas: Lâmina 1 (Capa magnética de alto contraste com título provocativo), Lâmina 2 (O Erro Comum), Lâmina 3 (A Nova Perspectiva/Tese), Lâmina 4 (O Mecanismo Único), Lâmina 5 (Aplicação Prática/Passo a Passo), Lâmina 6 (Resultado Concreto), Lâmina 7 (Chamada de Ação com palavra-chave).",
};

export const igCaptionSkill: SkillDefinition = {
  slug: "ig-caption",
  name: "Legenda Magnética & Linter (ig-caption)",
  description:
    "Criação e auditoria de legendas com gancho forte na janela visível de 125 caracteres antes do '... mais', teto de até 5 hashtags, sem links inativos no corpo e foco em CTA único.",
  version: 1,
  category: "CONTEÚDO",
  status: "published",
  when_to_use: "Para acompanhar Reels, carrosséis ou publicações estáticas no feed do Instagram.",
  target_objective: "Maximizar cliques em '... mais', retenção de leitura e comentários com palavras-chave.",
  required_tools: ["instagram.lint_caption", "ai.humanize_text", "criafy.save_content"],
  instructions:
    "Gere a legenda respeitando a janela crítica de 125 caracteres na primeira frase. Jamais abra com saudações ('olá pessoal') nem hashtags. Use parágrafos curtos (1-2 linhas), insira dados concretos, posicione no máximo 5 hashtags no rodapé e encerre com 1 único CTA de conversão.",
};

export const igAuditSkill: SkillDefinition = {
  slug: "ig-audit",
  name: "Auditoria de Conteúdo & Métricas (ig-audit)",
  description:
    "Diagnóstico analítico post-mortem de publicações passadas, separando gargalos de gancho (Hold at 3s) de gargalos de perfil (Follows per Reach) e identificando outliers virais.",
  version: 1,
  category: "ANÁLISE",
  status: "published",
  when_to_use: "Quando o usuário analisa métricas anteriores, quer entender por que um post flopou ou busca replicar os padrões de seus posts mais assistidos.",
  target_objective: "Isolar a causa real de performance e orientar as próximas rodadas de produção em dados irrefutáveis.",
  required_tools: ["instagram.get_metrics", "company.get_brand_manual"],
  instructions:
    "Calcule o Outlier Multiple (views / mediana da conta), taxa de retenção nos primeiros 3 segundos (Hold at 3s) e Sends per Reach. Distinção essencial: vídeo com visualizações e sem seguidores é problema de perfil (/ig-profile); vídeo sem visualizações é problema de gancho (/ig-reel).",
};

export const igCommentSkill: SkillDefinition = {
  slug: "ig-comment",
  name: "Engajamento Estratégico em Postagens (ig-comment)",
  description:
    "Geração de comentários de alto valor para a rodada diária de engajamento em contas estratégicas (alvos, pares e clientes), aplicando os 9 tipos validados sem parecer bot.",
  version: 1,
  category: "CONTEÚDO",
  status: "published",
  when_to_use: "Durante a rotina de 20 minutos de engajamento diário em perfis de referência ou potenciais compradores.",
  target_objective: "Ganhar visibilidade no topo dos comentários de posts em alta, atraindo visitas qualificadas ao perfil.",
  required_tools: ["company.get_brand_manual", "ai.humanize_text"],
  instructions:
    "Classifique o comentário em um dos 9 tipos: 1. Adicionar dado/número, 2. Apontar o caso omisso, 3. Discordância respeitosa, 4. Estender uma linha, 5. Fazer a pergunta difícil, 6. Trazer um recibo/experiência real, 7. Correção factual, 8. Reframe de ângulo, 9. One-liner de efeito. Nunca abra com clichês ('post incrível', 'concordo plenamente') e nunca venda na primeira interação.",
};

export const igDmSkill: SkillDefinition = {
  slug: "ig-dm",
  name: "Conversão & Qualificação via Direct (ig-dm)",
  description:
    "Scripts de entrega imediata de materiais pós-gatilho de palavra-chave, condução de conversas com leads mornos e cadência de até 2 follow-ups (+4 e +10 dias) sem spam.",
  version: 1,
  category: "VENDAS",
  status: "published",
  when_to_use: "Ao interagir com pessoas que comentaram uma palavra-chave, responderam enquetes ou enviaram mensagem direta.",
  target_objective: "Iniciar diálogos qualificatórios sem barreiras e converter conversas em diagnósticos comerciais.",
  required_tools: ["crm.get_lead", "crm.move_lead", "company.search_brand_manual"],
  instructions:
    "Regra absoluta: o usuário agiu primeiro (comentou palavra-chave ou votou em enquete). Na entrega do material, envie o link/arquivo na 1ª mensagem sem exigir formulários prévios, adicione 1 linha de instrução e feche com uma pergunta aberta simples de responder. Follow-ups estritos: +4 dias trazendo valor novo; +10 dias fechando o ciclo.",
};

export const igHumanSkill: SkillDefinition = {
  slug: "ig-human",
  name: "Humanização & Anticlichê de IA (ig-human)",
  description:
    "Limpeza cirúrgica de impressões digitais de IA (caracteres invisíveis Unicode, tipografia sintética e vocabulário clichê do slop.json) para que o texto soe autêntico.",
  version: 1,
  category: "CONTEÚDO",
  status: "published",
  when_to_use: "Antes de salvar ou publicar qualquer roteiro, legenda ou carrossel gerado por IA.",
  target_objective: "Garantir human score superior a 75%, eliminando termos corporativos vazios e formatações artificiais.",
  required_tools: ["ai.detect_slop", "ai.humanize_text"],
  instructions:
    "Aplique a verificação em 3 níveis: 1. Eliminação de caracteres invisíveis (zero-width spaces, soft hyphens, BOM), 2. Normalização tipográfica (troca de em dash por vírgulas, aspas curvas por retas), 3. Remoção de expressões clichês ('no mundo de hoje', 'mergulhar', 'revolucionário', 'game-changer'). Exija variação no comprimento de frases (burstiness) e dados concretos.",
};

export const igPlanSkill: SkillDefinition = {
  slug: "ig-plan",
  name: "Planejamento Semanal Editorial (ig-plan)",
  description:
    "Montagem da esteira semanal de 3 a 5 publicações (priorizando Reels de alcance e Carrosséis de retenção), associando temas, fórmulas de ganchos e horários ideais.",
  version: 1,
  category: "ESTRATÉGIA",
  status: "published",
  when_to_use: "Semanalmente para definir o cronograma de conteúdo e abastecer o Planner da Criafy.",
  target_objective: "Manter ritmo consistente de publicações com distribuição balanceada de Prova, Ensino, Opinião, História e Oferta.",
  required_tools: ["criafy.save_content", "criafy.create_demand", "company.get_brand_manual"],
  instructions:
    "Organize a semana com 4 a 5 posts: no mínimo 3 Reels para alcance e 1 Carrossel para profundidade. Distribua as categorias sem repetir formatos em dias seguidos: 1 Prova com números, 1 a 2 de Ensino, 1 de Opinião forte, 1 de História com custo e 1 de Oferta direta. Inclua a lista diária de 20 minutos de engajamento.",
};

export const igProfileSkill: SkillDefinition = {
  slug: "ig-profile",
  name: "Otimização de Perfil & Bio Rubric (ig-profile)",
  description:
    "Auditoria e reformulação do perfil do Instagram baseada na matriz ponderada de 100 pontos (rubric.json) em 12 critérios cruciais para conversão de visitantes em seguidores.",
  version: 1,
  category: "ESTRATÉGIA",
  status: "published",
  when_to_use: "Ao avaliar contas de clientes, lançar novos perfis ou quando o alcance de Reels está alto mas os seguidores não crescem.",
  target_objective: "Elevar a nota do perfil para 85+ pontos (nível Elite), convertendo visualizações de Reels em seguidores e clientes.",
  required_tools: ["instagram.audit_profile", "company.get_brand_manual"],
  instructions:
    "Avalie os 12 pilares: 1. Campo de Nome indexável (30 chars com nicho pós '|'), 2. Linha 1 da bio (para quem é + o que muda), 3. Corpo da bio com dado de prova concreto, 4. Tríade de posts fixados (Prova, Oferta, Tese), 5. Link único de conversão, 6. Destaques alinhados a dúvidas de compra, 7. Capas legíveis, 8. Foto focada no rosto, 9. Handle limpo, 10. Conta comercial ativa, 11. Post recente, 12. Stories ativos.",
};

export const igReplySkill: SkillDefinition = {
  slug: "ig-reply",
  name: "Triagem & Respostas em Comentários (ig-reply)",
  description:
    "Gerenciamento e triagem de comentários sob os próprios posts em 6 categorias (Keyword, Lead, Substance, Question, Support, Noise), transformando dúvidas em novos Reels.",
  version: 1,
  category: "SUPORTE",
  status: "published",
  when_to_use: "Logo após postar ou no monitoramento de comentários das publicações ativas.",
  target_objective: "Responder leads na 1ª hora para alimentar o algoritmo e transformar perguntas populares em novos conteúdos.",
  required_tools: ["company.get_brand_manual", "ai.humanize_text", "criafy.create_demand"],
  instructions:
    "Classifique cada comentário nos 6 baldes: 1. KEYWORD (enviar o material prometido), 2. LEAD (responder com profundidade e abrir porta para DM), 3. SUBSTANCE (agradecer dados e aprofundar debate), 4. QUESTION (se for recorrente, sinalizar para virar um Reel de resposta com adesivo do comentário), 5. SUPPORT (resposta carinhosa curta de 3-8 palavras), 6. NOISE (ignorar ou ocultar para não dar alcance ao hater).",
};

export const igRepurposeSkill: SkillDefinition = {
  slug: "ig-repurpose",
  name: "Transmutação de Ativos Longos (ig-repurpose)",
  description:
    "Extração cirúrgica de claims, histórias, mecanismos e dados de conteúdos longos (podcasts, vídeos longos, newsletters ou reuniões) para derivar uma semana inteira de posts.",
  version: 1,
  category: "CONTEÚDO",
  status: "published",
  when_to_use: "Ao receber transcrições, vídeos longos do YouTube, episódios de podcast ou artigos que devam ser desdobrados no Instagram.",
  target_objective: "Multiplicar 1 ativo longo em 4 a 6 publicações autônomas de alto impacto sem parecer resumo genérico.",
  required_tools: ["company.get_brand_manual", "criafy.save_content"],
  instructions:
    "Não faça resumos genéricos. Extraia elementos autônomos: Claims provocativas -> viram Reels de opinião; Histórias e erros com custo -> viram Reels de storytelling; Mecanismos e listas numeradas -> viram Carrosséis educativos de 7 lâminas; Frases marcantes -> viram quadros de Stories. Varie as fórmulas de ganchos para cada dia da semana.",
};

export const igStorySkill: SkillDefinition = {
  slug: "ig-story",
  name: "Sequência Diária de Stories (ig-story)",
  description:
    "Roteirização de sequências diárias de 3 a 5 quadros focadas em profundidade, uso intencional de figurinhas (enquete, caixa de perguntas) e funil de conversão para o Direct.",
  version: 1,
  category: "CONTEÚDO",
  status: "published",
  when_to_use: "Para planejar a rotina de Stories diários ou estruturar narrativas de venda sem desgastar o feed.",
  target_objective: "Aumentar a taxa de conclusão de visualização de Stories e gerar conversas qualificadas na DM.",
  required_tools: ["company.get_brand_manual", "criafy.save_content"],
  instructions:
    "Estrutura padrão de 5 quadros: Quadro 1 (Abertura com rosto ou mão em movimento mostrando algo acontecendo hoje), Quadros 2-3 (O desenvolvimento do processo, resultado ou erro), Quadro 4 (A chamada de ação com figurinha de enquete ou caixa de perguntas), Quadro 5 (O fechamento com convite para responder no Direct). Nunca faça repost seco de posts do feed sem contexto.",
};

export const igViralSkill: SkillDefinition = {
  slug: "ig-viral",
  name: "Engenharia Reversa & Banco Viral (ig-viral)",
  description:
    "Pesquisa e auditoria de ganchos virais de concorrentes e referências, identificando padrões de alto desempenho através do cálculo de outlier multiple sobre a mediana.",
  version: 1,
  category: "ESTRATÉGIA",
  status: "published",
  when_to_use: "Em pesquisas mensais de mercado, busca de referências ou quando faltarem ideias validadas para novos roteiros.",
  target_objective: "Construir um swipe file estratégico modelando fórmulas de retenção comprovadas no nicho.",
  required_tools: ["instagram.analyze_viral_swipes", "ai.score_hook"],
  instructions:
    "Visualizações brutas não são evidência: compare as views com a mediana recente da conta. Ganchos acima de 2.5x a 3.0x a mediana representam outliers reais. Classifique a fórmula utilizada usando as 26 fórmulas de ganchos e modele o mecanismo de tensão sem copiar as palavras exatas do criador.",
};

export const leadQualificationSkill: SkillDefinition = {
  slug: "lead-qualification",
  name: "Qualificação Lógica de Leads (lead-qualification)",
  description:
    "Avaliação de prontidão de compra de leads no atendimento através de perguntas de esteira lógica, separando curiosos de compradores potenciais.",
  version: 1,
  category: "VENDAS",
  status: "published",
  when_to_use: "No primeiro contato do lead via WhatsApp ou Chat Express para classificar perfil e maturidade.",
  target_objective: "Identificar orçamento, momento, autoridade e dores reais antes de direcionar para call de vendas.",
  required_tools: ["crm.get_lead", "crm.move_lead", "crm.create_note", "company.search_brand_manual"],
  instructions: "Conduza o diálogo com condução lógica e sem pressão, aplicando os filtros de qualificação do manual e atualizando a etapa no CRM.",
};

export const inboxTriageSkill: SkillDefinition = {
  slug: "inbox-triage",
  name: "Triagem Inteligente de Inbox (inbox-triage)",
  description:
    "Reconhecimento de intenção de mensagens recebidas (suporte, dúvida de produto, agendamento ou comercial) e roteamento ágil.",
  version: 1,
  category: "SUPORTE",
  status: "published",
  when_to_use: "Ao receber novas interações de entrada nos canais conectados da empresa.",
  target_objective: "Garantir tempo de resposta imediato com direcionamento preciso e resolução de dúvidas preliminares.",
  required_tools: ["crm.get_lead", "company.search_brand_manual"],
  instructions: "Analise o sentimento e a intenção da mensagem, consulte o manual para dúvidas frequentes e encaminhe para o atendente ou pipeline correto.",
};

/**
 * Catálogo Consolidado de Skills do Ecossistema Qualify (13 Skills do Instagram + Operações).
 */
export const AVAILABLE_SKILLS: SkillDefinition[] = [
  igReelSkill,
  igCaptionSkill,
  igCarouselSkill,
  igAuditSkill,
  igCommentSkill,
  igDmSkill,
  igHumanSkill,
  igPlanSkill,
  igProfileSkill,
  igReplySkill,
  igRepurposeSkill,
  igStorySkill,
  igViralSkill,
  leadQualificationSkill,
  inboxTriageSkill,
];

/**
 * Skills ativas pré-carregadas na Central de IA.
 */
export const PREPARED_SKILLS: SkillDefinition[] = [];

export const SkillRegistry: Record<string, SkillDefinition> = {};

AVAILABLE_SKILLS.forEach((skill) => {
  SkillRegistry[skill.slug] = skill;
});

export function registerSkill(skill: SkillDefinition): void {
  SkillRegistry[skill.slug] = skill;
  if (!PREPARED_SKILLS.some((s) => s.slug === skill.slug)) {
    PREPARED_SKILLS.push(skill);
  }
}

export function getSkill(slug: string): SkillDefinition | undefined {
  return SkillRegistry[slug] || AVAILABLE_SKILLS.find((s) => s.slug === slug);
}

export function listSkills(): SkillDefinition[] {
  return Object.values(SkillRegistry);
}
