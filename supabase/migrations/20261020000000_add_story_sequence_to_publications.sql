-- Migração para suporte a sequências de Stories e ordenação de publicações encadeadas
ALTER TABLE public.criafy_publications 
ADD COLUMN IF NOT EXISTS story_sequence_id UUID,
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS sequence_total INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_criafy_publications_sequence ON public.criafy_publications (story_sequence_id);
