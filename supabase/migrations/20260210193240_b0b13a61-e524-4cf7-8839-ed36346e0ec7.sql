
-- 1. New columns on call_campaigns
ALTER TABLE call_campaigns ADD COLUMN queue_execution_enabled boolean DEFAULT false;
ALTER TABLE call_campaigns ADD COLUMN queue_interval_seconds integer DEFAULT 30;
ALTER TABLE call_campaigns ADD COLUMN queue_unavailable_behavior text DEFAULT 'wait';

-- 2. New columns on call_campaign_operators
ALTER TABLE call_campaign_operators ADD COLUMN status text DEFAULT 'offline';
ALTER TABLE call_campaign_operators ADD COLUMN current_call_id uuid;
ALTER TABLE call_campaign_operators ADD COLUMN personal_interval_seconds integer;
ALTER TABLE call_campaign_operators ADD COLUMN last_call_ended_at timestamptz;

-- 3. New table: queue_execution_state
CREATE TABLE queue_execution_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES call_campaigns(id) ON DELETE CASCADE UNIQUE,
  user_id uuid NOT NULL,
  status text DEFAULT 'stopped',
  current_position integer DEFAULT 0,
  last_dial_at timestamptz,
  session_started_at timestamptz,
  calls_made integer DEFAULT 0,
  calls_answered integer DEFAULT 0,
  calls_no_answer integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE queue_execution_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own queue_execution_state"
  ON queue_execution_state FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_queue_execution_state_updated_at
  BEFORE UPDATE ON queue_execution_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE queue_execution_state;
