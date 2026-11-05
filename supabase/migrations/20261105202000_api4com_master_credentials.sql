-- Migration: Set API4COM Master Credentials and Configuration
-- Stores perpetual admin master token for automated user & extension provisioning

INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'api4com_master_config',
  jsonb_build_object(
    'admin_token', '043yV21WZWJuYVyWPEsQJ6Rwn31IokCwI5GxZgmhpkya59OR1enk8GEq8ebdrhT4',
    'default_domain', 'd2x.api4com.com',
    'admin_email', 'comercial@d2xnegociosdigitais.com',
    'account_id', 'a46c9733-196a-47ed-b911-83c1e6bc1561'
  ),
  'Configurações e token mestre da API4COM para provisionamento automático de usuários'
)
ON CONFLICT (key) DO UPDATE
SET
  value = EXCLUDED.value,
  updated_at = NOW();
