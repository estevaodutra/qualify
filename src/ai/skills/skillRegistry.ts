import { SkillDefinition } from "../schemas";
import { igReelSkill } from "./ig_reel/igReelSkill";

export const PREPARED_SKILLS: SkillDefinition[] = [
  igReelSkill,
  {
    slug: "stories-lite",
    name: "Sequência de Stories Diária (stories-lite)",
    description: "Estruturação rápida de 3 a 5 stories diários de bastidores, engajamento e chamada de ação.",
    version: 1,
    category: "CONTEÚDO",
    status: "published",
    required_tools: ["company.get_brand_manual", "criafy.save_content"],
    instructions: "Gere sequência de stories com abertura por enquete ou quebra de padrão, contexto intermediário e CTA na DM.",
  },
  {
    slug: "carousel",
    name: "Carrossel de Alto Salvamento (carousel)",
    description: "Roteiro slide a slide para carrosséis educativos com capa magnética e retenção até o slide final.",
    version: 1,
    category: "CONTEÚDO",
    status: "published",
    required_tools: ["company.get_brand_manual", "criafy.save_content"],
    instructions: "Gere 7 a 10 lâminas de carrossel com títulos fortes, diagramação textual limpa e chamada de salvamento.",
  },
  {
    slug: "strategic-planning",
    name: "Planejamento Estratégico de Conteúdo",
    description: "Definição de linhas editoriais, distribuição de formatos e equilíbrio entre atração, autoridade e conversão.",
    version: 1,
    category: "ESTRATÉGIA",
    status: "published",
    required_tools: ["company.get_brand_manual", "instagram.get_metrics"],
    instructions: "Analise o público e defina os pilares estratégicos da semana/mês com base no funil.",
  },
  {
    slug: "creative-direction",
    name: "Direção Criativa e Visual",
    description: "Recomendações de enquadramento, estética, paleta de cores e capa para publicações.",
    version: 1,
    category: "ESTRATÉGIA",
    status: "published",
    required_tools: ["company.get_brand_manual"],
    instructions: "Defina orientação visual para designers e videomakers alinhada ao Brand Manual da empresa.",
  },
  {
    slug: "sales-script",
    name: "Script de Vendas Consultiva",
    description: "Estrutura de abordagem e contorno de objeções para fechamento de contratos.",
    version: 1,
    category: "VENDAS",
    status: "published",
    required_tools: ["crm.get_lead", "crm.create_note"],
    instructions: "Elabore roteiros de vendas consultiva com foco nas dores reais do lead.",
  },
  {
    slug: "lead-qualification",
    name: "Qualificação de Leads",
    description: "Análise de perfil, fit de compra e atribuição de pontuação (lead scoring).",
    version: 1,
    category: "VENDAS",
    status: "published",
    required_tools: ["crm.get_lead", "crm.move_lead"],
    instructions: "Analise as respostas e histórico do lead para atribuir a pontuação de qualificação correta.",
  },
  {
    slug: "follow-up",
    name: "Follow-up Estratégico",
    description: "Mensagens de reengajamento personalizadas para leads que esfriaram no funil.",
    version: 1,
    category: "VENDAS",
    status: "published",
    required_tools: ["crm.get_lead", "crm.create_note"],
    instructions: "Gere mensagens de follow-up que agregam valor sem parecer desespero comercial.",
  },
];

export const SkillRegistry: Record<string, SkillDefinition> = {};

PREPARED_SKILLS.forEach((skill) => {
  SkillRegistry[skill.slug] = skill;
});

export function registerSkill(skill: SkillDefinition): void {
  SkillRegistry[skill.slug] = skill;
}

export function getSkill(slug: string): SkillDefinition | undefined {
  return SkillRegistry[slug];
}

export function listSkills(): SkillDefinition[] {
  return Object.values(SkillRegistry);
}
