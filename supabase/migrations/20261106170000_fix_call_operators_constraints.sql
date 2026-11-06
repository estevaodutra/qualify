-- Migration: Drop invalid (user_id, extension) constraint and sync all call_operators
ALTER TABLE public.call_operators DROP CONSTRAINT IF EXISTS call_operators_user_id_extension_key;

-- Ensure an extension is unique per company, not globally per user across all companies
ALTER TABLE public.call_operators DROP CONSTRAINT IF EXISTS call_operators_company_id_extension_key;
ALTER TABLE public.call_operators ADD CONSTRAINT call_operators_company_id_extension_key UNIQUE (company_id, extension);

-- Sync all call_operators with their profile tokens and passwords
UPDATE public.call_operators co
SET
  api4com_token = p.api4com_token,
  extension = p.api4com_extension,
  sip_domain = p.api4com_domain,
  sip_password = p.api4com_password,
  updated_at = NOW()
FROM public.profiles p
WHERE co.user_id = p.id
  AND p.api4com_token IS NOT NULL;
