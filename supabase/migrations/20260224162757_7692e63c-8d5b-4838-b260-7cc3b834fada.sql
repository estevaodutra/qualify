
-- Drop the old SELECT policy
DROP POLICY IF EXISTS "Users can view own webhook_configs" ON public.webhook_configs;

-- Create new SELECT policy that allows company members to read admin's configs
CREATE POLICY "Company members can read admin webhook_configs"
  ON public.webhook_configs FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.company_members cm_admin
      JOIN public.company_members cm_me
        ON cm_admin.company_id = cm_me.company_id
      WHERE cm_admin.user_id = webhook_configs.user_id
        AND cm_admin.role = 'admin'
        AND cm_admin.is_active = true
        AND cm_me.user_id = auth.uid()
        AND cm_me.is_active = true
    )
  );
