-- Permite superadmins atualizar qualquer instância (sync com Z-API)
CREATE POLICY "Superadmin can update all instances"
  ON public.instances
  FOR UPDATE
  TO authenticated
  USING (is_superadmin(auth.uid()));
