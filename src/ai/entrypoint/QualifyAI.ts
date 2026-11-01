// Polyfill para AbortSignal.throwIfAborted em ambientes que não possuem nativamente
if (typeof AbortSignal !== "undefined" && !(AbortSignal.prototype as any).throwIfAborted) {
  (AbortSignal.prototype as any).throwIfAborted = function () {
    if (this.aborted) {
      const err = new Error("This operation was aborted");
      err.name = "AbortError";
      throw err;
    }
  };
}

import { getWorkflow } from "../workflows/workflowRegistry";
import { getAgent, executeAgentWithLangChain } from "../agents/agentRegistry";
import { executeTool } from "../tools/toolRegistry";
import { ExecutionTracker } from "../observability/executionTracker";
import { RBACEngine, SecurityError } from "../permissions/rbacEngine";
import { resolveOpenAiApiKey } from "../models/modelFactory";
import {
  ToolExecutionContext,
  QualifyAIResponse,
  ScoreHookOutput,
  GenerateBeatSheetOutput,
  StrategicReelOutput,
} from "../schemas";

export interface RunWorkflowRequest {
  workflowSlug: string;
  input: {
    idea: string;
    objective?: string;
    company_id: string;
    account_id?: string;
    user_id?: string;
  };
  context?: Partial<ToolExecutionContext>;
  apiKey?: string;
  modelProfile?: string;
}

export interface RunAgentRequest {
  agentSlug: string;
  prompt: string;
  context: ToolExecutionContext;
  overrideSkill?: string;
  apiKey?: string;
}

