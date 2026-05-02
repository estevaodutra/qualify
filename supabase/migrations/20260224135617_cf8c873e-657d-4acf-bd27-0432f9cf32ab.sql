DROP POLICY IF EXISTS "Admins can update company operators" ON call_operators;

CREATE POLICY "Members can update own or admin can update any"
  ON call_operators
  FOR UPDATE
  USING (
    (user_id = auth.uid())
    OR
    ((company_id IS NOT NULL) AND is_company_admin(company_id, auth.uid()))
    OR
    ((company_id IS NULL) AND (user_id = auth.uid()))
  );