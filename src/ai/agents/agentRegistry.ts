import { AgentDefinition, ToolExecutionContext } from "../schemas";
import { createLangChainToolsForAgent } from "../tools/toolRegistry";
import { createLangChainChatModel } from "../models/modelFactory";
import { resolveContextForAgent } from "../contexts/contextRegistry";
import { getSkill } from "../skills/skillRegistry";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

/**
 * Catálogo de Agentes Pré-configurados no Sistema.
 * Zerado para reconstrução etapa por etapa a partir do repositório de referência.
 */
export const PREPARED_AGENTS: AgentDefinition[] = [];

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
 * AgentRuntime - Wrapper sobre o LangChain.
 * Prepara o modelo LangChain, associa as tools com bindTools e injeta o contexto.
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
