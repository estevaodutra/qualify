-- Migration: 20260723020800_fix_anon_rls_policies.sql
-- Description: Fix RLS policies to allow anonymous/public visitors to SELECT their submissions/step sessions and UPDATE (UPSERT) answers.

-- 1. Permissões de SELECT para visitantes anônimos em quiz_submissions
-- (Necessário para que a página consulte e atualize o status da própria submissão)
DROP POLICY IF EXISTS "quiz_submissions_anon_select" ON public.quiz_submissions;
CREATE POLICY "quiz_submissions_anon_select" ON public.quiz_submissions
  FOR SELECT USING (TRUE);

-- 2. Permissões de SELECT e UPDATE para visitantes anônimos em quiz_answers
-- (Necessário para gravação via UPSERT de respostas do quiz)
DROP POLICY IF EXISTS "quiz_answers_anon_select" ON public.quiz_answers;
CREATE POLICY "quiz_answers_anon_select" ON public.quiz_answers
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "quiz_answers_anon_update" ON public.quiz_answers;
CREATE POLICY "quiz_answers_anon_update" ON public.quiz_answers
  FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- 3. Permissões de SELECT para visitantes anônimos em quiz_step_sessions
-- (Necessário para encontrar e fechar a sessão da etapa ao avançar)
DROP POLICY IF EXISTS "quiz_step_sessions_anon_select" ON public.quiz_step_sessions;
CREATE POLICY "quiz_step_sessions_anon_select" ON public.quiz_step_sessions
  FOR SELECT USING (TRUE);
