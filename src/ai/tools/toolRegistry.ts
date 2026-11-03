import { DynamicStructuredTool } from "@langchain/core/tools";
import { ToolDefinition, ToolExecutionContext, AgentDefinition } from "../schemas";
import { RBACEngine } from "../permissions/rbacEngine";
import { brandManualTool } from "./company/brandManualTool";
import { brandManualSearchTool } from "./company/brandManualSearchTool";
import { scoreHookTool } from "./ai/scoreHookTool";
import { beatSheetTool } from "./ai/beatSheetTool";
import { saveContentTool, createDemandTool, getInstagramMetricsTool } from "./criafy/criafyTools";
import { crmGetLeadTool, crmMoveLeadTool, crmCreateNoteTool } from "./crm/crmTools";

/**
 * Catálogo Consolidado de Ferramentas (Tools) da Central de IA.
 * Cada ferramenta possui escopo RBAC estrito, schema Zod e documentação funcional.
 */
export const ALL_TOOLS: ToolDefinition[] = [
  brandManualSearchTool,
  brandManualTool,
  scoreHookTool,
  beatSheetTool,
  saveContentTool,
  createDemandTool,
  getInstagramMetricsTool,
  crmGetLeadTool,
  crmMoveLeadTool,
  crmCreateNoteTool,
];

export const ToolRegistry: Record<string, ToolDefinition> = {};

// Registrar ferramentas no catálogo
ALL_TOOLS.forEach((t) => {
  ToolRegistry[t.name] = t;
});

export function registerTool(tool: ToolDefinition): void {
  ToolRegistry[tool.name] = tool;
  if (!ALL_TOOLS.some((t) => t.name === tool.name)) {
    ALL_TOOLS.push(tool);
  }
}

export function getTool(name: string): ToolDefinition | undefined {
  return ToolRegistry[name];
}

export function findToolByNameOrSanitized(name: string): ToolDefinition | undefined {
  if (ToolRegistry[name]) return ToolRegistry[name];
  return ALL_TOOLS.find((t) => t.name.replace(/\./g, "_") === name || t.name === name);
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
 * Cria instâncias de DynamicStructuredTools do LangChain para um agente com RBAC.
 */
export function createLangChainToolsForAgent(
  agent: AgentDefinition,
  context: ToolExecutionContext
): DynamicStructuredTool[] {
  const allowedTools = agent.tools
    .map((toolName) => getTool(toolName))
    .filter((t): t is ToolDefinition => Boolean(t));

  return allowedTools.map((tool) => {
    return new DynamicStructuredTool({
      name: tool.name.replace(/\./g, "_"),
      description: tool.description,
      schema: tool.input_schema as any,
      func: async (input: any) => {
        try {
          return await executeTool(tool.name, input, context, agent);
        } catch (err: any) {
          return {
            is_error: true,
            message: err?.message || `Erro ao executar ferramenta ${tool.name}`,
          };
        }
      },
    });
  });
}
