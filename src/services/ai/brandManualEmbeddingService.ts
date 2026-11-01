import { OpenAIEmbeddings } from "@langchain/openai";
import { extractBrandManualForCompany, ResolvedBrandManualContext } from "@/ai/contexts/brandManualContext";
import { resolveOpenAiApiKey } from "@/ai/models/modelFactory";

export interface BrandManualChunk {
  id: string;
  category: string;
  title: string;
  content: string;
  wordCount: number;
}

export interface SearchResultChunk {
  chunk: BrandManualChunk;
  score: number;
}

// Cache em memória de vetores por empresa para evitar re-chamadas desnecessárias da API
const vectorCache: Record<string, { chunks: BrandManualChunk[]; vectors: number[][]; timestamp: number }> = {};

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Divide o Manual da Marca em blocos semânticos lógicos (Chunks).
 */
export async function chunkBrandManual(companyId: string): Promise<BrandManualChunk[]> {
  const manual = await extractBrandManualForCompany(companyId);
  const chunks: BrandManualChunk[] = [];

  // Chunk 1: Visão Geral e Tese
  if (manual.brand_name || manual.positioning || manual.thesis) {
    const content = `MARCA: ${manual.brand_name}\nTOM DE VOZ: ${manual.tone_of_voice}\nPOSICIONAMENTO: ${manual.positioning}\nTESE CENTRAL: ${manual.thesis || "Não especificada"}`;
    chunks.push({
      id: "overview_and_thesis",
      category: "Posicionamento & Tese",
      title: "Visão Geral, Tom de Voz e Tese Central da Marca",
      content,
      wordCount: content.split(/\s+/).length,
    });
  }

  // Chunks por Seções (ex: Posicionamento, Inconformados, Frustrados, Desenvolvidos, Alma da Copy)
  for (const section of manual.sections) {
    if (section.items.length === 0) continue;

    // Se a seção tiver poucos itens, agrupa em um chunk coeso
    if (section.items.length <= 4) {
      const text = section.items.map((it) => `[${it.question}]\n${it.answer}`).join("\n\n");
      chunks.push({
        id: `sec_${section.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        category: section.title,
        title: `${section.title} - Diretrizes e Respostas`,
        content: `SEÇÃO: ${section.title}\n\n${text}`,
        wordCount: text.split(/\s+/).length,
      });
    } else {
      // Para seções longas com muitas perguntas, quebra em micro-chunks
      for (let i = 0; i < section.items.length; i += 3) {
        const slice = section.items.slice(i, i + 3);
        const text = slice.map((it) => `[${it.question}]\n${it.answer}`).join("\n\n");
        chunks.push({
          id: `sec_${section.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_part_${Math.floor(i / 3) + 1}`,
          category: section.title,
          title: `${section.title} (Parte ${Math.floor(i / 3) + 1})`,
          content: `SEÇÃO: ${section.title}\n\n${text}`,
          wordCount: text.split(/\s+/).length,
        });
      }
    }
  }

  // Fallback caso não haja seções
  if (chunks.length === 0) {
    chunks.push({
      id: "fallback_empty",
      category: "Geral",
      title: "Manual da Marca Qualify",
      content: manual.summary_markdown || "Manual da Marca ativo da empresa.",
      wordCount: 20,
    });
  }

  return chunks;
}

/**
 * Busca semântica (RAG) no Manual da Marca da Empresa.
 * Gera embeddings sob demanda com text-embedding-3-small e calcula similaridade.
 */
export async function searchBrandManualWithRAG(
  companyId: string,
  query: string,
  apiKey?: string,
  topK = 2
): Promise<{
  query: string;
  results: SearchResultChunk[];
  summary: string;
  tokens_estimated: number;
}> {
  const resolvedApiKey = await resolveOpenAiApiKey(apiKey);
  const chunks = await chunkBrandManual(companyId);

  let vectors: number[][] = [];

  // Verificar se já temos os vetores em cache
  if (vectorCache[companyId] && vectorCache[companyId].chunks.length === chunks.length) {
    vectors = vectorCache[companyId].vectors;
  } else {
    try {
      const embeddingsClient = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
        apiKey: resolvedApiKey,
        configuration: {
          apiKey: resolvedApiKey,
          dangerouslyAllowBrowser: true,
        },
      });

      vectors = await embeddingsClient.embedDocuments(chunks.map((c) => c.content));
      vectorCache[companyId] = {
        chunks,
        vectors,
        timestamp: Date.now(),
      };
    } catch (embErr) {
      console.warn("[RAG] Falha ao gerar vetores na OpenAI, usando busca por palavras-chave:", embErr);
      // Fallback por palavra-chave se não conseguir gerar embeddings
      const qLower = query.toLowerCase();
      const scored = chunks.map((c) => {
        let score = 0;
        const cLower = (c.title + " " + c.content).toLowerCase();
        for (const word of qLower.split(/\s+/)) {
          if (word.length > 2 && cLower.includes(word)) score += 0.2;
        }
        return { chunk: c, score: Math.min(score, 0.99) };
      });
      scored.sort((a, b) => b.score - a.score);
      const topResults = scored.slice(0, topK);
      const summary = topResults.map((r) => `### ${r.chunk.title}\n${r.chunk.content}`).join("\n\n---\n\n");
      return {
        query,
        results: topResults,
        summary,
        tokens_estimated: Math.round(summary.length / 4),
      };
    }
  }

  // Gerar vetor da query
  let queryVector: number[] = [];
  try {
    const embeddingsClient = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
      apiKey: resolvedApiKey,
      configuration: {
        apiKey: resolvedApiKey,
        dangerouslyAllowBrowser: true,
      },
    });
    queryVector = await embeddingsClient.embedQuery(query);
  } catch (err) {
    console.warn("[RAG] Erro ao embedar query:", err);
  }

  // Calcular Similaridade de Cosseno
  const scoredResults: SearchResultChunk[] = chunks.map((chunk, idx) => {
    let score = 0;
    if (queryVector.length > 0 && vectors[idx]) {
      score = cosineSimilarity(queryVector, vectors[idx]);
    }
    // Bônus para match de título
    if (chunk.title.toLowerCase().includes(query.toLowerCase())) {
      score = Math.max(score, 0.85);
    }
    return { chunk, score };
  });

  scoredResults.sort((a, b) => b.score - a.score);
  const topResults = scoredResults.slice(0, topK);

  const summary = topResults
    .map((r) => `### [CHUNK RECUPERADO VIA RAG: ${r.chunk.title} (Relevância: ${(r.score * 100).toFixed(0)}%)]\n${r.chunk.content}`)
    .join("\n\n---\n\n");

  const tokensEstimated = Math.round(summary.length / 4);

  return {
    query,
    results: topResults,
    summary,
    tokens_estimated: tokensEstimated,
  };
}
