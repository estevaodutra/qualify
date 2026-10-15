-- The OAuth callback uses this exact conflict target for an idempotent upsert.
-- Abort with a useful message instead of silently keeping ambiguous duplicates.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.criafy_instagram_accounts
    WHERE instagram_account_id IS NOT NULL
    GROUP BY company_id, instagram_account_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate Criafy Instagram accounts exist for (company_id, instagram_account_id); merge them before applying this migration.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'criafy_instagram_accounts_company_instagram_key'
      AND conrelid = 'public.criafy_instagram_accounts'::regclass
  ) THEN
    ALTER TABLE public.criafy_instagram_accounts
      ADD CONSTRAINT criafy_instagram_accounts_company_instagram_key
      UNIQUE (company_id, instagram_account_id);
  END IF;
END
$$;
