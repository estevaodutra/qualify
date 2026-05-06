-- 1. Allow superadmins to create companies with any owner
CREATE POLICY "Superadmin can insert companies"
  ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()));

-- 2. Enforce single company membership per user
-- First, drop the existing composite unique constraint
ALTER TABLE public.company_members DROP CONSTRAINT IF EXISTS company_members_company_id_user_id_key;

-- Then, add a unique constraint on user_id alone
-- This ensures a user can only be in one company at a time.
-- Note: If there are already users in multiple companies, this might fail unless duplicates are removed.
ALTER TABLE public.company_members ADD CONSTRAINT company_members_user_id_unique UNIQUE (user_id);

-- 3. Also allow superadmins to manage wallets directly
CREATE POLICY "Superadmin can insert wallets"
  ON public.wallets FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update wallets"
  ON public.wallets FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()));
