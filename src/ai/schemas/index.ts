import { z } from "zod";

// ============================================================
// 1. MODEL PROFILES
// ============================================================
export type ModelProfileCode =
  | "CONTENT_STANDARD"
  | "CONTENT_ADVANCED"
  | "STRATEGY_ADVANCED"
  | "FAST_CLASSIFIER";

export interface ModelProfile {
  code: ModelProfileCode;
  name: string;
  description: string;
  provider: "openai";
  model: string;
  reasoning_effort?: "low" | "medium" | "high" | null;
  max_output_tokens: number;
  temperature: number;
  timeout_seconds: number;
  fallback_model?: string;
  is_active: boolean;
}

// ============================================================
// 2. TOOLS
// ============================================================
export type ToolType = "read_only" | "write_internal" | "write_external" | "critical";

export interface ToolRetryPolicy {
  max_retries: number;
  backoff: "linear" | "exponential";
}

export interface ToolExecutionContext {
  company_id: string;
  user_id?: string;
  account_id?: string;
  permissions?: string[];
  run_id?: string;
}

export interface ToolDefinition<TInput = any, TOutput = any> {
  name: string; // e.g. 'ai.score_hook', 'criafy.save_content'
  description: string;
  type: ToolType;
  permission: string; // Required RBAC permission
  input_schema: z.ZodType<TInput>;
  output_schema?: z.ZodType<TOutput>;
  timeout?: number;
  retry_policy?: ToolRetryPolicy;
  handler: (input: TInput, ctx: ToolExecutionContext) => Promise<TOutput>;
}

// ============================================================
// 3. CONTEXT PROVIDERS
// ============================================================
export interface ContextProviderDefinition<TContext = any> {
  slug: string;
  name: string;
  description: string;
  cache_ttl_seconds?: number;
  resolve: (params: {
    company_id: string;
    account_id?: string;
    user_id?: string;
    lead_id?: string;
    campaign_id?: string;
  }) => Promise<TContext>;
}

// ============================================================
// 4. SKILLS
// ============================================================
export interface SkillDefinition {
  slug: string;
  name: string;
  description: string;
  version: number;
  category: "CONTEÚDO" | "ESTRATÉGIA" | "ANÁLISE" | "VENDAS" | "SUPORTE";
  status: "published" | "draft" | "deprecated";
  when_to_use?: string;
  target_objective?: string;
  instructions: string;
  references?: string[];
  required_tools: string[];
  output_schema?: Record<string, any>;
  default_model_profile?: ModelProfileCode;
}

// ============================================================
// 5. AGENTS
// ============================================================
export interface AgentDefinition {
  slug: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "draft";
  model_profile: ModelProfileCode;
  system_prompt: string;
  skills: string[]; // slugs of skills
  tools: string[]; // names of allowed tools
  context_providers: string[]; // slugs of context providers
  permissions: string[]; // permissions granted to the agent
  version: number;
}

// ============================================================
// 6. HOOK SCORE SCHEMAS
// ============================================================
export const HookScoreCheckSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  weight: z.number(),
  reason: z.string(),
});

export const HookScoreItemSchema = z.object({
  hook: z.string(),
  score: z.number(), // 0 to 100
  verdict: z.enum(["EXCELLENT", "GOOD", "NEEDS_IMPROVEMENT", "POOR"]),
  word_count: z.number(),
  estimated_seconds: z.number(),
  formula_match: z.string().optional(),
  checks: z.array(HookScoreCheckSchema),
  weakest: z.string().optional(),
  flags: z.array(z.string()),
});

export const ScoreHookInputSchema = z.object({
  hooks: z.array(z.string()).min(1),
});

export const ScoreHookOutputSchema = z.object({
  items: z.array(HookScoreItemSchema),
  winner: HookScoreItemSchema,
});

export type HookScoreItem = z.infer<typeof HookScoreItemSchema>;
export type ScoreHookInput = z.infer<typeof ScoreHookInputSchema>;
export type ScoreHookOutput = z.infer<typeof ScoreHookOutputSchema>;

