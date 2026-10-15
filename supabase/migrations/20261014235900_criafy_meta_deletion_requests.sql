-- Meta data deletion confirmations. Service role only; no authenticated client policies.
CREATE TABLE IF NOT EXISTS public.criafy_meta_deletion_requests (
  id UUID PRIMARY KEY,
  meta_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PROCESSING', 'COMPLETED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.criafy_meta_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_criafy_meta_deletion_requested ON public.criafy_meta_deletion_requests(requested_at);
