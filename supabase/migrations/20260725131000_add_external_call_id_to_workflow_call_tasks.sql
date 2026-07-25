-- Migration: add external_call_id column to workflow_call_tasks
ALTER TABLE public.workflow_call_tasks ADD COLUMN IF NOT EXISTS external_call_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_workflow_call_tasks_external_id ON public.workflow_call_tasks(external_call_id);
