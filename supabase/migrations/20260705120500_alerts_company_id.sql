-- =====================================================
-- alerts: add the missing company_id column. useAlerts.ts already
-- queries `.eq("company_id", activeCompanyId)` when a company is
-- active, but no migration ever added that column -- this was a
-- pre-existing gap that the new prospecting notifications depend on
-- (company-shared milestone alerts).
-- =====================================================

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_alerts_company_id ON public.alerts (company_id) WHERE company_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can create own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON public.alerts;

CREATE POLICY "Members can view company alerts"
  ON public.alerts FOR SELECT TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Members can create company alerts"
  ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Members can update company alerts"
  ON public.alerts FOR UPDATE TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Members can delete company alerts"
  ON public.alerts FOR DELETE TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );
