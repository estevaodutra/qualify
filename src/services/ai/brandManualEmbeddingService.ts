import { OpenAIEmbeddings } from "@langchain/openai";
import { extractBrandManualForCompany, ResolvedBrandManualContext } from "@/ai/contexts/brandManualContext";
import { resolveOpenAiApiKey } from "@/ai/models/modelFactory";
import { supabase } from "@/integrations/supabase/client";

export interface BrandManualChunk {
  id?: string;
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
  storage: "supabase" | "memory";
  chunks: BrandManualChunk[];
}

// Cache em memória para consultas repetidas
const memoryCache: Record<string, { chunks: BrandManualChunk[]; vectors: number[][]; timestamp: number }> = {};

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

  // Chunk 1: Visão Geral, Posicionamento e Tese
  if (manual.brand_name || manual.positioning || manual.thesis) {
    const content = `MARCA: ${manual.brand_name}\nTOM DE VOZ: ${manual.tone_of_voice}\nPOSICIONAMENTO: ${manual.positioning}\nTESE CENTRAL: ${manual.thesis || "Não informada"}`;
    chunks.push({
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
      category: "Geral",
      title: "Manual da Marca Qualify",
      content: manual.summary_markdown || "Manual da Marca ativo da empresa.",
      wordCount: 20,
    });
  }

  return chunks;
}

/**
 * Consulta o status dos Embeddings diretamente na tabela 'ai_rag_chunks' do Supabase.
 */
export async function getBrandManualEmbeddingStatus(companyId: string): Promise<EmbeddingIndexStatus> {
  try {
    const { data, error } = await (supabase as any)
      .from("ai_rag_chunks")
      .select("id, title, category, content, created_at")
      .eq("company_id", companyId)
      .eq("source_type", "brand_manual");

    if (!error && Array.isArray(data) && data.length > 0) {
      return {
        isIndexed: true,
        totalChunks: data.length,
        lastUpdated: new Date(data[0].created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        storage: "supabase",
        chunks: data.map((d: any) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          content: d.content,
          wordCount: (d.content || "").split(/\s+/).length,
        })),
      };
    }
  } catch (err) {
    console.warn("[RAG] Não foi possível verificar tabela 'ai_rag_chunks' no Supabase:", err);
  }

  // Fallback em memória
  if (memoryCache[companyId] && memoryCache[companyId].vectors.length > 0) {
    return {
      isIndexed: true,
      totalChunks: memoryCache[companyId].chunks.length,
      lastUpdated: new Date(memoryCache[companyId].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      storage: "memory",
      chunks: memoryCache[companyId].chunks,
    };
  }

  return {
    isIndexed: false,
    totalChunks: 0,
    storage: "supabase",
    chunks: [],
  };
}

/**
 * Busca linhas gravadas no Supabase para inspeção visual do usuário.
 */
