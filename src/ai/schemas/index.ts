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
  hierarchy_level?: "orchestrator" | "specialist"; // Nível na cadeia: "orchestrator" (Liderança central) ou "specialist" (Departamental)
  parent_agent?: string; // Slug do agente pai/superior (ex: "qualify-orchestrator")
  department?: string; // Departamento funcional (ex: "Direção Estratégica", "Conteúdo & Redes", "Atendimento & CRM")
  reports_to?: string; // Nome legível de quem ele reporta (ex: "Orquestrador Qualify")
  icon_name?: string; // Nome do ícone representativo
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
// 7.1 SLOP DETECTION & HUMANIZATION SCHEMAS (ig-human)
// ============================================================
export const DetectSlopInputSchema = z.object({
  text: z.string().min(3, "Texto obrigatório para detecção de IA."),
});

export const DetectSlopOutputSchema = z.object({
  human_score: z.number(), // 0 a 100
  is_human: z.boolean(),
  verdict: z.enum(["HUMAN", "POSSIBLY_AI", "HIGHLY_ARTIFICIAL"]),
  breakdown: z.object({
    burstiness_score: z.number(),
    burstiness_detail: z.string(),
    specificity_score: z.number(),
    specificity_detail: z.string(),
    slop_score: z.number(),
    slop_detail: z.string(),
    fingerprint_score: z.number(),
    fingerprint_detail: z.string(),
  }),
  detected_slop_tokens: z.array(z.string()),
});

export const HumanizeTextInputSchema = z.object({
  text: z.string().min(3, "Texto obrigatório para humanização."),
  clean_invisible: z.boolean().optional().default(true),
  clean_typographic: z.boolean().optional().default(true),
  replace_lexical: z.boolean().optional().default(true),
});

export const HumanizeTextOutputSchema = z.object({
  cleaned_text: z.string(),
  invisible_hits_count: z.number(),
  typographic_hits_count: z.number(),
  lexical_hits_count: z.number(),
  original_length: z.number(),
  cleaned_length: z.number(),
});

export type DetectSlopInput = z.infer<typeof DetectSlopInputSchema>;
export type DetectSlopOutput = z.infer<typeof DetectSlopOutputSchema>;
export type HumanizeTextInput = z.infer<typeof HumanizeTextInputSchema>;
export type HumanizeTextOutput = z.infer<typeof HumanizeTextOutputSchema>;

// ============================================================
// 7.2 CAPTION LINTER SCHEMAS (ig-caption)
// ============================================================
export const LintCaptionInputSchema = z.object({
  caption: z.string().min(1, "Legenda necessária para análise."),
  truncate_at: z.number().optional().default(125),
  keywords: z.array(z.string()).optional().default([]),
});

export const LintCaptionOutputSchema = z.object({
  characters: z.number(),
  limit: z.number(),
  visible_window: z.string(),
  truncated: z.boolean(),
  first_line_chars: z.number(),
  hashtags: z.array(z.string()),
  mentions: z.array(z.string()),
  links: z.array(z.string()),
  emoji_count: z.number(),
  emoji_density: z.number(),
  asks: z.array(z.string()),
  checks: z.array(
    z.object({
      check: z.string(),
      status: z.enum(["PASS", "WARN", "FAIL"]),
      detail: z.string(),
    })
  ),
  verdict: z.enum(["READY", "REVIEW", "FIX"]),
});

export type LintCaptionInput = z.infer<typeof LintCaptionInputSchema>;
export type LintCaptionOutput = z.infer<typeof LintCaptionOutputSchema>;

// ============================================================
// 7.3 PROFILE RUBRIC AUDIT SCHEMAS (ig-profile)
// ============================================================
export const AuditProfileInputSchema = z.object({
  name_field: z.string().optional(),
  handle: z.string().optional(),
  bio_first_line: z.string().optional(),
  bio_body: z.string().optional(),
  pinned_posts_count: z.number().optional().default(0),
  has_specific_pinned_strategy: z.boolean().optional().default(false),
  link_count: z.number().optional().default(1),
  has_direct_landing_link: z.boolean().optional().default(true),
  highlights_count: z.number().optional().default(0),
  grid_has_legible_covers: z.boolean().optional().default(true),
  photo_quality_close_up: z.boolean().optional().default(true),
  has_professional_category_and_contact: z.boolean().optional().default(true),
  posted_in_last_7_days: z.boolean().optional().default(true),
  replied_to_comments_in_first_hour: z.boolean().optional().default(true),
  has_active_stories_today: z.boolean().optional().default(true),
});

export const AuditProfileOutputSchema = z.object({
  total_score: z.number(),
  max_score: z.number(),
  percentage: z.number(),
  grade: z.enum(["ELITE", "PRO", "AVERAGE", "NEEDS_OPTIMIZATION"]),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      points_earned: z.number(),
      max_points: z.number(),
      status: z.enum(["PASS", "PARTIAL", "FAIL"]),
      feedback: z.string(),
    })
  ),
  priority_actions: z.array(z.string()),
});

export type AuditProfileInput = z.infer<typeof AuditProfileInputSchema>;
export type AuditProfileOutput = z.infer<typeof AuditProfileOutputSchema>;

// ============================================================
// 7.4 VIRAL SWIPE ANALYZER SCHEMAS (ig-viral)
// ============================================================
export const AnalyzeSwipesInputSchema = z.object({
  items: z.array(
    z.object({
      account: z.string(),
      followers: z.number().optional().nullable(),
      median: z.number().optional().nullable(),
      views: z.number(),
      hook: z.string(),
      on_screen: z.string().optional(),
      length_seconds: z.number().optional(),
      cta: z.string().optional(),
    })
  ).min(1, "Forneça pelo menos 1 vídeo para análise."),
});

export const AnalyzeSwipesOutputSchema = z.object({
  total_analyzed: z.number(),
  strong_outliers_count: z.number(),
  top_formulas: z.array(
    z.object({
      formula_name: z.string(),
      count: z.number(),
      avg_multiple: z.number(),
    })
  ),
  items: z.array(
    z.object({
      account: z.string(),
      views: z.number(),
      baseline: z.number(),
      outlier_multiple: z.number(),
      formula_id: z.number().nullable(),
      formula_name: z.string(),
      signal_grade: z.enum(["MEGA_VIRAL", "STRONG_OUTLIER", "AVERAGE_PERFORMANCE", "BELOW_BASELINE"]),
      hook: z.string(),
    })
  ),
  actionable_insights: z.array(z.string()),
});

export type AnalyzeSwipesInput = z.infer<typeof AnalyzeSwipesInputSchema>;
export type AnalyzeSwipesOutput = z.infer<typeof AnalyzeSwipesOutputSchema>;

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
