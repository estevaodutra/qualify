-- Migration for Quick Replies (Respostas Rápidas Multimídia)

CREATE TABLE IF NOT EXISTS public.quick_reply_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.quick_reply_groups(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  shortcut TEXT NOT NULL,
  normalized_shortcut TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quick_replies_company_shortcut_unique UNIQUE (company_id, normalized_shortcut)
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_quick_reply_groups_company ON public.quick_reply_groups (company_id, position);
CREATE INDEX IF NOT EXISTS idx_quick_replies_company ON public.quick_replies (company_id, position);
CREATE INDEX IF NOT EXISTS idx_quick_replies_group ON public.quick_replies (group_id);
CREATE INDEX IF NOT EXISTS idx_quick_replies_shortcut ON public.quick_replies (company_id, normalized_shortcut);
CREATE INDEX IF NOT EXISTS idx_quick_replies_usage ON public.quick_replies (company_id, usage_count DESC);

-- Enable RLS
ALTER TABLE public.quick_reply_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- Drop old policies if existing to avoid conflicts
DROP POLICY IF EXISTS "Users can view quick reply groups of their company" ON public.quick_reply_groups;
DROP POLICY IF EXISTS "Users can insert quick reply groups of their company" ON public.quick_reply_groups;
DROP POLICY IF EXISTS "Users can update quick reply groups of their company" ON public.quick_reply_groups;
DROP POLICY IF EXISTS "Users can delete quick reply groups of their company" ON public.quick_reply_groups;
DROP POLICY IF EXISTS "Users can manage quick reply groups" ON public.quick_reply_groups;

DROP POLICY IF EXISTS "Users can view quick replies of their company" ON public.quick_replies;
DROP POLICY IF EXISTS "Users can insert quick replies of their company" ON public.quick_replies;
DROP POLICY IF EXISTS "Users can update quick replies of their company" ON public.quick_replies;
DROP POLICY IF EXISTS "Users can delete quick replies of their company" ON public.quick_replies;
DROP POLICY IF EXISTS "Users can manage quick replies" ON public.quick_replies;

-- Clean policies based on company_members
CREATE POLICY "Users can manage quick reply groups"
  ON public.quick_reply_groups
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can manage quick replies"
  ON public.quick_replies
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- RPC for incrementing quick reply usage
CREATE OR REPLACE FUNCTION public.increment_quick_reply_usage(reply_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.quick_replies
  SET usage_count = usage_count + 1,
      last_used_at = now()
  WHERE id = reply_id;
END;
$$;
