CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events (received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_classification ON webhook_events (classification);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processing_status ON webhook_events (processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type_received ON webhook_events (event_type, received_at);