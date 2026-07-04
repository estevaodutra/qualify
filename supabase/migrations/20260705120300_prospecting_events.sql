-- =====================================================
-- prospecting_events: append-only lifecycle/timeline log,
-- used to drive the monitoring UI's "última ação" column
-- and future webhook/notification fan-out. Not a state
-- machine -- prospecting_campaigns/prospecting_queue/
-- prospecting_enrichment_jobs remain the source of truth.
-- =====================================================

CREATE TABLE public.prospecting_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  prospecting_campaign_id uuid NOT NULL REFERENCES public.prospecting_campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospecting_events_campaign ON public.prospecting_events (prospecting_campaign_id, created_at DESC);
CREATE INDEX idx_prospecting_events_lead ON public.prospecting_events (lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.prospecting_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company prospecting_events"
  ON public.prospecting_events FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()));

-- Inserts are performed by Edge Functions using the service-role client
-- (bypasses RLS by design, same convention as every other Edge Function
-- in this project). This policy only covers the rare case of an
-- authenticated client-side insert.
CREATE POLICY "Members can create company prospecting_events"
  ON public.prospecting_events FOR INSERT TO authenticated
  WITH CHECK (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()));

GRANT ALL ON TABLE public.prospecting_events TO authenticated, service_role;
