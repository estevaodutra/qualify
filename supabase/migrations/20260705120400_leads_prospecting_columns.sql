-- =====================================================
-- leads: company-scoped phone dedup guard + qualification columns
-- =====================================================

-- Real DB-level guarantee for "this phone already exists as a lead
-- in this company" -- the prospecting callback still does an explicit
-- SELECT-then-decide before writing (see prospecting-callback), this
-- index is the safety net against races between concurrent callbacks.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_company_phone_unique
  ON public.leads (company_id, phone)
  WHERE company_id IS NOT NULL AND phone IS NOT NULL;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS qualification_score smallint,
  ADD COLUMN IF NOT EXISTS qualification_label text DEFAULT 'sem_analise';

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_qualification_label_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_qualification_label_check CHECK (qualification_label IN (
    'sem_analise', 'baixa', 'media', 'alta'
  ));
