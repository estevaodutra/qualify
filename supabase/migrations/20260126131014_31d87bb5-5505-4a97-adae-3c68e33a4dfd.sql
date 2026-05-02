-- Create sequence_executions table for tracking in-progress sequence executions
-- This allows long delays to be handled via scheduling instead of blocking

CREATE TABLE public.sequence_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.group_campaigns(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.message_sequences(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.group_messages(id) ON DELETE SET NULL,
  trigger_context JSONB DEFAULT '{}'::jsonb,
  current_node_index INTEGER DEFAULT 0,
  nodes_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  destinations JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'paused', 'completed', 'failed')),
  resume_at TIMESTAMPTZ,
  nodes_processed INTEGER DEFAULT 0,
  nodes_failed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sequence_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own sequence_executions" 
  ON public.sequence_executions 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own sequence_executions" 
  ON public.sequence_executions 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sequence_executions" 
  ON public.sequence_executions 
  FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sequence_executions" 
  ON public.sequence_executions 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Create index for efficient queries on pending executions
CREATE INDEX idx_sequence_executions_resume_at 
  ON public.sequence_executions (resume_at) 
  WHERE status = 'paused';

CREATE INDEX idx_sequence_executions_status 
  ON public.sequence_executions (status);

-- Trigger for updated_at
CREATE TRIGGER update_sequence_executions_updated_at
  BEFORE UPDATE ON public.sequence_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();