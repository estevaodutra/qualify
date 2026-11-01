import { AgentDefinition, ToolExecutionContext, ModelProfileCode } from "../schemas";
import { createLangChainToolsForAgent, executeTool } from "../tools/toolRegistry";
import { createLangChainChatModel } from "../models/modelFactory";
import { resolveContextForAgent } from "../contexts/contextRegistry";
import { getSkill } from "../skills/skillRegistry";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";
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

export interface ExecutedToolLog {
  tool: string;
  input: any;
  output: any;
  latency_ms: number;
}

/**
 * AgentRuntime - Wrapper sobre o LangChain com suporte a ReAct e Tool Calling Loop.
 * Prepara o modelo LangChain, associa as tools com bindTools, injeta contexto leve
 * e executa chamadas de ferramentas sob demanda (RAG / Embeddings).
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

  // 6. Resumo ultra-leve do contexto (RAG On-Demand para economizar 95% de tokens)
  const brandContext = resolvedContext["company_brand_manual"];
  const brandName = brandContext?.brand_name || "Empresa Ativa";
  const tone = brandContext?.tone_of_voice || "Profissional, pragmático e direto";
  const qCount = brandContext?.answered_questions_count || 0;

  const lightweightContext = `
=== AMBIENTE E EMPRESA (TENANT) ===
Empresa Ativa: ${brandName}
Tom de Voz: ${tone}
Manual da Marca: ${qCount} respostas e diretrizes salvas no banco vetorial de RAG.

DIRETRIZ DE ACESSO A DADOS:
- Para cumprimentos simples ("Oi", "Olá"), agradecimentos ou dúvidas operacionais da plataforma, responda prontamente sem acionar ferramentas.
- Para qualquer detalhe de posicionamento, mecanismo único, promessa, dores de público (Inconformados, Frustrados, Desenvolvidos) ou diretrizes de copy, ACIONE a ferramenta 'company_search_brand_manual' passando termos de busca claros para recuperar os blocos semânticos pertinentes via Embeddings.
`.trim();

  // 7. Preparar System Message
  const systemPromptContent = `
${agent.system_prompt}

${skillsInstructions}

${lightweightContext}
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

  // 10. Invocar modelo LangChain (Primeira passada)
  let response = await modelWithTools.invoke(messages);

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  const extractTokens = (res: any) => {
    const raw = res?.response_metadata || {};
    const usage = raw.tokenUsage || res?.usage_metadata || {};
    const pt = usage.promptTokens || usage.input_tokens || 0;
    const ct = usage.completionTokens || usage.output_tokens || 0;
    return { pt, ct };
  };

  const initialTokens = extractTokens(response);
  totalPromptTokens += initialTokens.pt;
  totalCompletionTokens += initialTokens.ct;

  const toolCalls = (response as any)?.tool_calls || [];
  const executedTools: ExecutedToolLog[] = [];

  // 11. Loop de Execução de Ferramentas (ReAct Agentic Loop)
  if (toolCalls.length > 0) {
    messages.push(response);

    for (const tc of toolCalls) {
      const toolStart = Date.now();
      const rawToolName = tc.name.replace(/_/g, ".");
      let toolOutput: any = null;

      try {
        toolOutput = await executeTool(rawToolName, tc.args, context, agent);
      } catch (err: any) {
        toolOutput = { error: err?.message || `Erro ao executar ${rawToolName}` };
      }

      const toolDuration = Date.now() - toolStart;
      executedTools.push({
        tool: rawToolName,
        input: tc.args,
        output: toolOutput,
        latency_ms: toolDuration,
      });

      messages.push(
        new ToolMessage({
          content: typeof toolOutput === "string" ? toolOutput : JSON.stringify(toolOutput),
          tool_call_id: tc.id,
        })
      );
    }

    // Segunda passada: o modelo sintetiza a resposta final munido do contexto das ferramentas
    const finalResponse = await modelWithTools.invoke(messages);
    const finalTokens = extractTokens(finalResponse);
    totalPromptTokens += finalTokens.pt;
    totalCompletionTokens += finalTokens.ct;
    response = finalResponse;
  }

  const latencyMs = Date.now() - startTime;
  const totalTokens = totalPromptTokens + totalCompletionTokens;
  const estimatedCost = Number(((totalPromptTokens * 0.15 + totalCompletionTokens * 0.6) / 1000000).toFixed(6));
  const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);

  return {
    agent: agent.slug,
    agent_name: agent.name,
    content,
    response,
    context: resolvedContext,
    tools_count: lcTools.length,
    tool_calls: toolCalls,
    executed_tools: executedTools,
    metrics: {
      latency_ms: latencyMs,
      tokens_total: totalTokens,
      prompt_tokens: totalPromptTokens,
      completion_tokens: totalCompletionTokens,
      estimated_cost: estimatedCost,
      model: (response as any)?.response_metadata?.model_name || profileToUse,
    },
  };
}
