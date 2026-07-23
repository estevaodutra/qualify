-- Migration: 20260723170000_create_workflow_call_tasks.sql
-- Description: Create workflow_call_tasks table for call panel integration

CREATE TABLE IF NOT EXISTS public.workflow_call_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  workflow_id UUID NOT NULL,
  workflow_execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  result TEXT,
  attempt_count INT DEFAULT 0,
  max_attempts INT DEFAULT 1,
  next_attempt_at TIMESTAMPTZ,
  assigned_operator_id UUID,
  queue_id UUID,
  department_id UUID,
  script TEXT,
  actions JSONB DEFAULT '[]'::jsonb,
  observation TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE public.workflow_call_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own workflow_call_tasks"
  ON public.workflow_call_tasks FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage all workflow_call_tasks"
  ON public.workflow_call_tasks FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_call_tasks_status ON public.workflow_call_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_call_tasks_execution ON public.workflow_call_tasks(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_call_tasks_lead ON public.workflow_call_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_call_tasks_user ON public.workflow_call_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_call_tasks_company ON public.workflow_call_tasks(company_id);

-- Trigger for updated_at
CREATE TRIGGER update_workflow_call_tasks_updated_at
  BEFORE UPDATE ON public.workflow_call_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
