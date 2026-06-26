-- Fix RLS policy for deleting instances
-- Allows company admins to delete instances belonging to their company

-- Drop the old overly restrictive policy
DROP POLICY IF EXISTS "Users can delete own instances" ON public.instances;

-- Create the new multi-tenant aware policy
CREATE POLICY "Users can delete own instances"
  ON public.instances FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    (company_id IS NOT NULL AND public.is_company_admin(company_id, auth.uid()))
  );