// ============================================================
// 7. BEAT SHEET SCHEMAS
// ============================================================
export const BeatItemSchema = z.object({
  id: z.number(),
  text: z.string(),
  wordCount: z.number(),
  estimatedSeconds: z.number(),
  timecode: z.string(),
  type: z.enum(["HOOK", "BODY", "PAYOFF", "LOOP"]),
  warning: z.string().optional(),
});

export const GenerateBeatSheetInputSchema = z.object({
  script: z.string().min(5),
  target_duration: z.number().optional().default(30),
  wpm: z.number().optional().default(165),
});

export const GenerateBeatSheetOutputSchema = z.object({
  total_seconds: z.number(),
  total_words: z.number(),
  formatted_duration: z.string(),
  hook_valid: z.boolean(),
  beats: z.array(BeatItemSchema),
  notes: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type BeatItem = z.infer<typeof BeatItemSchema>;
export type GenerateBeatSheetInput = z.infer<typeof GenerateBeatSheetInputSchema>;
export type GenerateBeatSheetOutput = z.infer<typeof GenerateBeatSheetOutputSchema>;

// ============================================================
// 8. STRUCTURED OUTPUT FOR REEL
// ============================================================
export const StrategicReelOutputSchema = z.object({
  title: z.string(),
  objective: z.string(),
  selected_hook: z.string(),
  on_screen_text: z.array(z.string()),
  script: z.string(),
  beat_sheet: GenerateBeatSheetOutputSchema.optional(),
  cta: z.string(),
  estimated_duration_seconds: z.number(),
  hook_score: z.number().optional(),
  warnings: z.array(z.string()).default([]),
  content_id: z.string().optional(),
});

export type StrategicReelOutput = z.infer<typeof StrategicReelOutputSchema>;

// ============================================================
// 9. LANGGRAPH REEL STATE
// ============================================================
export interface ReelState {
  company_id: string;
  user_id?: string;
  account_id?: string;
  run_id?: string;

  idea: string;
  objective: string;

  brand_context: Record<string, any>;
  account_context: Record<string, any>;

  hooks: string[];
  hook_scores: HookScoreItem[];
  selected_hook: HookScoreItem | null;

  script: string;
  on_screen_text: string[];
  cta: string;
  beat_sheet: GenerateBeatSheetOutput | null;
  validation: {
    is_valid: boolean;
    issues: string[];
    rewrite_count: number;
  };

  content_id?: string | null;
  errors: string[];
  step_trace: Array<{
    step: string;
    timestamp: string;
    details?: any;
  }>;
}

// ============================================================
// 10. WORKFLOW DEFINITION & GUARDS
// ============================================================
export interface LoopGuards {
  max_agent_steps: number;
  max_tool_calls: number;
  max_retries: number;
  max_execution_time_seconds: number;
  max_cost_dollars: number;
}

export interface WorkflowDefinition<TState = any, TInput = any, TOutput = any> {
  slug: string;
  name: string;
  description: string;
  version: number;
  loop_guards: LoopGuards;
  createGraph: () => any; // Returns compiled LangGraph StateGraph
}

// ============================================================
// 11. OBSERVABILITY & EXECUTION RESULT
// ============================================================
export interface ToolCallRecord {
  tool: string;
  input: any;
  output: any;
  latency_ms: number;
  success: boolean;
  error?: string;
}

export interface ExecutionTraceRecord {
  run_id: string;
  company_id: string;
  user_id?: string;
  agent?: string;
  agent_version?: number;
  skill?: string;
  skill_version?: number;
  workflow?: string;
  workflow_version?: number;
  model: string;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  estimated_cost: number;
  latency_ms: number;
  status: "success" | "error" | "interrupted" | "retrying";
  error?: string;
  tool_calls: ToolCallRecord[];
  approvals?: any[];
  started_at: string;
  finished_at: string;
}

export interface QualifyAIResponse<T = any> {
  success: boolean;
  data: T;
  trace: ExecutionTraceRecord;
}
