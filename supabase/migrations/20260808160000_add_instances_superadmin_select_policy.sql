-- Permite superadmins visualizar todas as instâncias do painel
CREATE POLICY "Superadmin can view all instances"
  ON public.instances
  FOR SELECT
  TO authenticated
  USING (is_superadmin(auth.uid()));
