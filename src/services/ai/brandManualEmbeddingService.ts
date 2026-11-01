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

export interface EmbeddingIndexStatus {
  isIndexed: boolean;
  totalChunks: number;
  lastUpdated?: string;
  chunks: BrandManualChunk[];
}

// Cache em memória de vetores por empresa
const vectorCache: Record<string, { chunks: BrandManualChunk[]; vectors: number[][]; timestamp: number }> = {};

function getStorageKey(companyId: string) {
  return `qualify_rag_embeddings_${companyId}`;
}

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
 * Verifica o status de indexação dos embeddings do Manual da Marca.
 */
export function getBrandManualEmbeddingStatus(companyId: string): EmbeddingIndexStatus {
  if (vectorCache[companyId] && vectorCache[companyId].vectors.length > 0) {
    return {
      isIndexed: true,
      totalChunks: vectorCache[companyId].chunks.length,
      lastUpdated: new Date(vectorCache[companyId].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      chunks: vectorCache[companyId].chunks,
    };
  }

  // Verificar localStorage
  if (typeof localStorage !== "undefined") {
    try {
      const saved = localStorage.getItem(getStorageKey(companyId));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.vectors && parsed.vectors.length > 0) {
          vectorCache[companyId] = {
            chunks: parsed.chunks,
            vectors: parsed.vectors,
            timestamp: parsed.timestamp || Date.now(),
          };
          return {
            isIndexed: true,
            totalChunks: parsed.chunks.length,
            lastUpdated: new Date(parsed.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            chunks: parsed.chunks,
          };
        }
      }
    } catch {}
  }

  return {
    isIndexed: false,
    totalChunks: 0,
    chunks: [],
  };
}

/**
 * Gera e persiste os Embeddings de todo o Manual da Marca com a OpenAI.
 */
export async function indexBrandManual(companyId: string, apiKey?: string): Promise<{
  success: boolean;
  total_chunks: number;
  chunks: BrandManualChunk[];
  cost_estimated: number;
}> {
  const resolvedApiKey = await resolveOpenAiApiKey(apiKey);
  const chunks = await chunkBrandManual(companyId);

  const embeddingsClient = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: resolvedApiKey,
    configuration: {
      apiKey: resolvedApiKey,
      dangerouslyAllowBrowser: true,
    },
  });

  const textsToEmbed = chunks.map((c) => c.content);
  const vectors = await embeddingsClient.embedDocuments(textsToEmbed);

  const now = Date.now();
  vectorCache[companyId] = {
    chunks,
    vectors,
    timestamp: now,
  };

  // Salvar no localStorage para persistência entre recarregamentos
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(
        getStorageKey(companyId),
        JSON.stringify({
          companyId,
          chunks,
          vectors,
          timestamp: now,
        })
      );
    } catch (e) {
      console.warn("[RAG] Não foi possível persistir vetores no localStorage:", e);
    }
  }

  const totalWords = chunks.reduce((acc, c) => acc + c.wordCount, 0);
  const tokensEst = Math.round(totalWords * 1.3);
  const cost = Number(((tokensEst * 0.02) / 1000000).toFixed(6));

  return {
    success: true,
    total_chunks: chunks.length,
    chunks,
    cost_estimated: cost,
  };
}

/**
 * Busca semântica (RAG) no Manual da Marca da Empresa.
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

  // Garantir que os embeddings estejam carregados/gerados
  let status = getBrandManualEmbeddingStatus(companyId);
  if (!status.isIndexed) {
    try {
      await indexBrandManual(companyId, resolvedApiKey);
      status = getBrandManualEmbeddingStatus(companyId);
    } catch (err) {
      console.warn("[RAG] Erro ao indexar sob demanda:", err);
    }
  }

  const cached = vectorCache[companyId];
  const chunks = cached?.chunks || (await chunkBrandManual(companyId));
  const vectors = cached?.vectors || [];

  let queryVector: number[] = [];
  if (vectors.length > 0) {
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
  }

  // Similaridade de Cosseno com fallback léxico
  const scoredResults: SearchResultChunk[] = chunks.map((chunk, idx) => {
    let score = 0;
    if (queryVector.length > 0 && vectors[idx]) {
      score = cosineSimilarity(queryVector, vectors[idx]);
    } else {
      // Fallback por palavra-chave se não houver vetor
      const qLower = query.toLowerCase();
      const cLower = (chunk.title + " " + chunk.content).toLowerCase();
      for (const word of qLower.split(/\s+/)) {
        if (word.length > 2 && cLower.includes(word)) score += 0.25;
      }
    }

    if (chunk.title.toLowerCase().includes(query.toLowerCase())) {
      score = Math.max(score, 0.88);
    }
    return { chunk, score: Math.min(score, 0.99) };
  });

  scoredResults.sort((a, b) => b.score - a.score);
  const topResults = scoredResults.slice(0, topK);

  const summary = topResults
    .map((r) => `### [CHUNK RECUPERADO VIA RAG: ${r.chunk.title} (Similaridade: ${(r.score * 100).toFixed(0)}%)]\n${r.chunk.content}`)
    .join("\n\n---\n\n");

  const tokensEstimated = Math.round(summary.length / 4);

  return {
    query,
    results: topResults,
    summary,
    tokens_estimated: tokensEstimated,
  };
}
