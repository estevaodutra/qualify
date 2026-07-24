-- Migration: 20260724001000_fix_quiz_events_and_privileges.sql
-- Description: Add missing session_id column to quiz_events and grant table privileges to Supabase API roles.

-- 1. Adicionar coluna session_id se ela não existir
ALTER TABLE public.quiz_events ADD COLUMN IF NOT EXISTS session_id UUID;

-- 2. Conceder privilégios completos de tabela para as roles de acesso do Supabase
GRANT ALL ON TABLE public.quiz_submissions TO postgres;
GRANT ALL ON TABLE public.quiz_submissions TO service_role;
GRANT ALL ON TABLE public.quiz_submissions TO authenticated;
GRANT ALL ON TABLE public.quiz_submissions TO anon;

GRANT ALL ON TABLE public.quiz_answers TO postgres;
GRANT ALL ON TABLE public.quiz_answers TO service_role;
GRANT ALL ON TABLE public.quiz_answers TO authenticated;
GRANT ALL ON TABLE public.quiz_answers TO anon;

GRANT ALL ON TABLE public.quiz_step_sessions TO postgres;
GRANT ALL ON TABLE public.quiz_step_sessions TO service_role;
GRANT ALL ON TABLE public.quiz_step_sessions TO authenticated;
GRANT ALL ON TABLE public.quiz_step_sessions TO anon;

GRANT ALL ON TABLE public.quiz_events TO postgres;
GRANT ALL ON TABLE public.quiz_events TO service_role;
GRANT ALL ON TABLE public.quiz_events TO authenticated;
GRANT ALL ON TABLE public.quiz_events TO anon;

-- 3. Atualizar cache de tabelas do PostgREST
NOTIFY pgrst, 'reload schema';
