import { AgentDefinition, ToolExecutionContext } from "../schemas";
import { instagramAgentDefinition } from "./instagram/instagramAgent";
import { createLangChainToolsForAgent } from "../tools/toolRegistry";
import { createLangChainChatModel } from "../models/modelFactory";
import { resolveContextForAgent } from "../contexts/contextRegistry";
import { getSkill } from "../skills/skillRegistry";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export const PREPARED_AGENTS: AgentDefinition[] = [
  instagramAgentDefinition,

  // ============================================================
  // SUITE COMPLETA: 13 AGENTES DO INSTAGRAM AGENT SKILL
  // ============================================================
  {
    slug: "InstagramReelAgent",
    name: "Roteirista de Reels (ig-reel)",
    description: "Especialista em roteiros de alta retenção para Reels com 26 fórmulas de ganchos comprovadas, beat sheet a 165 WPM e chamadas de ação magnéticas.",
    status: "active",
    version: 1,
    model_profile: "CONTENT_STANDARD",
    skills: ["ig-reel"],
    tools: ["ai.score_hook", "ai.generate_beat_sheet", "company.get_brand_manual", "criafy.save_content"],
    context_providers: ["brand_manual", "account_strategy"],
    permissions: ["criafy.read", "criafy.write", "ai.use_tools"],
    system_prompt: "Você é o InstagramReelAgent, focado na criação de roteiros de Reels magnéticos. Você estrutura o conteúdo para reter o público nos primeiros 3 segundos, eliminando clichês e garantindo alta taxa de conclusão.",
  },
  {
    slug: "InstagramCarouselAgent",
    name: "Arquiteto de Carrossel (ig-carousel)",
    description: "Estruturação slide a slide de carrosséis educativos e de autoridade com foco em alto salvamento e compartilhamento.",
    status: "active",
    version: 1,
    model_profile: "CONTENT_STANDARD",
    skills: ["carousel"],
    tools: ["company.get_brand_manual", "criafy.save_content"],
    context_providers: ["brand_manual", "account_strategy"],
    permissions: ["criafy.read", "criafy.write", "ai.use_tools"],
    system_prompt: "Você é o InstagramCarouselAgent. Você constrói carrosséis com capas que forçam o arrasto, lâminas com densidade de valor e CTAs focados em salvamento e envio para amigos.",
  },
  {
    slug: "InstagramCaptionAgent",
    name: "Copywriter de Legenda (ig-caption)",
    description: "Redação de legendas persuasivas com corte visual estratégico nos primeiros 125 caracteres, ritmo dinâmico e até 5 hashtags intencionais.",
    status: "active",
    version: 1,
    model_profile: "CONTENT_STANDARD",
    skills: ["caption"],
    tools: ["company.get_brand_manual"],
    context_providers: ["brand_manual", "account_strategy"],
    permissions: ["criafy.read", "ai.use_tools"],
    system_prompt: "Você é o InstagramCaptionAgent. Você domina a arte da primeira linha de impacto antes do 'mais...', parágrafos respiráveis e chamadas de ação diretas.",
  },
  {
    slug: "InstagramStoriesAgent",
    name: "Estrategista de Stories & DM (ig-story)",
    description: "Sequências narrativas de 3 a 5 stories diários com quebra de padrão, stickers de interação e funil de conversão para o direct.",
    status: "active",
    version: 1,
    model_profile: "CONTENT_STANDARD",
    skills: ["stories-lite"],
    tools: ["company.get_brand_manual"],
    context_providers: ["brand_manual", "account_strategy"],
    permissions: ["criafy.read", "ai.use_tools"],
    system_prompt: "Você é o InstagramStoriesAgent. Seu objetivo é engajar a base existente, aumentar visualizações de stories e transformar respostas em conversas qualificadas no direct.",
  },
  {
    slug: "InstagramProfileAgent",
    name: "Auditor de Perfil & Bio (ig-profile)",
    description: "Auditoria completa do perfil com rubrica de 0 a 100 pontos: bio, foto, campo nome (@), destaques e link estratégico.",
    status: "active",
    version: 1,
    model_profile: "STRATEGY_ADVANCED",
    skills: ["profile-audit"],
    tools: ["company.get_brand_manual", "instagram.get_metrics"],
    context_providers: ["brand_manual", "instagram_account"],
    permissions: ["criafy.read", "ai.use_tools"],
    system_prompt: "Você é o InstagramProfileAgent. Você audita o perfil do Instagram identificando vazamentos de posicionamento e ajustando a proposta de valor para converter visitantes em seguidores e clientes.",
  },
  {
    slug: "InstagramViralAgent",
    name: "Modelador de Conteúdo Viral (ig-viral)",
    description: "Mapeamento e desconstrução de formatos e padrões de alto alcance no nicho para modelagem estratégica e ética.",
    status: "active",
    version: 1,
    model_profile: "STRATEGY_ADVANCED",
    skills: ["viral-modeling"],
    tools: ["company.get_brand_manual"],
    context_providers: ["brand_manual", "account_strategy"],
    permissions: ["criafy.read", "ai.use_tools"],
    system_prompt: "Você é o InstagramViralAgent. Você analisa ganchos, tensões e temas com potencial de atração orgânica em massa adaptados à autoridade da marca.",
  },
  {
    slug: "InstagramHumanizerAgent",
    name: "Humanizador Anti-IA (ig-human)",
    description: "Higienização profunda de textos: remove jargões robóticos, travessões excessivos e garante tom de conversa autêntico de especialista.",
    status: "active",
    version: 1,
    model_profile: "CONTENT_STANDARD",
    skills: ["text-humanizer"],
    tools: [],
    context_providers: ["brand_manual"],
    permissions: ["ai.use_tools"],
    system_prompt: "Você é o InstagramHumanizerAgent. Você elimina qualquer vestígio de texto gerado por IA genérica ('no vasto mundo de...', 'é crucial lembrar...', 'mergulhe conosco'), tornando a comunicação humana, direta e magnética.",
  },
  {
    slug: "InstagramPlannerAgent",
    name: "Planejador Editorial Semanal (ig-plan)",
    description: "Matriz semanal de conteúdo equilibrando os três pilares estratégicos: Atração de novos públicos, Autoridade do método e Conversão em vendas.",
    status: "active",
    version: 1,
    model_profile: "STRATEGY_ADVANCED",
    skills: ["strategic-planning"],
    tools: ["company.get_brand_manual", "instagram.get_metrics"],
    context_providers: ["brand_manual", "account_strategy", "content_history"],
    permissions: ["criafy.read", "criafy.write", "ai.use_tools"],
    system_prompt: "Você é o InstagramPlannerAgent. Você desenha a grade editorial semanal da conta garantindo consistência, variedade de formatos e foco em resultados de negócio.",
  },
  {
    slug: "InstagramHooksAgent",
    name: "Especialista em Ganchos Magnéticos (ig-hooks)",
    description: "Laboratório de aberturas de alta retenção baseado nas 26 fórmulas de copywriting comprovadas para reter atenção nos 3 primeiros segundos.",
    status: "active",
    version: 1,
    model_profile: "CONTENT_STANDARD",
    skills: ["ig-reel"],
    tools: ["ai.score_hook"],
    context_providers: ["brand_manual"],
    permissions: ["ai.use_tools"],
    system_prompt: "Você é o InstagramHooksAgent. Você produz e valida variações de ganchos agressivos, curiosos ou polêmicos para que nenhum conteúdo passe batido no feed.",
  },
  {
    slug: "InstagramDmFunnelAgent",
    name: "Arquiteto de Funil de DM (ig-dm)",
    description: "Desenvolvimento de palavras-chave para automação e scripts de qualificação rápida e humanizada no direct.",
    status: "active",
    version: 1,
    model_profile: "CONTENT_ADVANCED",
    skills: ["sales-script"],
    tools: ["company.get_brand_manual", "crm.get_lead"],
    context_providers: ["brand_manual", "crm_lead"],
    permissions: ["criafy.read", "crm.read", "ai.use_tools"],
    system_prompt: "Você é o InstagramDmFunnelAgent. Você cria o roteiro que faz a ponte entre o comentário no post ('Comente X') e a conversa consultiva no direct.",
  },
  {
    slug: "InstagramEngagementAgent",
    name: "Especialista em Comentários (ig-comment)",
    description: "Geração de respostas inteligentes e instigantes nos comentários para aumentar o tempo de tela e o engajamento algorítmico.",
    status: "active",
    version: 1,
    model_profile: "FAST_CLASSIFIER",
    skills: [],
    tools: ["company.get_brand_manual"],
    context_providers: ["brand_manual"],
    permissions: ["criafy.read", "ai.use_tools"],
    system_prompt: "Você é o InstagramEngagementAgent. Você responde comentários nos posts gerando novas conversas e incentivando mais pessoas a participarem.",
  },
  {
    slug: "InstagramRepurposerAgent",
    name: "Reciclador & Adaptador (ig-repurpose)",
    description: "Engenharia de reaproveitamento: transforma 1 ideia vencedora em 1 Reel, 1 Carrossel, 3 Posts estáticos e 1 sequência de Stories.",
    status: "active",
    version: 1,
    model_profile: "CONTENT_STANDARD",
    skills: ["strategic-planning"],
    tools: ["company.get_brand_manual", "criafy.save_content"],
    context_providers: ["brand_manual", "account_strategy"],
    permissions: ["criafy.read", "criafy.write", "ai.use_tools"],
    system_prompt: "Você é o InstagramRepurposerAgent. Você extrai o valor máximo de cada ideia excelente, distribuindo-a em múltiplos formatos complementares.",
  },
  {
    slug: "InstagramArtDirectorAgent",
    name: "Diretor Criativo & Visual (ig-art)",
    description: "Briefing visual para criativos: hierarquia de texto, enquadramentos de gravação, paleta de cores e prompts para designers.",
    status: "active",
    version: 1,
    model_profile: "CONTENT_STANDARD",
    skills: ["creative-direction"],
    tools: ["company.get_brand_manual"],
    context_providers: ["brand_manual"],
    permissions: ["criafy.read", "ai.use_tools"],
    system_prompt: "Você é o InstagramArtDirectorAgent. Você cuida da identidade estética da marca no Instagram, garantindo contraste, legibilidade no feed e sofisticação.",
  },

  // ============================================================
  // DEMAIS AGENTES DA PLATAFORMA QUALIFY
  // ============================================================
  {
    slug: "StrategistAgent",
    name: "Strategist Agent",
    description: "Estrategista de negócios e posicionamento para definição de canais e campanhas.",
    status: "draft",
    version: 1,
    model_profile: "STRATEGY_ADVANCED",
    skills: ["strategic-planning"],
    tools: ["company.get_brand_manual", "instagram.get_metrics"],
    context_providers: ["brand_manual", "account_strategy"],
    permissions: ["criafy.read", "ai.use_tools"],
    system_prompt: "Você é o StrategistAgent, responsável pelo alinhamento tático de campanhas e posicionamento de marca.",
  },
  {
    slug: "DesignerAgent",
    name: "Designer Agent",
    description: "Assistente de direção de arte, enquadramentos e assets visuais.",
    status: "draft",
    version: 1,
    model_profile: "CONTENT_STANDARD",
    skills: ["creative-direction"],
    tools: ["company.get_brand_manual"],
    context_providers: ["brand_manual"],
    permissions: ["criafy.read", "ai.use_tools"],
    system_prompt: "Você é o DesignerAgent, orientando composição visual, tipografia e ritmo de corte para criativos.",
  },
  {
    slug: "SalesAgent",
    name: "Sales Agent",
    description: "Especialista em scripts comerciais e conversão de leads.",
    status: "draft",
    version: 1,
    model_profile: "CONTENT_ADVANCED",
    skills: ["sales-script", "follow-up"],
    tools: ["crm.get_lead", "crm.move_lead", "crm.create_note"],
    context_providers: ["crm_lead", "sales_history"],
    permissions: ["crm.read", "crm.write", "ai.use_tools"],
    system_prompt: "Você é o SalesAgent, focado em vendas consultivas e negociação.",
  },
  {
    slug: "QualificationAgent",
    name: "Qualification Agent",
    description: "Triagem e qualificação inicial de leads recebidos via formulário ou WhatsApp.",
    status: "draft",
    version: 1,
    model_profile: "FAST_CLASSIFIER",
    skills: ["lead-qualification"],
    tools: ["crm.get_lead", "crm.move_lead"],
    context_providers: ["crm_lead"],
    permissions: ["crm.read", "crm.write", "ai.use_tools"],
    system_prompt: "Você é o QualificationAgent, encarregado de classificar leads de forma ágil e segura.",
  },
  {
    slug: "SupportAgent",
    name: "Support Agent",
    description: "Atendimento ao cliente e resolução de dúvidas de primeiro nível.",
    status: "draft",
    version: 1,
    model_profile: "FAST_CLASSIFIER",
    skills: [],
    tools: [],
    context_providers: ["company", "user"],
    permissions: ["ai.use_tools"],
    system_prompt: "Você é o SupportAgent, prestando atendimento resolutivo e cordial aos usuários da Qualify.",
  },
  {
    slug: "BillingAgent",
    name: "Billing Agent",
    description: "Gestão de faturamento, conciliação e dúvidas sobre cobranças.",
    status: "draft",
    version: 1,
    model_profile: "FAST_CLASSIFIER",
    skills: [],
    tools: [],
    context_providers: ["company"],
    permissions: ["billing.read"],
    system_prompt: "Você é o BillingAgent, assistente do setor financeiro.",
  },
  {
    slug: "AnalystAgent",
    name: "Analyst Agent",
    description: "Análise de métricas, conversões de funil e relatórios gerenciais.",
    status: "draft",
    version: 1,
    model_profile: "STRATEGY_ADVANCED",
    skills: [],
    tools: ["instagram.get_metrics"],
    context_providers: ["company", "content_history"],
    permissions: ["ai.use_tools"],
    system_prompt: "Você é o AnalystAgent, interpretando dados de desempenho para orientar tomadas de decisão.",
  },
];

