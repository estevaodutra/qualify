-- Permite que superadmins excluam empresas (RLS não tinha política DELETE)
CREATE POLICY "Superadmin can delete companies"
  ON public.companies
  FOR DELETE
  TO authenticated
  USING (is_superadmin(auth.uid()));
