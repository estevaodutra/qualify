-- ============================================================
-- Migração: Banco Vetorial RAG no Supabase (pgvector)
-- Armazena os chunks do Manual da Marca e outros documentos
-- com embeddings vetoriais de 1536 dimensões (text-embedding-3-small)
-- ============================================================

-- 1. Habilitar a extensão pgvector nativa do Supabase
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela de Chunks e Embeddings RAG
CREATE TABLE IF NOT EXISTS ai_rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'brand_manual',
  category TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices para performance e isolamento multi-tenant
CREATE INDEX IF NOT EXISTS idx_ai_rag_chunks_company ON ai_rag_chunks(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_rag_chunks_source ON ai_rag_chunks(source_type);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE ai_rag_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_rag_chunks_select_policy"
  ON ai_rag_chunks FOR SELECT
  USING (true);

CREATE POLICY "ai_rag_chunks_insert_policy"
  ON ai_rag_chunks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "ai_rag_chunks_update_policy"
  ON ai_rag_chunks FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ai_rag_chunks_delete_policy"
  ON ai_rag_chunks FOR DELETE
  USING (true);

-- 5. Função RPC de Busca Vetorial por Similaridade de Cosseno (pgvector)
CREATE OR REPLACE FUNCTION match_rag_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 3,
  filter_company_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  source_type text,
  category text,
  title text,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.company_id,
    c.source_type,
    c.category,
    c.title,
    c.content,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM ai_rag_chunks c
  WHERE (filter_company_id IS NULL OR c.company_id = filter_company_id)
    AND c.embedding IS NOT NULL
    AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
