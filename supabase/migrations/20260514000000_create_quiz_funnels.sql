-- Quiz Funnels module
-- Tables: quiz_funnels, quiz_steps, quiz_components, quiz_submissions, quiz_answers

-- ─── quiz_funnels ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_funnels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  design_config  JSONB NOT NULL DEFAULT '{}',
  seo_config     JSONB NOT NULL DEFAULT '{}',
  pixel_config   JSONB NOT NULL DEFAULT '{}',
  webhook_config JSONB NOT NULL DEFAULT '{}',
  visits_count       INT NOT NULL DEFAULT 0,
  responses_count    INT NOT NULL DEFAULT 0,
  leads_count        INT NOT NULL DEFAULT 0,
  completions_count  INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_funnels_owner" ON public.quiz_funnels
  USING (user_id = auth.uid());

CREATE POLICY "quiz_funnels_public_read" ON public.quiz_funnels
  FOR SELECT USING (status = 'published');

-- ─── quiz_steps ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_steps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id    UUID NOT NULL REFERENCES public.quiz_funnels(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id   UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Etapa',
  step_order   INT NOT NULL DEFAULT 0,
  show_logo    BOOLEAN NOT NULL DEFAULT TRUE,
  show_progress BOOLEAN NOT NULL DEFAULT TRUE,
  allow_back   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_steps_owner" ON public.quiz_steps
  USING (user_id = auth.uid());

CREATE POLICY "quiz_steps_public_read" ON public.quiz_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_funnels qf
      WHERE qf.id = quiz_steps.funnel_id AND qf.status = 'published'
    )
  );

-- ─── quiz_components ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_components (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id          UUID NOT NULL REFERENCES public.quiz_steps(id) ON DELETE CASCADE,
  funnel_id        UUID NOT NULL REFERENCES public.quiz_funnels(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  component_type   TEXT NOT NULL,
  component_order  INT NOT NULL DEFAULT 0,
  config           JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_components_owner" ON public.quiz_components
  USING (user_id = auth.uid());

CREATE POLICY "quiz_components_public_read" ON public.quiz_components
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_funnels qf
      WHERE qf.id = quiz_components.funnel_id AND qf.status = 'published'
    )
  );

-- ─── quiz_submissions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id        UUID NOT NULL REFERENCES public.quiz_funnels(id) ON DELETE CASCADE,
  session_id       TEXT NOT NULL,
  lead_id          UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed')),
  steps_completed  INT NOT NULL DEFAULT 0,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ
);

ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Funnel owner can read submissions
CREATE POLICY "quiz_submissions_owner_read" ON public.quiz_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_funnels qf
      WHERE qf.id = quiz_submissions.funnel_id AND qf.user_id = auth.uid()
    )
  );

-- Anyone (anon) can insert submissions
CREATE POLICY "quiz_submissions_anon_insert" ON public.quiz_submissions
  FOR INSERT WITH CHECK (TRUE);

-- Anyone can update their own submission by session_id (status, steps_completed, completed_at)
CREATE POLICY "quiz_submissions_anon_update" ON public.quiz_submissions
  FOR UPDATE USING (TRUE);

-- ─── quiz_answers ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID NOT NULL REFERENCES public.quiz_submissions(id) ON DELETE CASCADE,
  funnel_id      UUID NOT NULL REFERENCES public.quiz_funnels(id) ON DELETE CASCADE,
  step_id        UUID NOT NULL REFERENCES public.quiz_steps(id) ON DELETE CASCADE,
  component_id   UUID NOT NULL REFERENCES public.quiz_components(id) ON DELETE CASCADE,
  answer_value   JSONB NOT NULL,
  answered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- Funnel owner can read answers
CREATE POLICY "quiz_answers_owner_read" ON public.quiz_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_funnels qf
      WHERE qf.id = quiz_answers.funnel_id AND qf.user_id = auth.uid()
    )
  );

-- Anyone can insert answers
CREATE POLICY "quiz_answers_anon_insert" ON public.quiz_answers
  FOR INSERT WITH CHECK (TRUE);

-- ─── Triggers: updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER quiz_funnels_updated_at
  BEFORE UPDATE ON public.quiz_funnels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER quiz_steps_updated_at
  BEFORE UPDATE ON public.quiz_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER quiz_components_updated_at
  BEFORE UPDATE ON public.quiz_components
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── RPC: increment funnel counters ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.quiz_funnel_increment(
  p_funnel_id UUID,
  p_field     TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_field = 'visits' THEN
    UPDATE public.quiz_funnels SET visits_count = visits_count + 1 WHERE id = p_funnel_id;
  ELSIF p_field = 'responses' THEN
    UPDATE public.quiz_funnels SET responses_count = responses_count + 1 WHERE id = p_funnel_id;
  ELSIF p_field = 'leads' THEN
    UPDATE public.quiz_funnels SET leads_count = leads_count + 1 WHERE id = p_funnel_id;
  ELSIF p_field = 'completions' THEN
    UPDATE public.quiz_funnels SET completions_count = completions_count + 1 WHERE id = p_funnel_id;
  END IF;
END;
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS quiz_funnels_company_id_idx ON public.quiz_funnels (company_id);
CREATE INDEX IF NOT EXISTS quiz_funnels_slug_idx ON public.quiz_funnels (slug);
CREATE INDEX IF NOT EXISTS quiz_steps_funnel_id_idx ON public.quiz_steps (funnel_id, step_order);
CREATE INDEX IF NOT EXISTS quiz_components_step_id_idx ON public.quiz_components (step_id, component_order);
CREATE INDEX IF NOT EXISTS quiz_submissions_funnel_id_idx ON public.quiz_submissions (funnel_id);
CREATE INDEX IF NOT EXISTS quiz_answers_submission_id_idx ON public.quiz_answers (submission_id);
