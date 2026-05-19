-- Fix: allow users to see webhook_events linked to their instances
-- even when user_id is null (instance lookup failed during ingestion).
-- The external_instance_id is always stored, so we use it as a fallback.

DROP POLICY IF EXISTS "Users can view own webhook_events" ON public.webhook_events;

CREATE POLICY "Users can view own webhook_events"
ON public.webhook_events FOR SELECT
USING (
  user_id = auth.uid()
  OR external_instance_id IN (
    SELECT external_instance_id FROM public.instances
    WHERE user_id = auth.uid()
      AND external_instance_id IS NOT NULL
  )
);
