
-- call_campaigns: retry config
ALTER TABLE call_campaigns ADD COLUMN retry_count integer DEFAULT 3;
ALTER TABLE call_campaigns ADD COLUMN retry_interval_minutes integer DEFAULT 30;
ALTER TABLE call_campaigns ADD COLUMN retry_exceeded_behavior text DEFAULT 'mark_failed';
ALTER TABLE call_campaigns ADD COLUMN retry_exceeded_action_id uuid;

-- call_logs: attempt tracking
ALTER TABLE call_logs ADD COLUMN attempt_number integer DEFAULT 1;
ALTER TABLE call_logs ADD COLUMN max_attempts integer DEFAULT 3;
ALTER TABLE call_logs ADD COLUMN next_retry_at timestamptz;
