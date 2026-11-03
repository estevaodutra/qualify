-- Migration: Adiciona suporte oficial a Reels de Teste (Trial Reels) no Criafy
-- Permite publicar Reels exclusivamente para não-seguidores para validação de retenção e alcance

ALTER TABLE public.criafy_publications 
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_graduation_strategy TEXT DEFAULT 'SS_PERFORMANCE';

COMMENT ON COLUMN public.criafy_publications.is_trial IS 'Indica se a publicação é um Reel em formato de teste (exibido inicialmente apenas para não-seguidores na Meta)';
COMMENT ON COLUMN public.criafy_publications.trial_graduation_strategy IS 'Estratégia de graduação do Reel de Teste: SS_PERFORMANCE (automático se performar) ou MANUAL';
