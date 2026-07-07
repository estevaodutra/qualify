-- 1. Create pipelines
CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_pipelines_company ON public.pipelines(company_id);

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can view pipelines" ON public.pipelines 
  FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "Company admins can manage pipelines" ON public.pipelines 
  FOR ALL TO authenticated USING (public.is_company_admin(company_id, auth.uid())) WITH CHECK (public.is_company_admin(company_id, auth.uid()));

-- Insert default pipeline for existing companies
INSERT INTO public.pipelines (company_id, name)
SELECT id, 'Pipeline Padrão' FROM public.companies ON CONFLICT DO NOTHING;

-- 2. Alter pipeline_stages to add pipeline_id
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE CASCADE;

-- Backfill pipeline_id on pipeline_stages
UPDATE public.pipeline_stages s
SET pipeline_id = (SELECT id FROM public.pipelines p WHERE p.company_id = s.company_id LIMIT 1)
WHERE pipeline_id IS NULL;

-- 3. Create deals
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'open', -- open, won, lost, archived
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium',
  probability INT DEFAULT 0,
  expected_close_date DATE,
  last_activity_at TIMESTAMPTZ,
  next_activity_at TIMESTAMPTZ,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,
  lost_reason_id UUID,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_deals_company ON public.deals(company_id);
CREATE INDEX idx_deals_lead ON public.deals(lead_id);
CREATE INDEX idx_deals_pipeline ON public.deals(pipeline_id);
CREATE INDEX idx_deals_stage ON public.deals(stage_id);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage deals" ON public.deals
  FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));

-- Backfill deals from leads
INSERT INTO public.deals (company_id, lead_id, pipeline_id, stage_id, title, status)
SELECT 
  l.company_id, 
  l.id as lead_id, 
  s.pipeline_id, 
  l.pipeline_stage_id, 
  COALESCE(l.name, 'Negócio ' || COALESCE(l.phone, l.id::text)), 
  'open'
FROM public.leads l
JOIN public.pipeline_stages s ON s.id = l.pipeline_stage_id
WHERE l.pipeline_stage_id IS NOT NULL AND l.company_id IS NOT NULL;

-- Remove pipeline_stage_id from leads
ALTER TABLE public.leads DROP COLUMN IF EXISTS pipeline_stage_id;

-- 4. Alter leads to add missing fields for unified pattern
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_activity_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 5. Create lead_notes
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_lead_notes_company ON public.lead_notes(company_id);
CREATE INDEX idx_lead_notes_lead ON public.lead_notes(lead_id);
CREATE INDEX idx_lead_notes_deal ON public.lead_notes(deal_id);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage lead notes" ON public.lead_notes
  FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));

-- 6. Create activities
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_activities_company ON public.activities(company_id);
CREATE INDEX idx_activities_lead ON public.activities(lead_id);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage activities" ON public.activities
  FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));

-- 7. Create lead_history
CREATE TABLE IF NOT EXISTS public.lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_lead_history_company ON public.lead_history(company_id);
CREATE INDEX idx_lead_history_lead ON public.lead_history(lead_id);

ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can view lead history" ON public.lead_history
  FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
CREATE POLICY "System can insert lead history" ON public.lead_history
  FOR INSERT TO authenticated WITH CHECK (public.is_company_member(company_id, auth.uid()));

-- 8. Realtime Publications
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;
