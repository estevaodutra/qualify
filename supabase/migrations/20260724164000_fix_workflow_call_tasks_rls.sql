-- Migration: 20260724164000_fix_workflow_call_tasks_rls.sql
-- Description: Drop old RLS policies for workflow_call_tasks and create company-aware member policies.

-- 1. Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage own workflow_call_tasks" ON public.workflow_call_tasks;

-- 2. Create select policy for company members
CREATE POLICY "Company members can view workflow_call_tasks"
  ON public.workflow_call_tasks FOR SELECT
  TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

-- 3. Create insert policy for company members
CREATE POLICY "Company members can insert workflow_call_tasks"
  ON public.workflow_call_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

-- 4. Create update policy for company members
CREATE POLICY "Company members can update workflow_call_tasks"
  ON public.workflow_call_tasks FOR UPDATE
  TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

-- 5. Create delete policy for company members (only admins can delete/cancel)
CREATE POLICY "Company members can delete workflow_call_tasks"
  ON public.workflow_call_tasks FOR DELETE
  TO authenticated
  USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid()))
    OR (company_id IS NULL AND user_id = auth.uid())
  );

-- 6. Grant privileges to access roles
GRANT ALL ON TABLE public.workflow_call_tasks TO postgres;
GRANT ALL ON TABLE public.workflow_call_tasks TO service_role;
GRANT ALL ON TABLE public.workflow_call_tasks TO authenticated;
GRANT ALL ON TABLE public.workflow_call_tasks TO anon;

-- 7. Update PostgREST schema cache
NOTIFY pgrst, 'reload schema';
