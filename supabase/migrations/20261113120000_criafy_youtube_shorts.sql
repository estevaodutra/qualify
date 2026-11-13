ALTER TABLE public.criafy_social_accounts
  DROP CONSTRAINT criafy_social_accounts_provider_check;
ALTER TABLE public.criafy_social_accounts
  ADD CONSTRAINT criafy_social_accounts_provider_check
  CHECK (provider IN ('INSTAGRAM', 'TIKTOK', 'YOUTUBE'));

CREATE TABLE public.criafy_youtube_credentials (
  account_id uuid PRIMARY KEY REFERENCES public.criafy_social_accounts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  access_expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, account_id)
    REFERENCES public.criafy_social_accounts(company_id, id) ON DELETE CASCADE
);
ALTER TABLE public.criafy_youtube_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.criafy_youtube_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.criafy_youtube_credentials TO service_role;

ALTER TABLE public.criafy_publications
  ADD COLUMN youtube_request_id uuid UNIQUE,
  ADD COLUMN youtube_video_id text,
  ADD COLUMN youtube_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN youtube_failure_reason text,
  ADD COLUMN youtube_uploaded_bytes bigint NOT NULL DEFAULT 0;

CREATE TABLE public.criafy_youtube_upload_sessions (
  publication_id uuid PRIMARY KEY REFERENCES public.criafy_publications(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  upload_url text NOT NULL,
  next_byte bigint NOT NULL DEFAULT 0,
  total_size bigint NOT NULL,
  mime_type text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.criafy_youtube_upload_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.criafy_youtube_upload_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.criafy_youtube_upload_sessions TO service_role;
CREATE INDEX criafy_youtube_pending_idx ON public.criafy_publications(company_id, status, social_account_id)
  WHERE publication_type = 'YOUTUBE_SHORT';
