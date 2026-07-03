-- Workflow execution history: one row per real run of a sequence (message or
-- dispatch), plus one row per node visited during that run. This is separate
-- from `sequence_executions`, which only tracks the subset of runs paused by
-- a long delay node and is left untouched here so its resume mechanism keeps
-- working exactly as before.

CREATE TABLE public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  sequence_id UUID NOT NULL,
  sequence_type TEXT NOT NULL CHECK (sequence_type IN ('message', 'dispatch')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'error', 'waiting', 'cancelled')),
  trigger_type TEXT,
  trigger_payload JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.workflow_node_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('success', 'error', 'running', 'not_executed')),
  input JSONB,
  output JSONB,
  logs JSONB,
  error JSONB,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_executions_sequence_id ON public.workflow_executions (sequence_id, started_at DESC);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions (status);
CREATE INDEX idx_workflow_node_executions_execution_id ON public.workflow_node_executions (execution_id);

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_node_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: same single-owner model as sequence_executions
CREATE POLICY "Users can view own workflow_executions"
  ON public.workflow_executions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own workflow_executions"
  ON public.workflow_executions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workflow_executions"
  ON public.workflow_executions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own workflow_executions"
  ON public.workflow_executions
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own workflow_node_executions"
  ON public.workflow_node_executions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own workflow_node_executions"
  ON public.workflow_node_executions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workflow_node_executions"
  ON public.workflow_node_executions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own workflow_node_executions"
  ON public.workflow_node_executions
  FOR DELETE
  USING (user_id = auth.uid());

CREATE TRIGGER update_workflow_executions_updated_at
  BEFORE UPDATE ON public.workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
