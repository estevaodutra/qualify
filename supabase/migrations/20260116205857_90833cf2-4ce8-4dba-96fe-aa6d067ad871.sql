-- Create api_keys table for storing API authentication keys
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_four TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'test')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Policies for api_keys (public access for now, can be restricted later with auth)
CREATE POLICY "Allow public read of api_keys"
ON public.api_keys
FOR SELECT
USING (true);

CREATE POLICY "Allow public insert of api_keys"
ON public.api_keys
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update of api_keys"
ON public.api_keys
FOR UPDATE
USING (true);

-- Create index for faster key lookups by hash
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);

-- Create index for environment filtering
CREATE INDEX idx_api_keys_environment ON public.api_keys(environment);