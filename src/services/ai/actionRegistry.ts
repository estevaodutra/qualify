export interface ActionDefinition {
  action: string;
  skillSlug: string;
  label: string;
  category: "CONTEÚDO" | "ESTRATÉGIA" | "ANÁLISE";
  description: string;
  defaultFormat: string;
}

export const ACTION_REGISTRY: Record<string, ActionDefinition> = {
  generate_reel: {
    action: "generate_reel",
    skillSlug: "reel-scriptwriter",
    label: "Roteiro de Reel",
    category: "CONTEÚDO",
    description: "Criação de roteiro completo em vídeo vertical com retenção de 3s e chamada para ação.",
    defaultFormat: "REEL",
  },
  generate_stories_lite: {
    action: "generate_stories_lite",
    skillSlug: "stories-lite",
    label: "Stories Lite",
    category: "CONTEÚDO",
    description: "Narrativas curtas e naturais de rotina conectadas ao método e produto da marca.",
    defaultFormat: "STORY",
  },
  generate_carousel: {
    action: "generate_carousel",
    skillSlug: "carousel-writer",
    label: "Carrossel Educativo",
    category: "CONTEÚDO",
    description: "Carrossel de 5 a 10 lâminas focado em retenção, quebra de crenças e salvamentos.",
    defaultFormat: "CAROUSEL",
  },
  generate_static_post: {
    action: "generate_static_post",
    skillSlug: "static-post-writer",
    label: "Post Estático",
    category: "CONTEÚDO",
    description: "Conceito visual de alta densidade e legenda persuasiva para postagem única.",
    defaultFormat: "POST",
  },
  plan_week: {
    action: "plan_week",
    skillSlug: "editorial-planner",
    label: "Planejamento Semanal",
    category: "ESTRATÉGIA",
    description: "Estruturação de grade semanal de publicações balanceadas por pilares e metas.",
    defaultFormat: "PLANNER",
  },
  strategist_chat: {
    action: "strategist_chat",
    skillSlug: "digital-strategist",
    label: "Consultoria Estratégica",
    category: "ESTRATÉGIA",
    description: "Diagnóstico de posicionamento, diferenciais de mercado e recomendações táticas.",
    defaultFormat: "STRATEGY",
  },
};

export function resolveSkillSlugForAction(action: string): string {
  if (ACTION_REGISTRY[action]) {
    return ACTION_REGISTRY[action].skillSlug;
  }
  return action; // se já for o slug da skill, repassa diretamente
}

export function getAllActions(): ActionDefinition[] {
  return Object.values(ACTION_REGISTRY);
}
