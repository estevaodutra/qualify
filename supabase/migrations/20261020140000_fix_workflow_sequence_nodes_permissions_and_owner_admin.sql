-- =====================================================
-- Fix is_company_admin to include 'owner' and allow company
-- members to delete sequence_nodes/sequence_connections for
-- workflows within their company.
-- =====================================================

-- 1. Update is_company_admin to include owner role
CREATE OR REPLACE FUNCTION public.is_company_admin(_company_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id
      AND user_id = _user_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  )
$$;

-- 2. Allow company members to delete sequence_nodes for workflows in their company
DROP POLICY IF EXISTS "Company admins can delete sequence_nodes" ON public.sequence_nodes;
DROP POLICY IF EXISTS "Company members can delete sequence_nodes" ON public.sequence_nodes;
CREATE POLICY "Company members can delete sequence_nodes"
  ON public.sequence_nodes FOR DELETE TO authenticated
  USING (
    (company_id IS NOT NULL AND is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

-- 3. Allow company members to delete sequence_connections for workflows in their company
DROP POLICY IF EXISTS "Company admins can delete sequence_connections" ON public.sequence_connections;
DROP POLICY IF EXISTS "Company members can delete sequence_connections" ON public.sequence_connections;
CREATE POLICY "Company members can delete sequence_connections"
  ON public.sequence_connections FOR DELETE TO authenticated
  USING (
    (company_id IS NOT NULL AND is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );
