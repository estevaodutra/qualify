-- Migration: Support for Native API4COM Webphone
-- Adds credentials and settings to call_operators and tracking columns to call_logs

ALTER TABLE public.call_operators
  ADD COLUMN IF NOT EXISTS api4com_token TEXT,
  ADD COLUMN IF NOT EXISTS sip_domain TEXT,
  ADD COLUMN IF NOT EXISTS sip_password TEXT,
  ADD COLUMN IF NOT EXISTS sip_integration_id BIGINT,
  ADD COLUMN IF NOT EXISTS webphone_settings JSONB DEFAULT '{
    "autoAnswer": true,
    "ringVolume": 0.8
  }'::jsonb;

-- Add tracking columns for API4COM call lifecycle
ALTER TABLE public.call_logs
  ADD COLUMN IF NOT EXISTS hangup_cause TEXT,
  ADD COLUMN IF NOT EXISTS hangup_cause_code TEXT,
  ADD COLUMN IF NOT EXISTS api4com_metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_operators_extension ON public.call_operators(extension);
CREATE INDEX IF NOT EXISTS idx_call_logs_external_call_id ON public.call_logs(external_call_id);
