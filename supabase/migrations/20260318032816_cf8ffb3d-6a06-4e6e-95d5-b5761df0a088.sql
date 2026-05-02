
ALTER TABLE webhook_events
ADD COLUMN IF NOT EXISTS direction text DEFAULT 'system',
ADD COLUMN IF NOT EXISTS confidence text DEFAULT 'low',
ADD COLUMN IF NOT EXISTS matched_rule text;

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processing_status ON webhook_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_sender_phone ON webhook_events(sender_phone);
CREATE INDEX IF NOT EXISTS idx_webhook_events_confidence ON webhook_events(confidence);
