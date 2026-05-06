-- Create API Keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    last_four TEXT NOT NULL,
    environment TEXT DEFAULT 'production' CHECK (environment IN ('production', 'development')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own API keys" 
    ON public.api_keys FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete (revoke) their own API keys" 
    ON public.api_keys FOR UPDATE 
    USING (auth.uid() = user_id);

-- Only Edge Function (Service Role) can insert/update, 
-- but users can see metadata via the above policies.
