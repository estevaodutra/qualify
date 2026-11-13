-- Reuse the existing Criafy publication and attempt history for TikTok Direct Post.
ALTER TABLE public.criafy_publications
  ALTER COLUMN account_id DROP NOT NULL;

ALTER TABLE public.criafy_publications
  ADD COLUMN social_account_id uuid,
  ADD COLUMN tiktok_request_id uuid UNIQUE,
  ADD COLUMN tiktok_publish_id text,
  ADD COLUMN tiktok_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN tiktok_failure_reason text;

ALTER TABLE public.criafy_publications
  ADD CONSTRAINT criafy_publications_social_account_tenant_fk
  FOREIGN KEY (company_id, social_account_id)
  REFERENCES public.criafy_social_accounts(company_id, id);

ALTER TABLE public.criafy_publications
  ADD CONSTRAINT criafy_publications_has_account
  CHECK (account_id IS NOT NULL OR social_account_id IS NOT NULL);

CREATE UNIQUE INDEX criafy_publications_tiktok_publish_id_idx
  ON public.criafy_publications(company_id, tiktok_publish_id)
  WHERE tiktok_publish_id IS NOT NULL;

CREATE INDEX criafy_publications_tiktok_pending_idx
  ON public.criafy_publications(company_id, status, social_account_id)
  WHERE social_account_id IS NOT NULL;
