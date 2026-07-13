-- 1. Create pipeline_groups table
CREATE TABLE IF NOT EXISTS public.pipeline_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_collapsed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pipeline_groups_company_order_idx
ON public.pipeline_groups(company_id, order_index);

ALTER TABLE public.pipeline_groups ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.pipeline_groups TO authenticated, service_role, anon;

CREATE POLICY "Company members can view pipeline groups" ON public.pipeline_groups
  FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Company members can manage pipeline groups" ON public.pipeline_groups
  FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));

-- 2. Alter pipelines table
ALTER TABLE public.pipelines
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.pipeline_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS pipelines_company_group_order_idx
ON public.pipelines(company_id, group_id, order_index);

-- 3. Alter pipeline_stages table
ALTER TABLE public.pipeline_stages
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS stage_type TEXT NOT NULL DEFAULT 'open',
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS pipeline_stages_pipeline_order_idx
ON public.pipeline_stages(pipeline_id, order_index);

-- 4. Create default groups for existing companies and link existing pipelines
DO $$
DECLARE
  v_company_record RECORD;
  v_group_id UUID;
BEGIN
  FOR v_company_record IN SELECT id FROM public.companies LOOP
    -- Create default group if not exists
    SELECT id INTO v_group_id FROM public.pipeline_groups WHERE company_id = v_company_record.id AND name = 'Geral' LIMIT 1;
    
    IF v_group_id IS NULL THEN
      INSERT INTO public.pipeline_groups (company_id, name)
      VALUES (v_company_record.id, 'Geral')
      RETURNING id INTO v_group_id;
    END IF;

    -- Update existing pipelines without group
    UPDATE public.pipelines
    SET group_id = v_group_id
    WHERE company_id = v_company_record.id AND group_id IS NULL;
  END LOOP;
END;
$$;
