import { DynamicStructuredTool } from "@langchain/core/tools";
import { ToolDefinition, ToolExecutionContext, AgentDefinition } from "../schemas";
import { RBACEngine } from "../permissions/rbacEngine";

/**
 * Catálogo de Ferramentas (Tools) da Central de IA.
 * Zerado para reconstrução individual e modular.
 */
export const ALL_TOOLS: ToolDefinition[] = [];

export const ToolRegistry: Record<string, ToolDefinition> = {};

// Registrar ferramentas no catálogo
ALL_TOOLS.forEach((t) => {
  ToolRegistry[t.name] = t;
});

export function registerTool(tool: ToolDefinition): void {
  ToolRegistry[tool.name] = tool;
}

export function getTool(name: string): ToolDefinition | undefined {
  return ToolRegistry[name];
}

export function listTools(): ToolDefinition[] {
  return Object.values(ToolRegistry);
}

/**
 * Executa uma ferramenta com validação rígida de RBAC, Multi-tenancy e rastreabilidade.
 */
export async function executeTool<TInput = any, TOutput = any>(
  toolName: string,
  input: TInput,
  context: ToolExecutionContext,
  agent?: AgentDefinition
): Promise<TOutput> {
  const tool = getTool(toolName);
  if (!tool) {
    throw new Error(`Ferramenta '${toolName}' não está registrada na central de IA.`);
  }

  // 1. Validar RBAC e Tenant Isolation
  RBACEngine.verifyToolExecution(tool, context, agent);

  // 2. Validar Input Schema Zod
  const validatedInput = tool.input_schema.parse(input);

  // 3. Executar o handler com timeout
  const timeoutMs = (tool.timeout || 30) * 1000;
  const executionPromise = tool.handler(validatedInput, context);

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout de execução na ferramenta '${toolName}' (${timeoutMs}ms excedidos).`));
    }, timeoutMs);
  });

  return Promise.race([executionPromise, timeoutPromise]) as Promise<TOutput>;
}

/**
 * Converte as Tools da Qualify para instâncias nativas do LangChain DynamicStructuredTool,
 * injetando o contexto do tenant e RBAC de forma transparente no LangChain/LangGraph.
 */
export function createLangChainToolsForAgent(
  agent: AgentDefinition,
  context: ToolExecutionContext
): DynamicStructuredTool[] {
  const allowedTools: DynamicStructuredTool[] = [];

  for (const toolName of agent.tools) {
    const toolDef = getTool(toolName);
    if (!toolDef) continue;

    const lcTool = new DynamicStructuredTool({
      name: toolDef.name.replace(/\./g, "_"), // LangChain prefere underscore em identificadores de tools
      description: toolDef.description,
      schema: toolDef.input_schema,
      func: async (input: any) => {
        const result = await executeTool(toolDef.name, input, context, agent);
        return typeof result === "string" ? result : JSON.stringify(result);
      },
    });

    allowedTools.push(lcTool);
  }

  return allowedTools;
}
