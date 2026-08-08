-- Permite superadmins excluir qualquer instância do painel
CREATE POLICY "Superadmin can delete all instances"
  ON public.instances
  FOR DELETE
  TO authenticated
  USING (is_superadmin(auth.uid()));
