-- Migration: 20260725160000_create_workflow_ura_tasks.sql
-- Description: Create workflow_ura_tasks table for IVR/URA workflow node integration

CREATE TABLE IF NOT EXISTS public.workflow_ura_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  workflow_id UUID NOT NULL,
  workflow_execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  provider TEXT DEFAULT 'mos_br',
  mos_campaign_id INT,
  mos_call_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INT DEFAULT 0,
  max_attempts INT DEFAULT 1,
  next_attempt_at TIMESTAMPTZ,
  audio_type TEXT,
  audio_value TEXT,
  dtmf_actions JSONB DEFAULT '[]'::jsonb,
  dtmf_pressed TEXT,
  result TEXT,
  duration_seconds INT,
  cause_name TEXT,
  cost_value NUMERIC(10, 4),
  raw_callback JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- RLS policies
ALTER TABLE public.workflow_ura_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view workflow_ura_tasks"
  ON public.workflow_ura_tasks FOR SELECT
  TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Company members can insert workflow_ura_tasks"
  ON public.workflow_ura_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Company members can update workflow_ura_tasks"
  ON public.workflow_ura_tasks FOR UPDATE
  TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Company members can delete workflow_ura_tasks"
  ON public.workflow_ura_tasks FOR DELETE
  TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

-- Service role privileges
CREATE POLICY "Service role can manage all workflow_ura_tasks"
  ON public.workflow_ura_tasks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_ura_tasks_status ON public.workflow_ura_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_ura_tasks_execution ON public.workflow_ura_tasks(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_ura_tasks_lead ON public.workflow_ura_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_ura_tasks_user ON public.workflow_ura_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_ura_tasks_company ON public.workflow_ura_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_ura_tasks_mos_call ON public.workflow_ura_tasks(mos_call_id);
CREATE INDEX IF NOT EXISTS idx_workflow_ura_tasks_mos_campaign ON public.workflow_ura_tasks(mos_campaign_id);

-- Trigger for updated_at
CREATE TRIGGER update_workflow_ura_tasks_updated_at
  BEFORE UPDATE ON public.workflow_ura_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant privileges to access roles
GRANT ALL ON TABLE public.workflow_ura_tasks TO postgres;
GRANT ALL ON TABLE public.workflow_ura_tasks TO service_role;
GRANT ALL ON TABLE public.workflow_ura_tasks TO authenticated;
GRANT ALL ON TABLE public.workflow_ura_tasks TO anon;

NOTIFY pgrst, 'reload schema';
