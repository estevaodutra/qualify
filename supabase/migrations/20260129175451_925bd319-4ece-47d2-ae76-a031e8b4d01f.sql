-- Create scheduled_sequence_executions table for idempotency
CREATE TABLE public.scheduled_sequence_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id uuid NOT NULL REFERENCES public.message_sequences(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.group_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time text NOT NULL,
  executed_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'executed',
  error_message text NULL,
  UNIQUE(sequence_id, scheduled_date, scheduled_time)
);

-- Create index for fast lookups
CREATE INDEX idx_scheduled_sequence_executions_lookup 
ON public.scheduled_sequence_executions(sequence_id, scheduled_date, scheduled_time);

-- Enable Row Level Security
ALTER TABLE public.scheduled_sequence_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own scheduled_sequence_executions"
ON public.scheduled_sequence_executions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own scheduled_sequence_executions"
ON public.scheduled_sequence_executions
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own scheduled_sequence_executions"
ON public.scheduled_sequence_executions
FOR UPDATE
USING (user_id = auth.uid());

-- Service role policy for edge functions
CREATE POLICY "Service role can manage all scheduled_sequence_executions"
ON public.scheduled_sequence_executions
FOR ALL
USING (true)
WITH CHECK (true);