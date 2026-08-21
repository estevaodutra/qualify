-- Migration: Create tag_groups table and enhance tags table
CREATE TABLE IF NOT EXISTS public.tag_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for tag_groups
ALTER TABLE public.tag_groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view tag_groups of their company"
    ON public.tag_groups FOR SELECT
    USING (company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert tag_groups in their company"
    ON public.tag_groups FOR INSERT
    WITH CHECK (company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update tag_groups in their company"
    ON public.tag_groups FOR UPDATE
    USING (company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete tag_groups in their company"
    ON public.tag_groups FOR DELETE
    USING (company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ensure public.tags table exists
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#8A3CFF',
  description TEXT,
  group_id UUID REFERENCES public.tag_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add group_id and description to public.tags if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'group_id') THEN
    ALTER TABLE public.tags ADD COLUMN group_id UUID REFERENCES public.tag_groups(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'description') THEN
    ALTER TABLE public.tags ADD COLUMN description TEXT;
  END IF;
END $$;

-- Enable RLS for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view tags of their company"
    ON public.tags FOR SELECT
    USING (company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert tags in their company"
    ON public.tags FOR INSERT
    WITH CHECK (company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update tags in their company"
    ON public.tags FOR UPDATE
    USING (company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete tags in their company"
    ON public.tags FOR DELETE
    USING (company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
