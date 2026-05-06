-- Create event_action_rules table
CREATE TABLE IF NOT EXISTS public.event_action_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    intent TEXT,
    conditions JSONB DEFAULT '{}'::jsonb,
    action_type TEXT NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.event_action_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rules"
    ON public.event_action_rules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rules"
    ON public.event_action_rules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
    ON public.event_action_rules FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules"
    ON public.event_action_rules FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups during webhook processing
CREATE INDEX IF NOT EXISTS idx_event_action_rules_event_type ON public.event_action_rules(event_type, is_active);
CREATE INDEX IF NOT EXISTS idx_event_action_rules_user_id ON public.event_action_rules(user_id);
