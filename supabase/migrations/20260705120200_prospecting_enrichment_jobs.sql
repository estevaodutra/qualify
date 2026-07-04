-- =====================================================
-- prospecting_enrichment_jobs: one row per (lead, layer, campaign).
-- Each layer is independent -- a failure in one layer (e.g. instagram)
-- never touches/invalidates another layer's row (e.g. google_maps).
-- =====================================================

CREATE TABLE public.prospecting_enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  prospecting_campaign_id uuid NOT NULL REFERENCES public.prospecting_campaigns(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  layer_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  input_data jsonb DEFAULT '{}'::jsonb,
  result_data jsonb DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, layer_type, prospecting_campaign_id)
);

ALTER TABLE public.prospecting_enrichment_jobs
  ADD CONSTRAINT prospecting_enrichment_jobs_layer_type_check CHECK (layer_type IN (
    'google_maps', 'website', 'instagram', 'cnpj', 'corporate_structure'
  ));

ALTER TABLE public.prospecting_enrichment_jobs
  ADD CONSTRAINT prospecting_enrichment_jobs_status_check CHECK (status IN (
    'pending', 'processing', 'completed', 'not_found', 'failed', 'skipped'
  ));

CREATE INDEX idx_enrichment_jobs_campaign ON public.prospecting_enrichment_jobs (prospecting_campaign_id);
CREATE INDEX idx_enrichment_jobs_lead ON public.prospecting_enrichment_jobs (lead_id);
CREATE INDEX idx_enrichment_jobs_pending ON public.prospecting_enrichment_jobs (status) WHERE status IN ('pending', 'processing');

ALTER TABLE public.prospecting_enrichment_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company enrichment_jobs"
  ON public.prospecting_enrichment_jobs FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can manage company enrichment_jobs"
  ON public.prospecting_enrichment_jobs FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
  WITH CHECK (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()));

CREATE TRIGGER update_prospecting_enrichment_jobs_updated_at
  BEFORE UPDATE ON public.prospecting_enrichment_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON TABLE public.prospecting_enrichment_jobs TO authenticated, service_role;
