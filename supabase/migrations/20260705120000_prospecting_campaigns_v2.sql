-- =====================================================
-- Prospecting Campaigns v2: expand status, add pipeline
-- configuration columns, migrate RLS to company-aware model
-- =====================================================

-- Fix corrupted GRANT statement from 20260702_prospecting_campaigns.sql
-- (the original file had its GRANT line corrupted by a character-spacing
-- encoding artifact and likely never executed correctly).
GRANT ALL ON TABLE public.prospecting_campaigns TO authenticated, anon, service_role;

-- Backfill legacy status values before adding the CHECK constraint
UPDATE public.prospecting_campaigns SET status = 'dispatching' WHERE status = 'running';
UPDATE public.prospecting_campaigns SET status = 'failed' WHERE status = 'error';

ALTER TABLE public.prospecting_campaigns
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.prospecting_campaigns
  DROP CONSTRAINT IF EXISTS prospecting_campaigns_status_check;

ALTER TABLE public.prospecting_campaigns
  ADD CONSTRAINT prospecting_campaigns_status_check CHECK (status IN (
    'draft', 'queued', 'extracting', 'validating', 'enriching', 'awaiting_approval',
    'preparing_queue', 'dispatching', 'paused', 'completed', 'partially_completed',
    'failed', 'cancelled'
  ));

-- New columns for the wizard's enrichment/destination/queue-policy choices
ALTER TABLE public.prospecting_campaigns
  ADD COLUMN IF NOT EXISTS enrichment_layers jsonb NOT NULL DEFAULT '["google_maps"]'::jsonb,
  ADD COLUMN IF NOT EXISTS destination_mode text NOT NULL DEFAULT 'save_only',
  ADD COLUMN IF NOT EXISTS automation_campaign_id uuid REFERENCES public.dispatch_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS automation_sequence_id uuid REFERENCES public.dispatch_sequences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instance_id uuid REFERENCES public.instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS queue_policy jsonb NOT NULL DEFAULT jsonb_build_object(
    'delay_min_seconds', 120,
    'delay_max_seconds', 240,
    'hourly_limit', null,
    'daily_limit', null,
    'allowed_days', jsonb_build_array(1, 2, 3, 4, 5),
    'start_time', '08:00',
    'end_time', '18:00',
    'timezone', 'America/Sao_Paulo',
    'pause_on_reply', true,
    'auto_resume_on_reconnect', true,
    'allow_reentry', false
  ),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);

ALTER TABLE public.prospecting_campaigns
  DROP CONSTRAINT IF EXISTS prospecting_campaigns_destination_mode_check;
ALTER TABLE public.prospecting_campaigns
  ADD CONSTRAINT prospecting_campaigns_destination_mode_check CHECK (destination_mode IN (
    'save_only', 'review_before_start', 'auto_start'
  ));

COMMENT ON COLUMN public.prospecting_campaigns.post_action_id IS
  'Deprecated: superseded by automation_campaign_id/automation_sequence_id.';

-- Migrate RLS from plain user_id = auth.uid() to the company-aware
-- is_company_member/is_company_admin convention used elsewhere (e.g. leads).
DROP POLICY IF EXISTS "Usuários podem ver suas próprias campanhas de prospecção" ON public.prospecting_campaigns;
DROP POLICY IF EXISTS "Usuários podem criar campanhas de prospecção" ON public.prospecting_campaigns;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias campanhas de prospecção" ON public.prospecting_campaigns;
DROP POLICY IF EXISTS "Usuários podem excluir suas próprias campanhas de prospecção" ON public.prospecting_campaigns;

CREATE POLICY "Members can view company prospecting campaigns"
  ON public.prospecting_campaigns FOR SELECT TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Members can create company prospecting campaigns"
  ON public.prospecting_campaigns FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (company_id IS NULL OR public.is_company_member(company_id, auth.uid()))
  );

CREATE POLICY "Members can update company prospecting campaigns"
  ON public.prospecting_campaigns FOR UPDATE TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

CREATE POLICY "Admins can delete company prospecting campaigns"
  ON public.prospecting_campaigns FOR DELETE TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_admin(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );
