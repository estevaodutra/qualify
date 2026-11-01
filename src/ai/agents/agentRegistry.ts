import { AgentDefinition, ToolExecutionContext, ModelProfileCode } from "../schemas";
import { createLangChainToolsForAgent } from "../tools/toolRegistry";
import { createLangChainChatModel } from "../models/modelFactory";
import { resolveContextForAgent } from "../contexts/contextRegistry";
import { getSkill } from "../skills/skillRegistry";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { QUALIFY_ORCHESTRATOR_AGENT } from "./orchestrator/orchestratorAgent";

/**
 * Catálogo de Agentes Pré-configurados no Sistema.
 * O Orquestrador Qualify é o agente central fundacional.
 */
export const PREPARED_AGENTS: AgentDefinition[] = [
  QUALIFY_ORCHESTRATOR_AGENT,
];

export const AgentRegistry: Record<string, AgentDefinition> = {};

PREPARED_AGENTS.forEach((agent) => {
  AgentRegistry[agent.slug] = agent;
});

export function registerAgent(agent: AgentDefinition): void {
  AgentRegistry[agent.slug] = agent;
  if (!PREPARED_AGENTS.some((a) => a.slug === agent.slug)) {
    PREPARED_AGENTS.push(agent);
  }
}

export function getAgent(slug: string): AgentDefinition | undefined {
  return AgentRegistry[slug];
}

export function listAgents(): AgentDefinition[] {
  return Object.values(AgentRegistry);
}

export interface AgentChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * AgentRuntime - Wrapper sobre o LangChain.
 * Prepara o modelo LangChain, associa as tools com bindTools, injeta o contexto e histórico de conversa.
 */
export async function executeAgentWithLangChain(
  agentSlug: string,
  userPrompt: string,
  context: ToolExecutionContext,
  options?: {
    apiKey?: string;
    overrideSkill?: string;
    modelProfile?: ModelProfileCode;
    chatHistory?: AgentChatMessage[];
  }
) {
  const agent = getAgent(agentSlug);
  if (!agent) {
    throw new Error(`Agente '${agentSlug}' não encontrado no registro.`);
  }

  const startTime = Date.now();

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
  const profileToUse = options?.modelProfile || agent.model_profile;
  const model = createLangChainChatModel({
    profileCode: profileToUse,
    apiKey: options?.apiKey,
  });

  // 4. Montar LangChain DynamicStructuredTools com validação RBAC da Qualify
  const lcTools = createLangChainToolsForAgent(agent, context);

  // 5. Associar as tools ao modelo LangChain nativamente
  const modelWithTools = lcTools.length > 0 ? (model as any).bindTools(lcTools) : model;

  // 6. Formatar o resumo do contexto para o System Prompt
  const brandContext = resolvedContext["company_brand_manual"];
  const contextText = brandContext?.summary_markdown
    ? brandContext.summary_markdown
    : JSON.stringify(resolvedContext, null, 2);

  // 7. Preparar System Message
  const systemPromptContent = `
${agent.system_prompt}

${skillsInstructions}

=== CONTEXTO E MANUAL DA MARCA DA EMPRESA ===
${contextText}
`.trim();

  const messages: BaseMessage[] = [
    new SystemMessage(systemPromptContent),
  ];

  // 8. Injetar histórico multi-turn se houver
  if (options?.chatHistory && options.chatHistory.length > 0) {
    for (const msg of options.chatHistory) {
      if (msg.role === "user") {
        messages.push(new HumanMessage(msg.content));
      } else if (msg.role === "assistant") {
        messages.push(new AIMessage(msg.content));
      } else if (msg.role === "system") {
        messages.push(new SystemMessage(msg.content));
      }
    }
  }

  // 9. Adicionar a mensagem humana atual
  messages.push(new HumanMessage(userPrompt));

  // 10. Invocar modelo LangChain
  const response = await modelWithTools.invoke(messages);
  const latencyMs = Date.now() - startTime;

  // 11. Extrair métricas de tokens e tool calls
  const rawMetadata = (response as any)?.response_metadata || {};
  const tokenUsage = rawMetadata.tokenUsage || (response as any)?.usage_metadata || {};
  const promptTokens = tokenUsage.promptTokens || tokenUsage.input_tokens || 0;
  const completionTokens = tokenUsage.completionTokens || tokenUsage.output_tokens || 0;
  const totalTokens = tokenUsage.totalTokens || promptTokens + completionTokens;

  // Custo estimado padrão OpenAI
  const estimatedCost = Number(((promptTokens * 0.15 + completionTokens * 0.6) / 1000000).toFixed(6));

  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  const toolCalls = (response as any)?.tool_calls || [];

  return {
    agent: agent.slug,
    agent_name: agent.name,
    content,
    response,
    context: resolvedContext,
    tools_count: lcTools.length,
    tool_calls: toolCalls,
    metrics: {
      latency_ms: latencyMs,
      tokens_total: totalTokens,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      estimated_cost: estimatedCost,
      model: rawMetadata.model_name || profileToUse,
    },
  };
}
