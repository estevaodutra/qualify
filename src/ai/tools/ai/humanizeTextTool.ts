import {
  HumanizeTextInput,
  HumanizeTextOutput,
  HumanizeTextInputSchema,
  HumanizeTextOutputSchema,
  ToolDefinition,
} from "../../schemas";
import { humanizeText } from "@/services/ai/instagram/aiHumanizer";

export const humanizeTextTool: ToolDefinition<HumanizeTextInput, HumanizeTextOutput> = {
  name: "ai.humanize_text",
  description:
    "Remove a impressão digital mecânica de IA de rascunhos em 3 passagens: remove caracteres invisíveis e format tags Unicode, normaliza tipografia artificial (em dash e aspas curvas) e substitui jargões clichês por vocabulário fluido e direto.",
  type: "read_only",
  permission: "ai.use_tools",
  input_schema: HumanizeTextInputSchema,
  output_schema: HumanizeTextOutputSchema,
  timeout: 10,
  retry_policy: { max_retries: 2, backoff: "linear" },
  handler: async (input: HumanizeTextInput): Promise<HumanizeTextOutput> => {
    const res = humanizeText(input.text, {
      cleanInvisible: input.clean_invisible,
      cleanTypographic: input.clean_typographic,
      replaceLexical: input.replace_lexical,
    });

    return {
      cleaned_text: res.cleanedText,
      invisible_hits_count: res.invisibleHits.reduce((acc, h) => acc + h.count, 0),
      typographic_hits_count: res.typographicHits.reduce((acc, h) => acc + h.count, 0),
      lexical_hits_count: res.lexicalHits.reduce((acc, h) => acc + h.count, 0),
      original_length: res.originalLength,
      cleaned_length: res.cleanedLength,
    };
  },
};
