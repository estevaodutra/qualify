-- =====================================================
-- Allow superadmins to view all webhook_events (including
-- system-level events where user_id is null).
-- =====================================================

CREATE POLICY "Superadmins can view all webhook_events"
  ON public.webhook_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_superadmin = true
    )
  );
