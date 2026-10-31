import { ToolDefinition, AgentDefinition, ToolExecutionContext } from "../schemas";

export class SecurityError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "SecurityError";
  }
}

export const RBACEngine = {
  /**
   * Valida se um Agent possui permissão configurada para invocar uma Tool específica.
   * Evita que o Agent use tools críticas de outros módulos (ex: InstagramAgent chamando billing.refund).
   */
  validateAgentCanUseTool(agent: AgentDefinition, toolName: string): boolean {
    const isAllowed = agent.tools.includes(toolName) || agent.tools.includes("*");
    if (!isAllowed) {
      throw new SecurityError(
        `O Agente '${agent.name}' (${agent.slug}) não tem permissão para acessar a ferramenta '${toolName}'.`,
        "AGENT_TOOL_ACCESS_DENIED"
      );
    }
    return true;
  },

  /**
   * Valida se o usuário ou contexto de execução possui a permissão requerida pela Tool.
   */
  validateUserPermission(
    tool: ToolDefinition,
    context: ToolExecutionContext,
    agent?: AgentDefinition
  ): boolean {
    if (!tool.permission || tool.permission === "public") {
      return true;
    }

    const userPerms = context.permissions;
    const isBasicAiTool = tool.permission === "ai.use_tools";

    // Se o usuário passou permissões explícitas, valida se possui a permissão
    if (userPerms && userPerms.length > 0) {
      const isSuperAdmin = userPerms.includes("superadmin") || userPerms.includes("*");
      const hasSpecificPerm = userPerms.includes(tool.permission);
      if (!isSuperAdmin && !hasSpecificPerm && !isBasicAiTool) {
        throw new SecurityError(
          `Permissão insuficiente para executar '${tool.name}'. Requer: '${tool.permission}'.`,
          "USER_PERMISSION_DENIED"
        );
      }
      return true;
    }

    // Se está sendo executado por um Agente registrado, verifica as permissões delegadas ao Agente
    if (agent) {
      const agentAllowed =
        agent.permissions.includes(tool.permission) ||
        agent.permissions.includes("*") ||
        isBasicAiTool;

      if (!agentAllowed) {
        throw new SecurityError(
          `O Agente '${agent.name}' não possui a permissão delegada '${tool.permission}' para executar '${tool.name}'.`,
          "AGENT_PERMISSION_DENIED"
        );
      }
      return true;
    }

    // Se for tool básica de IA, permite para membros autenticados
    if (isBasicAiTool) {
      return true;
    }

    throw new SecurityError(
      `Permissão insuficiente para executar '${tool.name}'. Requer: '${tool.permission}'.`,
      "USER_PERMISSION_DENIED"
    );
  },

  /**
   * Garante isolamento estrito de Multi-Tenancy (company_id).
   */
  validateTenantIsolation(contextCompanyId?: string, targetCompanyId?: string): boolean {
    if (!contextCompanyId) {
      throw new SecurityError(
        "Execução agêntica rejeitada: 'company_id' obrigatório no contexto.",
        "MISSING_TENANT_ID"
      );
    }

    if (targetCompanyId && targetCompanyId !== contextCompanyId) {
      throw new SecurityError(
        `Violação de isolamento multi-tenant detectada: contexto (${contextCompanyId}) tentou acessar dados de (${targetCompanyId}).`,
        "CROSS_TENANT_VIOLATION"
      );
    }

    return true;
  },

  /**
   * Pipeline de verificação completo antes da execução de qualquer Tool.
   * Agent -> Tool -> Permission -> User -> Company scope -> Execute
   */
  verifyToolExecution(
    tool: ToolDefinition,
    context: ToolExecutionContext,
    agent?: AgentDefinition
  ): void {
    // 1. Tenant Check
    this.validateTenantIsolation(context.company_id);

    // 2. Agent Access Check
    if (agent) {
      this.validateAgentCanUseTool(agent, tool.name);
    }

    // 3. RBAC User / Agent Permission Check
    this.validateUserPermission(tool, context, agent);
  },
};
