-- Permite superadmins inserir instâncias sem user_id vinculado (sync com Z-API)
CREATE POLICY "Superadmin can insert instances"
  ON public.instances
  FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin(auth.uid()));
