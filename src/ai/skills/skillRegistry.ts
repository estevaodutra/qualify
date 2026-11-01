import { SkillDefinition } from "../schemas";
import { igReelSkill } from "./ig_reel/igReelSkill";

export const PREPARED_SKILLS: SkillDefinition[] = [
  igReelSkill,
  {
    slug: "ig-carousel",
    name: "Carrossel Slide a Slide (ig-carousel)",
    description: "Roteiro slide a slide para carrosséis educativos com capa magnética e retenção até o slide final.",
    version: 1,
    category: "CONTEÚDO",
    status: "published",
    required_tools: ["company.get_brand_manual", "criafy.save_content"],
    instructions: "Gere 7 a 10 lâminas de carrossel com títulos fortes, diagramação textual limpa e chamada de salvamento.",
  },
  {
    slug: "ig-caption",
    name: "Legenda Otimizada (ig-caption)",
    description: "Copywriting de legenda com corte visual nos 125 caracteres, até 5 hashtags e CTA único.",
    version: 1,
    category: "CONTEÚDO",
    status: "published",
    required_tools: ["company.get_brand_manual"],
    instructions: "Inicie com gancho curto de 1 linha. Pule linha antes do corpo principal. Termine com CTA único.",
  },
  {
    slug: "ig-story",
    name: "Sequência de Stories & Funil de DM (ig-story)",
    description: "Estruturação de 3 a 5 stories diários com enquetes/stickers e gatilho de resposta para o direct.",
    version: 1,
    category: "CONTEÚDO",
    status: "published",
    required_tools: ["company.get_brand_manual"],
    instructions: "Gere sequência de stories com abertura por enquete ou quebra de padrão, contexto intermediário e CTA na DM.",
  },
  {
    slug: "ig-profile",
    name: "Auditoria de Perfil & Bio (ig-profile)",
    description: "Avaliação técnica da bio, foto, campo nome, destaques e proposta de valor com nota de 0 a 100.",
    version: 1,
    category: "ANÁLISE",
    status: "published",
    required_tools: ["company.get_brand_manual", "instagram.get_metrics"],
    instructions: "Analise o perfil e dê notas objetivas de 0 a 100 em clareza, autoridade, proposta de valor e conversão.",
  },
  {
    slug: "ig-viral",
    name: "Modelagem de Conteúdo Viral (ig-viral)",
    description: "Mapeia ângulos e padrões virais do nicho para modelagem estratégica sem plágio.",
    version: 1,
    category: "ESTRATÉGIA",
    status: "published",
    required_tools: ["company.get_brand_manual"],
    instructions: "Identifique padrões virais comprovados do nicho e adapte a estrutura para o método único da marca.",
  },
  {
    slug: "ig-human",
    name: "Humanizador Anti-IA (ig-human)",
    description: "Higieniza o texto removendo caracteres invisíveis, travessões excessivos e clichês robóticos de IA.",
    version: 1,
    category: "CONTEÚDO",
    status: "published",
    required_tools: [],
    instructions: "Elimine construções artificiais de IA, substitua jargões por fala natural de especialista e garanta clareza.",
  },
  {
    slug: "ig-plan",
    name: "Planejador Editorial Semanal (ig-plan)",
    description: "Definição de linhas editoriais, distribuição de formatos e equilíbrio entre atração, autoridade e conversão.",
    version: 1,
    category: "ESTRATÉGIA",
    status: "published",
    required_tools: ["company.get_brand_manual", "instagram.get_metrics"],
    instructions: "Analise o público e defina os pilares estratégicos da semana/mês com base no funil.",
  },
  {
    slug: "ig-hooks",
    name: "Laboratório de Ganchos (ig-hooks)",
    description: "Geração de variações de ganchos de alta retenção baseadas nas 26 fórmulas comprovadas.",
    version: 1,
    category: "CONTEÚDO",
    status: "published",
    required_tools: ["ai.score_hook"],
    instructions: "Crie ganchos magnéticos nos formatos de contraste, números, revelação e polêmica para os primeiros 3 segundos.",
  },
  {
    slug: "ig-dm",
    name: "Funil de Conversão via DM (ig-dm)",
    description: "Palavras-chave de automação e scripts de qualificação rápida no direct.",
    version: 1,
    category: "VENDAS",
    status: "published",
    required_tools: ["company.get_brand_manual", "crm.get_lead"],
    instructions: "Estruture fluxo de direct que recebe o lead após comentar e qualifica para agendamento comercial.",
  },
  {
    slug: "ig-comment",
    name: "Estratégia de Comentários (ig-comment)",
    description: "Respostas estratégicas em comentários que estimulam continuação da conversa e ativam o algoritmo.",
    version: 1,
    category: "CONTEÚDO",
    status: "published",
    required_tools: ["company.get_brand_manual"],
    instructions: "Responda comentários com perguntas abertas que gerem réplicas e aumentem o tempo de tela do post.",
  },
  {
    slug: "ig-repurpose",
    name: "Reciclador Multi-formato (ig-repurpose)",
    description: "Transformação de 1 conteúdo validado em múltiplos formatos complementares.",
    version: 1,
    category: "ESTRATÉGIA",
    status: "published",
    required_tools: ["company.get_brand_manual", "criafy.save_content"],
    instructions: "Desdobre uma ideia central de Reel em carrossel, post estático de tese e stories interativos.",
  },
  {
    slug: "ig-art",
    name: "Direção Criativa & Visual (ig-art)",
    description: "Recomendações de enquadramento, estética, paleta de cores e capa para publicações.",
    version: 1,
    category: "ESTRATÉGIA",
    status: "published",
    required_tools: ["company.get_brand_manual"],
    instructions: "Defina orientação visual para designers e videomakers alinhada ao Brand Manual da empresa.",
  },

  // Aliases de compatibilidade e vendas
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
