export interface ActionDefinition {
  action: string;
  skillSlug: string;
  label: string;
  category: "CONTEÚDO" | "ESTRATÉGIA" | "ANÁLISE";
  description: string;
  defaultFormat: string;
  command?: string;
}

export const ACTION_REGISTRY: Record<string, ActionDefinition> = {
  strategy_plan: {
    action: "strategy_plan",
    skillSlug: "estrategista-digital",
    label: "Planejamento Estratégico",
    category: "ESTRATÉGIA",
    description: "Analisa contexto da marca e conta para decidir o que comunicar, por que comunicar e direcionar pautas.",
    defaultFormat: "STRATEGY",
    command: "/plano",
  },
  generate_reel: {
    action: "generate_reel",
    skillSlug: "roteirista-reels",
    label: "Roteiro de Reels (26 Hooks)",
    category: "CONTEÚDO",
    description: "Criação de roteiro em vídeo curto com 26 fórmulas de ganchos, time beats e texto na tela.",
    defaultFormat: "REEL",
    command: "/reel",
  },
  generate_creative_direction: {
    action: "generate_creative_direction",
    skillSlug: "designer-criativos",
    label: "Direção Visual de Criativos",
    category: "CONTEÚDO",
    description: "Conceito visual, hierarquia, composição, direção de arte e prompts para posts, capas e carrosséis.",
    defaultFormat: "DESIGN",
    command: "/arte",
  },
  generate_carousel: {
    action: "generate_carousel",
    skillSlug: "designer-criativos",
    label: "Carrossel Slide a Slide",
    category: "CONTEÚDO",
    description: "Estrutura completa de carrossel: capa magnética, slides de retenção e CTA final.",
    defaultFormat: "CAROUSEL",
    command: "/carrossel",
  },
  generate_caption: {
    action: "generate_caption",
    skillSlug: "estrategista-digital",
    label: "Legenda Otimizada (125 chars)",
    category: "CONTEÚDO",
    description: "Copywriting de legenda com corte visual nos 125 caracteres, até 5 hashtags e CTA único.",
    defaultFormat: "CAPTION",
    command: "/legenda",
  },
  generate_stories: {
    action: "generate_stories",
    skillSlug: "estrategista-digital",
    label: "Sequência de Stories & Funil de DM",
    category: "CONTEÚDO",
    description: "Narrativa sequencial de 3 a 5 stories com enquetes/stickers e gatilho de resposta na DM.",
    defaultFormat: "STORIES",
    command: "/stories",
  },
  audit_profile: {
    action: "audit_profile",
    skillSlug: "estrategista-digital",
    label: "Auditoria de Perfil & Bio (0-100)",
    category: "ANÁLISE",
    description: "Avaliação da bio, foto, campo nome, destaques e proposta de valor com nota de 0 a 100.",
    defaultFormat: "AUDIT",
    command: "/bio",
  },
  viral_modeling: {
    action: "viral_modeling",
    skillSlug: "estrategista-digital",
    label: "Modelagem de Conteúdo Viral",
    category: "ESTRATÉGIA",
    description: "Mapeia ângulos e padrões virais do nicho para modelagem estratégica sem plágio.",
    defaultFormat: "VIRAL",
    command: "/viral",
  },
  humanize_text: {
    action: "humanize_text",
    skillSlug: "estrategista-digital",
    label: "Humanizador Anti-IA",
    category: "CONTEÚDO",
    description: "Higieniza o texto removendo caracteres invisíveis, travessões excessivos e clichês robóticos.",
    defaultFormat: "HUMANIZE",
    command: "/humanizar",
  },
};

// Mapeamento complementar de compatibilidade e comandos com barra
const ACTION_FALLBACK_MAP: Record<string, string> = {
  // Comandos slash diretos
  "/reel": "roteirista-reels",
  "/ig-reel": "roteirista-reels",
  "/carrossel": "designer-criativos",
  "/ig-carousel": "designer-criativos",
  "/carousel": "designer-criativos",
  "/legenda": "estrategista-digital",
  "/ig-caption": "estrategista-digital",
  "/caption": "estrategista-digital",
  "/stories": "estrategista-digital",
  "/ig-story": "estrategista-digital",
  "/story": "estrategista-digital",
  "/bio": "estrategista-digital",
  "/ig-profile": "estrategista-digital",
  "/profile": "estrategista-digital",
  "/auditar": "estrategista-digital",
  "/ig-audit": "estrategista-digital",
  "/viral": "estrategista-digital",
  "/ig-viral": "estrategista-digital",
  "/humanizar": "estrategista-digital",
  "/ig-human": "estrategista-digital",
  "/human": "estrategista-digital",
  "/plano": "estrategista-digital",
  "/ig-plan": "estrategista-digital",
  "/plan": "estrategista-digital",
  "/dm": "estrategista-digital",
  "/ig-dm": "estrategista-digital",
  "/comentario": "estrategista-digital",
  "/ig-comment": "estrategista-digital",

  // Aliases de funções
  plan_week: "estrategista-digital",
  strategist_chat: "estrategista-digital",
  generate_stories_lite: "estrategista-digital",
  generate_static_post: "designer-criativos",
  "reel-scriptwriter": "roteirista-reels",
  "stories-lite": "estrategista-digital",
  "carousel-writer": "designer-criativos",
  "static-post-writer": "designer-criativos",
  "editorial-planner": "estrategista-digital",
  "digital-strategist": "estrategista-digital",
};

export function resolveSkillSlugForAction(action: string): string {
  const normalized = action.toLowerCase().trim();
  if (ACTION_REGISTRY[normalized]) {
    return ACTION_REGISTRY[normalized].skillSlug;
  }
  if (ACTION_FALLBACK_MAP[normalized]) {
    return ACTION_FALLBACK_MAP[normalized];
  }
  return action;
}

export function getAllActions(): ActionDefinition[] {
  return Object.values(ACTION_REGISTRY);
}
