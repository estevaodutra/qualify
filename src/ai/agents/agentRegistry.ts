import { AgentDefinition, ToolExecutionContext } from "../schemas";
import { instagramAgentDefinition } from "./instagram/instagramAgent";
import { createLangChainToolsForAgent } from "../tools/toolRegistry";
import { createLangChainChatModel } from "../models/modelFactory";
import { resolveContextForAgent } from "../contexts/contextRegistry";
import { getSkill } from "../skills/skillRegistry";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export const PREPARED_AGENTS: AgentDefinition[] = [
  instagramAgentDefinition,
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