export async function fetchSupabaseRagChunks(companyId: string): Promise<any[]> {
  try {
    const { data } = await (supabase as any)
      .from("ai_rag_chunks")
      .select("id, title, category, content, created_at, metadata")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Gera os Embeddings com a OpenAI e grava FISICAMENTE no Supabase na tabela 'ai_rag_chunks'.
 */
export async function indexBrandManual(companyId: string, apiKey?: string): Promise<{
  success: boolean;
  total_chunks: number;
  chunks: BrandManualChunk[];
  cost_estimated: number;
  storage: "supabase" | "memory";
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
  memoryCache[companyId] = {
    chunks,
    vectors,
    timestamp: now,
  };

  let savedToSupabase = false;

  // 1. Gravar fisicamente na tabela 'ai_rag_chunks' do Supabase
  try {
    // Limpar chunks antigos da empresa para essa fonte
    await (supabase as any)
      .from("ai_rag_chunks")
      .delete()
      .eq("company_id", companyId)
      .eq("source_type", "brand_manual");

    // Inserir os novos registros com os vetores pgvector
    const rowsToInsert = chunks.map((chunk, idx) => ({
      company_id: companyId,
      source_type: "brand_manual",
      category: chunk.category,
      title: chunk.title,
      content: chunk.content,
      embedding: vectors[idx], // Array numérico de 1536 dimensões
      metadata: {
        word_count: chunk.wordCount,
        indexed_at: new Date().toISOString(),
      },
    }));

    const { error: insertError } = await (supabase as any)
      .from("ai_rag_chunks")
      .insert(rowsToInsert);

    if (!insertError) {
      savedToSupabase = true;
    } else {
      console.warn("[RAG] Erro ao gravar vetores no Supabase 'ai_rag_chunks':", insertError);
    }
  } catch (err) {
    console.warn("[RAG] Falha ao tentar gravar no Supabase:", err);
  }

  const totalWords = chunks.reduce((acc, c) => acc + c.wordCount, 0);
  const tokensEst = Math.round(totalWords * 1.3);
  const cost = Number(((tokensEst * 0.02) / 1000000).toFixed(6));

  return {
    success: true,
    total_chunks: chunks.length,
    chunks,
    cost_estimated: cost,
    storage: savedToSupabase ? "supabase" : "memory",
  };
}

/**
 * Busca semântica (RAG): utiliza a função RPC match_rag_chunks do Supabase se disponível,
 * ou fallback com os vetores gravados.
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
  source: "supabase_rpc" | "memory";
}> {
  const resolvedApiKey = await resolveOpenAiApiKey(apiKey);

  const embeddingsClient = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: resolvedApiKey,
    configuration: {
      apiKey: resolvedApiKey,
      dangerouslyAllowBrowser: true,
    },
  });

  const queryVector = await embeddingsClient.embedQuery(query);

  // 1. Tentar busca vetorial nativa no Supabase via RPC pgvector
  try {
    const { data: rpcResults, error: rpcError } = await (supabase as any).rpc("match_rag_chunks", {
      query_embedding: queryVector,
      match_threshold: 0.2,
      match_count: topK,
      filter_company_id: companyId,
    });

    if (!rpcError && Array.isArray(rpcResults) && rpcResults.length > 0) {
      const results: SearchResultChunk[] = rpcResults.map((r: any) => ({
        chunk: {
          id: r.id,
          title: r.title,
          category: r.category,
          content: r.content,
          wordCount: (r.content || "").split(/\s+/).length,
        },
        score: Number(r.similarity || 0.8),
      }));

      const summary = results
        .map((r) => `### [CHUNK SUPABASE PGVECTOR: ${r.chunk.title} (Similaridade: ${(r.score * 100).toFixed(0)}%)]\n${r.chunk.content}`)
        .join("\n\n---\n\n");

      return {
        query,
        results,
        summary,
        tokens_estimated: Math.round(summary.length / 4),
        source: "supabase_rpc",
      };
    }
  } catch (err) {
    console.warn("[RAG] RPC match_rag_chunks não disponível no Supabase, usando fallback:", err);
  }

  // 2. Fallback: buscar vetores no cache de memória ou gerar sob demanda
  let cached = memoryCache[companyId];
  if (!cached || cached.vectors.length === 0) {
    await indexBrandManual(companyId, resolvedApiKey);
    cached = memoryCache[companyId];
  }

  const chunks = cached?.chunks || (await chunkBrandManual(companyId));
  const vectors = cached?.vectors || [];

  const scoredResults: SearchResultChunk[] = chunks.map((chunk, idx) => {
    let score = 0;
    if (queryVector.length > 0 && vectors[idx]) {
      score = cosineSimilarity(queryVector, vectors[idx]);
    } else {
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
    .map((r) => `### [CHUNK RECUPERADO: ${r.chunk.title} (Similaridade: ${(r.score * 100).toFixed(0)}%)]\n${r.chunk.content}`)
    .join("\n\n---\n\n");

  return {
    query,
    results: topResults,
    summary,
    tokens_estimated: Math.round(summary.length / 4),
    source: "memory",
  };
}
