-- Canonical account identity for new social providers. Existing Instagram data stays in place
-- while its publication, briefing and analytics flows are migrated incrementally.
CREATE TABLE public.criafy_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('INSTAGRAM', 'TIKTOK')),
  provider_account_id text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  connection_status text NOT NULL DEFAULT 'CONNECTED'
    CHECK (connection_status IN ('CONNECTED', 'EXPIRED', 'DISCONNECTED', 'ERROR')),
  legacy_instagram_account_id uuid UNIQUE REFERENCES public.criafy_instagram_accounts(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider, provider_account_id),
  UNIQUE (company_id, id)
);

CREATE INDEX criafy_social_accounts_company_provider_idx
  ON public.criafy_social_accounts(company_id, provider, connection_status);

ALTER TABLE public.criafy_social_accounts ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.criafy_social_accounts FROM anon, authenticated;
GRANT SELECT ON public.criafy_social_accounts TO authenticated;
CREATE POLICY "Members can read their social accounts"
  ON public.criafy_social_accounts FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT company_id FROM public.company_members
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Tokens never appear in public account queries or authenticated RLS policies.
CREATE TABLE public.criafy_tiktok_credentials (
  account_id uuid PRIMARY KEY REFERENCES public.criafy_social_accounts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  access_expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, account_id)
    REFERENCES public.criafy_social_accounts(company_id, id) ON DELETE CASCADE
);

ALTER TABLE public.criafy_tiktok_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.criafy_tiktok_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.criafy_tiktok_credentials TO service_role;

-- Backfill the existing account identity once; Instagram-specific columns remain in their
-- original table until the existing publishing flow is migrated.
INSERT INTO public.criafy_social_accounts
  (company_id, provider, provider_account_id, display_name, avatar_url,
   connection_status, legacy_instagram_account_id, created_by, created_at, updated_at)
SELECT company_id, 'INSTAGRAM', COALESCE(instagram_account_id, id::text),
       COALESCE(name, username), profile_picture_url, connection_status,
       id, created_by, created_at, updated_at
FROM public.criafy_instagram_accounts
ON CONFLICT (legacy_instagram_account_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_criafy_instagram_social_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.criafy_social_accounts
    (company_id, provider, provider_account_id, display_name, avatar_url,
     connection_status, legacy_instagram_account_id, created_by, created_at, updated_at)
  VALUES (NEW.company_id, 'INSTAGRAM', COALESCE(NEW.instagram_account_id, NEW.id::text),
          COALESCE(NEW.name, NEW.username), NEW.profile_picture_url,
          NEW.connection_status, NEW.id, NEW.created_by, NEW.created_at, NEW.updated_at)
  ON CONFLICT (legacy_instagram_account_id) DO UPDATE SET
    provider_account_id = EXCLUDED.provider_account_id,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    connection_status = EXCLUDED.connection_status,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_criafy_instagram_social_account
AFTER INSERT OR UPDATE OF instagram_account_id, username, name, profile_picture_url, connection_status
ON public.criafy_instagram_accounts
FOR EACH ROW EXECUTE FUNCTION public.sync_criafy_instagram_social_account();
