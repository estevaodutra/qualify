export interface ActionDefinition {
  action: string;
  skillSlug: string;
  label: string;
  category: "CONTEÚDO" | "ESTRATÉGIA" | "ANÁLISE";
  description: string;
  defaultFormat: string;
}

export const ACTION_REGISTRY: Record<string, ActionDefinition> = {
  strategy_plan: {
    action: "strategy_plan",
    skillSlug: "estrategista-digital",
    label: "Planejamento Estratégico",
    category: "ESTRATÉGIA",
    description: "Analisa contexto da marca e conta para decidir o que comunicar, por que comunicar e direcionar pautas.",
    defaultFormat: "STRATEGY",
  },
  generate_reel: {
    action: "generate_reel",
    skillSlug: "roteirista-reels",
    label: "Roteiro de Reels",
    category: "CONTEÚDO",
    description: "Criação de roteiro em vídeo curto com gancho rápido, retenção e chamada para ação contextual.",
    defaultFormat: "REEL",
  },
  generate_creative_direction: {
    action: "generate_creative_direction",
    skillSlug: "designer-criativos",
    label: "Direção Visual de Criativos",
    category: "CONTEÚDO",
    description: "Conceito visual, hierarquia, composição, direção de arte e prompts para posts, capas e carrosséis.",
    defaultFormat: "DESIGN",
  },
};

// Mapeamento complementar de compatibilidade
const ACTION_FALLBACK_MAP: Record<string, string> = {
  plan_week: "estrategista-digital",
  strategist_chat: "estrategista-digital",
  generate_stories_lite: "estrategista-digital",
  generate_carousel: "designer-criativos",
  generate_static_post: "designer-criativos",
  "reel-scriptwriter": "roteirista-reels",
  "stories-lite": "estrategista-digital",
  "carousel-writer": "designer-criativos",
  "static-post-writer": "designer-criativos",
  "editorial-planner": "estrategista-digital",
  "digital-strategist": "estrategista-digital",
};

export function resolveSkillSlugForAction(action: string): string {
  if (ACTION_REGISTRY[action]) {
    return ACTION_REGISTRY[action].skillSlug;
  }
  if (ACTION_FALLBACK_MAP[action]) {
    return ACTION_FALLBACK_MAP[action];
  }
  return action;
}

export function getAllActions(): ActionDefinition[] {
  return Object.values(ACTION_REGISTRY);
}
