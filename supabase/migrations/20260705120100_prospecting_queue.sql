-- =====================================================
-- prospecting_queue: per-lead execution queue that feeds
-- the existing dispatch automation engine (dispatch_campaigns/
-- dispatch_sequences via execute-dispatch-sequence). One row
-- per lead per automation sequence.
-- =====================================================

CREATE TABLE public.prospecting_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prospecting_campaign_id uuid NOT NULL REFERENCES public.prospecting_campaigns(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  automation_campaign_id uuid NOT NULL REFERENCES public.dispatch_campaigns(id) ON DELETE CASCADE,
  automation_sequence_id uuid NOT NULL REFERENCES public.dispatch_sequences(id) ON DELETE CASCADE,
  instance_id uuid REFERENCES public.instances(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  priority integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_error text,
  replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prospecting_campaign_id, lead_id, automation_sequence_id)
);

ALTER TABLE public.prospecting_queue
  ADD CONSTRAINT prospecting_queue_status_check CHECK (status IN (
    'pending', 'scheduled', 'processing', 'paused', 'completed',
    'failed', 'cancelled', 'skipped', 'replied'
  ));

CREATE INDEX idx_prospecting_queue_dequeue
  ON public.prospecting_queue (company_id, status, scheduled_at)
  WHERE status IN ('pending', 'scheduled');
CREATE INDEX idx_prospecting_queue_campaign ON public.prospecting_queue (prospecting_campaign_id);
CREATE INDEX idx_prospecting_queue_lead ON public.prospecting_queue (lead_id);
CREATE INDEX idx_prospecting_queue_instance ON public.prospecting_queue (instance_id) WHERE instance_id IS NOT NULL;

ALTER TABLE public.prospecting_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company prospecting_queue"
  ON public.prospecting_queue FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can manage company prospecting_queue"
  ON public.prospecting_queue FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
  WITH CHECK (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()));

CREATE TRIGGER update_prospecting_queue_updated_at
  BEFORE UPDATE ON public.prospecting_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- prospecting_queue_get_next: concurrency-safe dequeue,
-- modeled on queue_get_next_v2 (call dialer queue).
-- Returns at most one row, atomically claimed (status -> processing),
-- and only when the number of already-processing items for the
-- company is below p_max_concurrency.
-- =====================================================
CREATE OR REPLACE FUNCTION public.prospecting_queue_get_next(
  p_company_id uuid,
  p_max_concurrency int DEFAULT 1
)
RETURNS TABLE (
  queue_id uuid,
  out_lead_id uuid,
  out_prospecting_campaign_id uuid,
  out_automation_campaign_id uuid,
  out_automation_sequence_id uuid,
  out_instance_id uuid,
  out_attempts int,
  out_max_attempts int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_processing_count int;
BEGIN
  SELECT count(*) INTO v_processing_count
  FROM prospecting_queue
  WHERE company_id = p_company_id AND status = 'processing';

  IF v_processing_count >= p_max_concurrency THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH next_item AS (
    SELECT pq.id FROM prospecting_queue pq
    JOIN prospecting_campaigns pc ON pc.id = pq.prospecting_campaign_id
    WHERE pq.company_id = p_company_id
      AND pq.status IN ('pending', 'scheduled')
      AND (pq.scheduled_at IS NULL OR pq.scheduled_at <= now())
      AND pc.status = 'dispatching'
    ORDER BY pq.priority DESC, pq.scheduled_at ASC NULLS FIRST, pq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE prospecting_queue q
  SET status = 'processing', started_at = now()
  FROM next_item n
  WHERE q.id = n.id
  RETURNING q.id, q.lead_id, q.prospecting_campaign_id, q.automation_campaign_id,
    q.automation_sequence_id, q.instance_id, q.attempts, q.max_attempts;
END;
$$;

GRANT ALL ON TABLE public.prospecting_queue TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.prospecting_queue_get_next(uuid, int) TO service_role;
