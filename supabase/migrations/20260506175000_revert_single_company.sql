-- 1. Ensure superadmins can manage all companies and wallets (keep this)
-- Already added in previous migration, but reinforcing here if needed.

-- 2. Revert single company membership restriction
-- Drop the user_id unique constraint
ALTER TABLE public.company_members DROP CONSTRAINT IF EXISTS company_members_user_id_unique;

-- Restore the composite unique constraint (company_id, user_id)
-- This allows a user to be in multiple companies, but only once per company.
ALTER TABLE public.company_members DROP CONSTRAINT IF EXISTS company_members_company_id_user_id_key;
ALTER TABLE public.company_members ADD CONSTRAINT company_members_company_id_user_id_key UNIQUE (company_id, user_id);
