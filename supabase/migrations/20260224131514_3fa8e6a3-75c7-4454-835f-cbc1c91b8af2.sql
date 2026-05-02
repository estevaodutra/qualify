
-- Phase 2: Add company_id to call_campaigns, call_logs, call_leads, call_queue

-- 1. Add company_id columns
ALTER TABLE public.call_campaigns ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.call_leads ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.call_queue ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 2. Migrate existing data
UPDATE public.call_campaigns SET company_id = (SELECT id FROM public.companies WHERE owner_id = call_campaigns.user_id LIMIT 1) WHERE company_id IS NULL;
UPDATE public.call_logs SET company_id = (SELECT company_id FROM public.call_campaigns WHERE id = call_logs.campaign_id LIMIT 1) WHERE company_id IS NULL AND campaign_id IS NOT NULL;
UPDATE public.call_logs SET company_id = (SELECT id FROM public.companies WHERE owner_id = call_logs.user_id LIMIT 1) WHERE company_id IS NULL;
UPDATE public.call_leads SET company_id = (SELECT company_id FROM public.call_campaigns WHERE id = call_leads.campaign_id LIMIT 1) WHERE company_id IS NULL;
UPDATE public.call_queue SET company_id = (SELECT id FROM public.companies WHERE owner_id = call_queue.user_id LIMIT 1) WHERE company_id IS NULL;

-- 3. Drop old RLS policies
DROP POLICY IF EXISTS "Users can manage own call_campaigns" ON public.call_campaigns;
DROP POLICY IF EXISTS "Users can manage own call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can manage own call_leads" ON public.call_leads;
DROP POLICY IF EXISTS "Users can manage own call_queue" ON public.call_queue;

-- Also drop any individual CRUD policies that may exist
DROP POLICY IF EXISTS "Users can view own call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can create own call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can update own call_logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can delete own call_logs" ON public.call_logs;

-- 4. Create new RLS policies using is_company_member

-- call_campaigns
CREATE POLICY "Company members can select call_campaigns" ON public.call_campaigns FOR SELECT USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert call_campaigns" ON public.call_campaigns FOR INSERT WITH CHECK (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can update call_campaigns" ON public.call_campaigns FOR UPDATE USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company admins can delete call_campaigns" ON public.call_campaigns FOR DELETE USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);

-- call_logs
CREATE POLICY "Company members can select call_logs" ON public.call_logs FOR SELECT USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert call_logs" ON public.call_logs FOR INSERT WITH CHECK (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can update call_logs" ON public.call_logs FOR UPDATE USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can delete call_logs" ON public.call_logs FOR DELETE USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);

-- call_leads
CREATE POLICY "Company members can select call_leads" ON public.call_leads FOR SELECT USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert call_leads" ON public.call_leads FOR INSERT WITH CHECK (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can update call_leads" ON public.call_leads FOR UPDATE USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can delete call_leads" ON public.call_leads FOR DELETE USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);

-- call_queue
CREATE POLICY "Company members can select call_queue" ON public.call_queue FOR SELECT USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can insert call_queue" ON public.call_queue FOR INSERT WITH CHECK (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can update call_queue" ON public.call_queue FOR UPDATE USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
CREATE POLICY "Company members can delete call_queue" ON public.call_queue FOR DELETE USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
);
