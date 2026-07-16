-- Migration: 20260716010000_create_quiz_custom_scripts.sql
-- Description: Table for managing custom head/body scripts per funnel and company.

CREATE TABLE IF NOT EXISTS public.quiz_custom_scripts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  funnel_id      UUID NOT NULL REFERENCES public.quiz_funnels(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  location       TEXT NOT NULL CHECK (location IN ('head', 'body_start', 'body_end')),
  code           TEXT NOT NULL,
  enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  execution_mode TEXT NOT NULL DEFAULT 'immediate' CHECK (execution_mode IN ('immediate', 'defer', 'async')),
  environment    TEXT NOT NULL DEFAULT 'all' CHECK (environment IN ('all', 'production', 'preview')),
  order_index    INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_custom_scripts ENABLE ROW LEVEL SECURITY;

-- Policy: Funnel owner / team can manage scripts
CREATE POLICY "quiz_custom_scripts_owner" ON public.quiz_custom_scripts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quiz_funnels qf
      WHERE qf.id = quiz_custom_scripts.funnel_id AND qf.user_id = auth.uid()
    )
  );

-- Policy: Anyone can read enabled custom scripts for published funnels
CREATE POLICY "quiz_custom_scripts_public_read" ON public.quiz_custom_scripts
  FOR SELECT USING (
    enabled = TRUE AND EXISTS (
      SELECT 1 FROM public.quiz_funnels qf
      WHERE qf.id = quiz_custom_scripts.funnel_id AND qf.status = 'published'
    )
  );

CREATE INDEX IF NOT EXISTS quiz_custom_scripts_funnel_id_idx ON public.quiz_custom_scripts (funnel_id, location);
