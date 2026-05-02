ALTER TABLE public.group_execution_leads ADD COLUMN IF NOT EXISTS lid text;
CREATE INDEX IF NOT EXISTS idx_group_execution_leads_lid ON public.group_execution_leads(lid);