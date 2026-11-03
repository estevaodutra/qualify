import { SkillDefinition } from "../schemas";
import { igReelSkill } from "./ig_reel/igReelSkill";

export const igCarouselSkill: SkillDefinition = {
  slug: "ig-carousel",
  name: "Carrossel de Alta Conversão (ig-carousel)",
  description:
    "Estruturação de carrosséis educativos em 7 slides com gancho de capa irresistível, quebra de objeção no meio e CTA conclusivo no final.",
  version: 1,
  category: "CONTEÚDO",
  status: "published",
  when_to_use: "Para temas conceituais, metodologias, tutoriais ou quebra de objeções aprofundadas.",
  target_objective: "Gerar retenção por múltiplos deslizes de tela (swipes), salvamentos e compartilhamentos.",
  required_tools: ["company.get_brand_manual", "criafy.save_content"],
  instructions: "Estruture o carrossel em 7 lâminas: Slide 1 (Capa magnética), Slide 2 (O Erro Comum), Slide 3 (A Nova Perspectiva/Tese), Slide 4 (Mecanismo), Slide 5 (Aplicação Prática), Slide 6 (Resultado), Slide 7 (Chamada de Ação).",
};

export const igCaptionSkill: SkillDefinition = {
  slug: "ig-caption",
  name: "Legenda Magnética e Otimizada (ig-caption)",
  description:
    "Criação de legendas com gancho forte na janela visível de 125 caracteres antes do '... mais', quebras de linha limpas e direcionamento claro de CTA.",
  version: 1,
  category: "CONTEÚDO",
  status: "published",
  when_to_use: "Para acompanhar Reels, carrosséis ou publicações estáticas no feed.",
  target_objective: "Maximizar cliques em 'mais' e comentários qualificatórios.",
  required_tools: ["company.get_brand_manual", "criafy.save_content"],
  instructions: "Gere a legenda com gancho imediato na primeira frase, parágrafos curtos de 1 a 2 linhas, sem hashtags no início e com CTA com palavra-chave no final.",
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
 * Catálogo Disponível de Skills no Ecossistema Qualify.
 */
export const AVAILABLE_SKILLS: SkillDefinition[] = [
  igReelSkill,
  igCarouselSkill,
  igCaptionSkill,
  leadQualificationSkill,
  inboxTriageSkill,
];

/**
 * Skills ativas pré-carregadas na Central de IA (inicialmente limpo no Marco Zero).
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