export const QualifyAI = {
  /**
   * Executa um Workflow baseado em LangGraph StateGraph com checkpointing,
   * loop guards, multi-tenancy e observabilidade completa.
   */
  async runWorkflow<T = any>(req: RunWorkflowRequest): Promise<QualifyAIResponse<T>> {
    const { workflowSlug, input } = req;
    const companyId = input.company_id || req.context?.company_id;

    if (!companyId) {
      throw new SecurityError(
        "company_id é obrigatório para qualquer execução no QualifyAI.",
        "MISSING_TENANT"
      );
    }

    // 1. Resolver Workflow no registro
    const workflowDef = getWorkflow(workflowSlug);
    if (!workflowDef) {
      throw new Error(`Workflow '${workflowSlug}' não está registrado na Central de IA.`);
    }

    // 2. Iniciar Observabilidade
    const tracker = new ExecutionTracker({
      company_id: companyId,
      user_id: input.user_id || req.context?.user_id,
      workflow: workflowDef.slug,
      workflow_version: workflowDef.version,
      model: "gpt-4o-mini",
    });

    try {
      // 3. Compilar StateGraph LangGraph nativo com credenciais resolvidas
      const resolvedApiKey = await resolveOpenAiApiKey(req.apiKey);
      const graph = workflowDef.createGraph({
        apiKey: resolvedApiKey,
        modelProfile: req.modelProfile,
      });

      // 4. Preparar State Inicial
      const initialState = {
        company_id: companyId,
        user_id: input.user_id || req.context?.user_id,
        account_id: input.account_id || req.context?.account_id,
        run_id: tracker.trace.run_id,
        idea: input.idea,
        objective: input.objective || "Autoridade e retenção qualificada",
        errors: [],
        step_trace: [],
      };

      // 5. Executar StateGraph via LangGraph runtime
      const threadConfig = {
        configurable: {
          thread_id: tracker.trace.run_id,
        },
      };

      const resultState = await graph.invoke(initialState, threadConfig);

      // 6. Contabilizar tokens (reais da chamada OpenAI ou estimativa)
      if (resultState.tokens_used?.total_tokens > 0) {
        tracker.addTokens(
          resultState.tokens_used.input_tokens,
          resultState.tokens_used.output_tokens
        );
      } else {
        const scriptWords = resultState.script?.split(/\s+/).length || 0;
        const inputTokens = 250;
        const outputTokens = Math.max(150, scriptWords * 2);
        tracker.addTokens(inputTokens, outputTokens);
      }

      tracker.finish("success");
      await tracker.persistToDatabase(resultState);

      return {
        success: true,
        data: resultState as T,
        trace: tracker.trace,
      };
    } catch (err: any) {
      tracker.finish("error", err?.message || "Erro na execução do StateGraph LangGraph");
      await tracker.persistToDatabase({ error: err?.message });
      throw err;
    }
  },

  /**
   * Executa um Agente via LangChain, vinculando tools com validação de permissões RBAC.
   */
  async runAgent(req: RunAgentRequest): Promise<QualifyAIResponse<any>> {
    const { agentSlug, prompt, context, overrideSkill, apiKey } = req;

    RBACEngine.validateTenantIsolation(context.company_id);

    const agentDef = getAgent(agentSlug);
    if (!agentDef) {
      throw new Error(`Agente '${agentSlug}' não está registrado na Central de IA.`);
    }

    const tracker = new ExecutionTracker({
      company_id: context.company_id,
      user_id: context.user_id,
      agent: agentDef.slug,
      agent_version: agentDef.version,
      model: agentDef.model_profile,
    });

    try {
      const resolvedApiKey = await resolveOpenAiApiKey(apiKey);
      const agentResult = await executeAgentWithLangChain(agentSlug, prompt, context, {
        overrideSkill,
        apiKey: resolvedApiKey,
      });

      const usage = (agentResult.response as any)?.usage_metadata;
      if (usage?.total_tokens > 0) {
        tracker.addTokens(usage.input_tokens || 0, usage.output_tokens || 0);
      } else {
        tracker.addTokens(200, 300);
      }
      tracker.finish("success");
      await tracker.persistToDatabase(agentResult);

      return {
        success: true,
        data: agentResult,
        trace: tracker.trace,
      };
    } catch (err: any) {
      tracker.finish("error", err?.message);
      await tracker.persistToDatabase({ error: err?.message });
      throw err;
    }
  },

  /**
   * Executa uma Tool individual com validação de permissão e isolamento por empresa.
   */
  async runTool<TInput = any, TOutput = any>(
    toolName: string,
    input: TInput,
    context: ToolExecutionContext,
    agentSlug?: string
  ): Promise<TOutput> {
    const agent = agentSlug ? getAgent(agentSlug) : undefined;
    const tracker = new ExecutionTracker({
      company_id: context.company_id,
      user_id: context.user_id,
      agent: agent?.slug,
    });

    const start = Date.now();
    try {
      const output = await executeTool(toolName, input, context, agent);
      tracker.recordToolCall({
        tool: toolName,
        input,
        output,
        latency_ms: Date.now() - start,
        success: true,
      });
      return output;
    } catch (err: any) {
      tracker.recordToolCall({
        tool: toolName,
        input,
        output: null,
        latency_ms: Date.now() - start,
        success: false,
        error: err.message,
      });
      throw err;
    }
  },

  /**
   * Atalho tipado para pontuação de ganchos (ai.score_hook).
   */
  async scoreHook(hooks: string[], context: ToolExecutionContext): Promise<ScoreHookOutput> {
    return this.runTool<any, ScoreHookOutput>("ai.score_hook", { hooks }, context, "InstagramAgent");
  },

  /**
   * Atalho tipado para geração de folha de tempo (ai.generate_beat_sheet).
   */
  async generateBeatSheet(
    script: string,
    context: ToolExecutionContext,
    options?: { target_duration?: number; wpm?: number }
  ): Promise<GenerateBeatSheetOutput> {
    return this.runTool<any, GenerateBeatSheetOutput>(
      "ai.generate_beat_sheet",
      {
        script,
        target_duration: options?.target_duration ?? 30,
        wpm: options?.wpm ?? 165,
      },
      context,
      "InstagramAgent"
    );
  },

  /**
   * Atalho direto para executar o workflow create_strategic_reel.
   */
  async createStrategicReel(params: {
    company_id: string;
    account_id?: string;
    user_id?: string;
    idea: string;
    objective?: string;
    apiKey?: string;
    modelProfile?: string;
  }): Promise<QualifyAIResponse<StrategicReelOutput>> {
    const res = await this.runWorkflow<any>({
      workflowSlug: "create_strategic_reel",
      apiKey: params.apiKey,
      modelProfile: params.modelProfile,
      input: {
        company_id: params.company_id,
        account_id: params.account_id,
        user_id: params.user_id,
        idea: params.idea,
        objective: params.objective,
      },
    });

    const state = res.data;
    const structuredOutput: StrategicReelOutput = {
      title: state.idea,
      objective: state.objective,
      selected_hook: state.selected_hook?.hook || state.idea,
      on_screen_text: state.on_screen_text || [],
      script: state.script || "",
      beat_sheet: state.beat_sheet || undefined,
      cta: state.cta || "",
      estimated_duration_seconds: state.beat_sheet?.total_seconds || 30,
      hook_score: state.selected_hook?.score,
      warnings: state.beat_sheet?.warnings || [],
      content_id: state.content_id || undefined,
    };

    return {
      success: true,
      data: structuredOutput,
      trace: res.trace,
    };
  },
};
