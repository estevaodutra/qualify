-- Migration: 20260716000000_evolve_quiz_funnels.sql
-- Description: Evolves quiz funnels module tables, adding advanced design, logic, analytics events, media, and preset storage.

-- 1. Extend quiz_funnels
ALTER TABLE public.quiz_funnels
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- 2. Extend quiz_steps
ALTER TABLE public.quiz_steps
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'content',
  ADD COLUMN IF NOT EXISTS logic_config JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS design_config JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

-- 3. Extend quiz_components
ALTER TABLE public.quiz_components
  ADD COLUMN IF NOT EXISTS schema_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS responsive_config JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS conditions_config JSONB NOT NULL DEFAULT '{}';

-- 4. Extend quiz_submissions
ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS score INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS result_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS utm_data JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS device_info JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_step_id UUID REFERENCES public.quiz_steps(id) ON DELETE SET NULL;

-- 5. Create quiz_events table for analytics and dropoff tracking
CREATE TABLE IF NOT EXISTS public.quiz_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  funnel_id     UUID NOT NULL REFERENCES public.quiz_funnels(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.quiz_submissions(id) ON DELETE CASCADE,
  step_id       UUID REFERENCES public.quiz_steps(id) ON DELETE CASCADE,
  component_id  UUID REFERENCES public.quiz_components(id) ON DELETE CASCADE,
  event_name    TEXT NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_events_owner_read" ON public.quiz_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_funnels qf
      WHERE qf.id = quiz_events.funnel_id AND qf.user_id = auth.uid()
    )
  );

CREATE POLICY "quiz_events_anon_insert" ON public.quiz_events
  FOR INSERT WITH CHECK (TRUE);

-- 6. Create quiz_media table for media management
CREATE TABLE IF NOT EXISTS public.quiz_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  url         TEXT NOT NULL,
  file_size   INT,
  mime_type   TEXT,
  dimensions  JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_media_owner" ON public.quiz_media
  USING (user_id = auth.uid() OR company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

-- 7. Create quiz_theme_presets table
CREATE TABLE IF NOT EXISTS public.quiz_theme_presets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  design_config JSONB NOT NULL DEFAULT '{}',
  is_global     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_theme_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_theme_presets_read" ON public.quiz_theme_presets
  FOR SELECT USING (is_global = TRUE OR user_id_or_company_match(company_id));

CREATE POLICY "quiz_theme_presets_owner" ON public.quiz_theme_presets
  FOR ALL USING (company_id IN (
    SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
  ));

-- 8. Create Storage Bucket for Quiz Media if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-media', 'quiz-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for quiz-media
CREATE POLICY "Quiz Media Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'quiz-media');

CREATE POLICY "Quiz Media Authenticated Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'quiz-media' AND auth.role() = 'authenticated');

CREATE POLICY "Quiz Media Owner Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'quiz-media' AND auth.uid() = owner);

-- 9. Indexes for optimal performance
CREATE INDEX IF NOT EXISTS quiz_events_funnel_id_idx ON public.quiz_events (funnel_id, event_name);
CREATE INDEX IF NOT EXISTS quiz_events_created_at_idx ON public.quiz_events (created_at);
CREATE INDEX IF NOT EXISTS quiz_media_company_id_idx ON public.quiz_media (company_id);
