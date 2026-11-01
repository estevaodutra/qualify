import { Annotation } from "@langchain/langgraph";
import { HookScoreItem, GenerateBeatSheetOutput } from "../../schemas";

export const StrategicReelStateAnnotation = Annotation.Root({
  company_id: Annotation<string>(),
  user_id: Annotation<string | undefined>(),
  account_id: Annotation<string | undefined>(),
  run_id: Annotation<string | undefined>(),

  idea: Annotation<string>(),
  objective: Annotation<string>(),

  brand_context: Annotation<Record<string, any>>({
    reducer: (_, next) => next,
    default: () => ({}),
  }),
  account_context: Annotation<Record<string, any>>({
    reducer: (_, next) => next,
    default: () => ({}),
  }),

  hooks: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  hook_scores: Annotation<HookScoreItem[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  selected_hook: Annotation<HookScoreItem | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  script: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  on_screen_text: Annotation<string[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  cta: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  beat_sheet: Annotation<GenerateBeatSheetOutput | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),

  validation: Annotation<{
    is_valid: boolean;
    issues: string[];
    rewrite_count: number;
  }>({
    reducer: (_, next) => next,
    default: () => ({ is_valid: true, issues: [], rewrite_count: 0 }),
  }),

  content_id: Annotation<string | null>({
    reducer: (_, next) => next,
    default: () => null,
  }),
  tokens_used: Annotation<{
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  }>({
    reducer: (curr, next) => ({
      input_tokens: (curr?.input_tokens || 0) + (next?.input_tokens || 0),
      output_tokens: (curr?.output_tokens || 0) + (next?.output_tokens || 0),
      total_tokens: (curr?.total_tokens || 0) + (next?.total_tokens || 0),
    }),
    default: () => ({ input_tokens: 0, output_tokens: 0, total_tokens: 0 }),
  }),
  errors: Annotation<string[]>({
    reducer: (prev, next) => (next ? prev.concat(next) : prev),
    default: () => [],
  }),
  step_trace: Annotation<Array<{ step: string; timestamp: string; details?: any }>>({
    reducer: (prev, next) => (next ? prev.concat(next) : prev),
    default: () => [],
  }),
});

export type StrategicReelState = typeof StrategicReelStateAnnotation.State;
