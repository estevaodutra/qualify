-- Enable pg_cron and pg_net extensions for scheduled execution
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create table to track scheduled message executions (prevent duplicates)
CREATE TABLE public.scheduled_message_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'executed',
  groups_count INTEGER DEFAULT 0,
  user_id UUID NOT NULL,
  UNIQUE(message_id, scheduled_date, scheduled_time)
);

-- Enable RLS
ALTER TABLE public.scheduled_message_executions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own scheduled_message_executions"
ON public.scheduled_message_executions
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own scheduled_message_executions"
ON public.scheduled_message_executions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_scheduled_executions_lookup 
ON public.scheduled_message_executions(message_id, scheduled_date, scheduled_time);