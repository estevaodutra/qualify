-- Create webhook_events table for storing incoming WhatsApp events
CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Origin
    source TEXT NOT NULL DEFAULT 'z-api',
    external_instance_id TEXT NOT NULL,
    instance_id UUID,
    
    -- Classification
    event_type TEXT NOT NULL DEFAULT 'unknown',
    event_subtype TEXT,
    classification TEXT DEFAULT 'pending',
    
    -- Extracted context
    chat_jid TEXT,
    chat_type TEXT,
    chat_name TEXT,
    sender_phone TEXT,
    sender_name TEXT,
    message_id TEXT,
    
    -- Payload
    raw_event JSONB NOT NULL,
    
    -- Processing
    processing_status TEXT DEFAULT 'pending',
    processing_result JSONB,
    processing_error TEXT,
    
    -- Timestamps
    event_timestamp TIMESTAMPTZ,
    received_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX idx_webhook_events_event_type ON public.webhook_events(event_type);
CREATE INDEX idx_webhook_events_instance ON public.webhook_events(external_instance_id);
CREATE INDEX idx_webhook_events_classification ON public.webhook_events(classification);
CREATE INDEX idx_webhook_events_processing ON public.webhook_events(processing_status);
CREATE INDEX idx_webhook_events_received ON public.webhook_events(received_at DESC);
CREATE INDEX idx_webhook_events_chat ON public.webhook_events(chat_jid);
CREATE INDEX idx_webhook_events_sender ON public.webhook_events(sender_phone);
CREATE INDEX idx_webhook_events_user ON public.webhook_events(user_id);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own webhook_events"
ON public.webhook_events FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create own webhook_events"
ON public.webhook_events FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own webhook_events"
ON public.webhook_events FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own webhook_events"
ON public.webhook_events FOR DELETE
USING (user_id = auth.uid());