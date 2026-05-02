
-- Drop the old ALL policy
DROP POLICY IF EXISTS "Users can manage own call_script_actions" ON public.call_script_actions;

-- SELECT: company members can read via campaign join, OR direct owner
CREATE POLICY "Company members can select call_script_actions"
  ON public.call_script_actions FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.call_campaigns cc
      WHERE cc.id = call_script_actions.campaign_id
        AND cc.company_id IS NOT NULL
        AND is_company_member(cc.company_id, auth.uid())
    )
  );

-- INSERT: only owner
CREATE POLICY "Users can insert own call_script_actions"
  ON public.call_script_actions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: only owner
CREATE POLICY "Users can update own call_script_actions"
  ON public.call_script_actions FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE: only owner
CREATE POLICY "Users can delete own call_script_actions"
  ON public.call_script_actions FOR DELETE
  USING (user_id = auth.uid());

-- Also fix call_scripts RLS (same problem - operators can't see scripts)
DROP POLICY IF EXISTS "Users can manage own call_scripts" ON public.call_scripts;

CREATE POLICY "Company members can select call_scripts"
  ON public.call_scripts FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.call_campaigns cc
      WHERE cc.id = call_scripts.campaign_id
        AND cc.company_id IS NOT NULL
        AND is_company_member(cc.company_id, auth.uid())
    )
  );

CREATE POLICY "Users can insert own call_scripts"
  ON public.call_scripts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own call_scripts"
  ON public.call_scripts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own call_scripts"
  ON public.call_scripts FOR DELETE
  USING (user_id = auth.uid());
