-- Migration: 20260722173500_leads_journey_tracking.sql
-- Description: Adds tracking fields to quiz_submissions, uniqueness constraint to quiz_answers, and quiz_step_sessions table.

-- 1. quiz_submissions table updates
ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS public_id TEXT,
  ADD COLUMN IF NOT EXISTS steps_viewed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS progress_percentage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_duration_seconds INT,
  ADD COLUMN IF NOT EXISTS entry_url TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS operating_system TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Backfill existing submissions' company_id and public_id
UPDATE public.quiz_submissions qs
SET company_id = qf.company_id
FROM public.quiz_funnels qf
WHERE qs.funnel_id = qf.id AND qs.company_id IS NULL;

UPDATE public.quiz_submissions
SET public_id = 'QZ-' || upper(substring(md5(id::text) from 1 for 6))
WHERE public_id IS NULL;

-- 3. Make public_id NOT NULL and UNIQUE (now that they are backfilled)
ALTER TABLE public.quiz_submissions 
  ALTER COLUMN public_id SET NOT NULL,
  ADD CONSTRAINT quiz_submissions_public_id_unique UNIQUE (public_id);

-- 4. Update check status constraint
ALTER TABLE public.quiz_submissions DROP CONSTRAINT IF EXISTS quiz_submissions_status_check;
ALTER TABLE public.quiz_submissions ADD CONSTRAINT quiz_submissions_status_check 
  CHECK (status IN ('anonymous', 'started', 'identified', 'completed', 'abandoned', 'disqualified', 'error'));

-- 5. Trigger for public_id auto-generation
CREATE OR REPLACE FUNCTION generate_quiz_public_id()
RETURNS TRIGGER AS $$
DECLARE
  new_id TEXT;
  done BOOL := FALSE;
  attempts INT := 0;
BEGIN
  IF NEW.public_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  WHILE NOT done AND attempts < 100 LOOP
    new_id := 'QZ-' || upper(substring(md5(random()::text) from 1 for 6));
    IF NOT EXISTS (SELECT 1 FROM public.quiz_submissions WHERE public_id = new_id) THEN
      done := TRUE;
    END IF;
    attempts := attempts + 1;
  END LOOP;
  
  IF NOT done THEN
    new_id := 'QZ-' || upper(substring(md5(NEW.id::text) from 1 for 6));
  END IF;
  
  NEW.public_id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quiz_submissions_public_id ON public.quiz_submissions;
CREATE TRIGGER trg_quiz_submissions_public_id
  BEFORE INSERT ON public.quiz_submissions
  FOR EACH ROW
  EXECUTE FUNCTION generate_quiz_public_id();

-- 6. quiz_answers updates
ALTER TABLE public.quiz_answers
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill company_id on quiz_answers
UPDATE public.quiz_answers qa
SET company_id = qf.company_id
FROM public.quiz_funnels qf
WHERE qa.funnel_id = qf.id AND qa.company_id IS NULL;

-- Unique constraint for upsert
ALTER TABLE public.quiz_answers DROP CONSTRAINT IF EXISTS quiz_answers_submission_component_unique;
ALTER TABLE public.quiz_answers ADD CONSTRAINT quiz_answers_submission_component_unique UNIQUE (submission_id, component_id);

-- 7. Create quiz_step_sessions table
CREATE TABLE IF NOT EXISTS public.quiz_step_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES public.quiz_funnels(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.quiz_submissions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.quiz_steps(id) ON DELETE CASCADE,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  duration_seconds INT,
  exit_type TEXT CHECK (exit_type IN ('next', 'back', 'abandon', 'completed'))
);

-- 8. Enable RLS and setup policies for quiz_step_sessions
ALTER TABLE public.quiz_step_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_step_sessions_owner_read" ON public.quiz_step_sessions;
CREATE POLICY "quiz_step_sessions_owner_read" ON public.quiz_step_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_funnels qf
      WHERE qf.id = quiz_step_sessions.funnel_id AND (
        qf.user_id = auth.uid() OR
        qf.company_id IN (
          SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "quiz_step_sessions_anon_insert" ON public.quiz_step_sessions;
CREATE POLICY "quiz_step_sessions_anon_insert" ON public.quiz_step_sessions
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "quiz_step_sessions_anon_update" ON public.quiz_step_sessions;
CREATE POLICY "quiz_step_sessions_anon_update" ON public.quiz_step_sessions
  FOR UPDATE USING (TRUE);

-- 9. Update/re-create RLS for quiz_submissions and quiz_events to be fully company-safe
DROP POLICY IF EXISTS "quiz_submissions_owner_read" ON public.quiz_submissions;
CREATE POLICY "quiz_submissions_owner_read" ON public.quiz_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_funnels qf
      WHERE qf.id = quiz_submissions.funnel_id AND (
        qf.user_id = auth.uid() OR
        qf.company_id IN (
          SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "quiz_submissions_anon_update" ON public.quiz_submissions;
CREATE POLICY "quiz_submissions_anon_update" ON public.quiz_submissions
  FOR UPDATE USING (TRUE);

DROP POLICY IF EXISTS "quiz_events_owner_read" ON public.quiz_events;
CREATE POLICY "quiz_events_owner_read" ON public.quiz_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_funnels qf
      WHERE qf.id = quiz_events.funnel_id AND (
        qf.user_id = auth.uid() OR
        qf.company_id IN (
          SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
        )
      )
    )
  );

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS quiz_submissions_company_idx ON public.quiz_submissions (company_id);
CREATE INDEX IF NOT EXISTS quiz_submissions_funnel_idx ON public.quiz_submissions (funnel_id, started_at DESC);
CREATE INDEX IF NOT EXISTS quiz_submissions_public_id_idx ON public.quiz_submissions (public_id);
CREATE INDEX IF NOT EXISTS quiz_step_sessions_submission_idx ON public.quiz_step_sessions (submission_id);
CREATE INDEX IF NOT EXISTS quiz_events_submission_idx ON public.quiz_events (submission_id);
CREATE INDEX IF NOT EXISTS quiz_answers_submission_component_idx ON public.quiz_answers (submission_id, component_id);