export const AgentRegistry: Record<string, AgentDefinition> = {};

PREPARED_AGENTS.forEach((agent) => {
  AgentRegistry[agent.slug] = agent;
});

export function registerAgent(agent: AgentDefinition): void {
  AgentRegistry[agent.slug] = agent;
}

export function getAgent(slug: string): AgentDefinition | undefined {
  return AgentRegistry[slug];
}

export function listAgents(): AgentDefinition[] {
  return Object.values(AgentRegistry);
}

/**
 * AgentRuntime - Wrapper FINO sobre o LangChain.
 * IMPORTANTE (Regra #15 do Master Prompt):
 * Não reimplementa o agent loop nem a máquina de estados.
 * Apenas prepara o modelo LangChain, associa as tools com bindTools e injeta o contexto.
 */
export async function executeAgentWithLangChain(
  agentSlug: string,
  userPrompt: string,
  context: ToolExecutionContext,
  options?: {
    apiKey?: string;
    overrideSkill?: string;
  }
) {
  const agent = getAgent(agentSlug);
  if (!agent) {
    throw new Error(`Agente '${agentSlug}' não encontrado no registro.`);
  }

  // 1. Resolver contexto requisitado pelo agente
  const resolvedContext = await resolveContextForAgent(agent.context_providers, {
    company_id: context.company_id,
    account_id: context.account_id,
    user_id: context.user_id,
  });

  // 2. Resolver skills associadas
  const skillSlugs = options?.overrideSkill ? [options.overrideSkill] : agent.skills;
  const skillsInstructions = skillSlugs
    .map((s) => {
      const skillDef = getSkill(s);
      return skillDef ? `--- SKILL: ${skillDef.name} ---\n${skillDef.instructions}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  // 3. Montar LangChain Chat Model
  const model = createLangChainChatModel({
    profileCode: agent.model_profile,
    apiKey: options?.apiKey,
  });

  // 4. Montar LangChain DynamicStructuredTools com validação RBAC da Qualify
  const lcTools = createLangChainToolsForAgent(agent, context);

  // 5. Associar as tools ao modelo LangChain nativamente
  const modelWithTools = lcTools.length > 0 ? (model as any).bindTools(lcTools) : model;

  // 6. Preparar Prompt estruturado
  const systemPromptContent = `
${agent.system_prompt}

${skillsInstructions}

=== CONTEXTO DA EMPRESA E CONTA ===
${JSON.stringify(resolvedContext, null, 2)}
`.trim();

  const messages = [
    new SystemMessage(systemPromptContent),
    new HumanMessage(userPrompt),
  ];

  // 7. Invocar modelo LangChain
  const response = await modelWithTools.invoke(messages);

  return {
    agent: agent.slug,
    response,
    context: resolvedContext,
    tools_count: lcTools.length,
  };
}
