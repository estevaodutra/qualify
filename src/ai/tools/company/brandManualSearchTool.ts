import { z } from "zod";
import { ToolDefinition } from "../../schemas";
import { searchBrandManualWithRAG } from "@/services/ai/brandManualEmbeddingService";

export const SearchBrandManualInputSchema = z.object({
  query: z
    .string()
    .describe(
      "Termo de busca, tópico ou dor que você precisa consultar no Manual da Marca (ex: 'inconformados', 'mecanismo unico', 'dor dos frustrados', 'palavras proibidas')"
    ),
  top_k: z
    .number()
    .optional()
    .default(2)
    .describe("Quantidade de blocos mais relevantes a recuperar (padrão 2)"),
});

export type SearchBrandManualInput = z.infer<typeof SearchBrandManualInputSchema>;

export const brandManualSearchTool: ToolDefinition<SearchBrandManualInput, Record<string, any>> = {
  name: "company.search_brand_manual",
  description:
    "Busca vetorial semântica (RAG via Embeddings) no Manual da Marca da empresa. Retorna apenas os chunks específicos e relevantes para a sua consulta, economizando tokens e evitando alucinações.",
  type: "read_only",
  permission: "company.read",
  input_schema: SearchBrandManualInputSchema,
  timeout: 15,
  retry_policy: { max_retries: 2, backoff: "linear" },
  handler: async (input, ctx) => {
    const companyId = ctx.company_id;
    if (!companyId) {
      return {
        error: "Tenant company_id ausente no contexto.",
      };
    }

    try {
      const result = await searchBrandManualWithRAG(companyId, input.query, undefined, input.top_k || 2);
      return {
        query: input.query,
        chunks_count: result.results.length,
        retrieved_topics: result.results.map((r) => r.chunk.title),
        context_text: result.summary,
        estimated_tokens: result.tokens_estimated,
      };
    } catch (err: any) {
      return {
        error: `Falha na busca RAG: ${err?.message || "Erro desconhecido"}`,
      };
    }
  },
};
