-- Migration: Create chat_saved_filters table for personal saved chat filter presets
CREATE TABLE IF NOT EXISTS public.chat_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_saved_filters_company_user_idx
ON public.chat_saved_filters(company_id, user_id, last_used_at DESC);

ALTER TABLE public.chat_saved_filters ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.chat_saved_filters TO authenticated, service_role, anon;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_saved_filters' AND policyname = 'Users can view their own saved filters in company'
  ) THEN
    CREATE POLICY "Users can view their own saved filters in company" ON public.chat_saved_filters
      FOR SELECT TO authenticated
      USING (public.is_company_member(company_id, auth.uid()) AND user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_saved_filters' AND policyname = 'Users can manage their own saved filters in company'
  ) THEN
    CREATE POLICY "Users can manage their own saved filters in company" ON public.chat_saved_filters
      FOR ALL TO authenticated
      USING (public.is_company_member(company_id, auth.uid()) AND user_id = auth.uid())
      WITH CHECK (public.is_company_member(company_id, auth.uid()) AND user_id = auth.uid());
  END IF;
END;
$$;
