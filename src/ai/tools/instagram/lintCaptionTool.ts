import {
  LintCaptionInput,
  LintCaptionOutput,
  LintCaptionInputSchema,
  LintCaptionOutputSchema,
  ToolDefinition,
} from "../../schemas";
import { lintAdvancedInstagramCaption } from "@/services/ai/instagram/instagramCaptionLinter";

export const lintCaptionTool: ToolDefinition<LintCaptionInput, LintCaptionOutput> = {
  name: "instagram.lint_caption",
  description:
    "Valida e audita uma legenda do Instagram contra as regras de ouro: janela visível de 125 caracteres antes do '... mais', teto de até 5 hashtags temáticas, verificação de links inativos no corpo, foco em 1 único CTA de conversão e densidade de emojis.",
  type: "read_only",
  permission: "ai.use_tools",
  input_schema: LintCaptionInputSchema,
  output_schema: LintCaptionOutputSchema,
  timeout: 10,
  retry_policy: { max_retries: 2, backoff: "linear" },
  handler: async (input: LintCaptionInput): Promise<LintCaptionOutput> => {
    const res = lintAdvancedInstagramCaption(input.caption, {
      truncateAt: input.truncate_at,
      keywords: input.keywords,
    });

    return {
      characters: res.characters,
      limit: res.limit,
      visible_window: res.visibleWindow,
      truncated: res.truncated,
      first_line_chars: res.firstLineChars,
      hashtags: res.hashtags,
      mentions: res.mentions,
      links: res.links,
      emoji_count: res.emojiCount,
      emoji_density: res.emojiDensity,
      asks: res.asks,
      checks: res.checks,
      verdict: res.verdict,
    };
  },
};
