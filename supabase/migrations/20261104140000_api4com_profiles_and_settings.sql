-- Migration: Add API4COM token and SIP information to profiles
-- Allows every platform user to have their API4COM user and token tracked and provisioned

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS api4com_token TEXT,
  ADD COLUMN IF NOT EXISTS api4com_extension TEXT,
  ADD COLUMN IF NOT EXISTS api4com_domain TEXT,
  ADD COLUMN IF NOT EXISTS api4com_password TEXT,
  ADD COLUMN IF NOT EXISTS api4com_user_id TEXT,
  ADD COLUMN IF NOT EXISTS api4com_synced_at TIMESTAMPTZ;

-- Add index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_api4com_token ON public.profiles(api4com_token);
CREATE INDEX IF NOT EXISTS idx_profiles_api4com_extension ON public.profiles(api4com_extension);

-- Initialize platform setting for API4COM master configuration
INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'api4com_master_config',
  '{"admin_token": "", "default_domain": "qualify.api4com.com"}'::jsonb,
  'Configurações e token mestre da API4COM para provisionamento automático de usuários'
)
ON CONFLICT (key) DO NOTHING;
