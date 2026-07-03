-- Migration: Workflows and Custom Fields Metadata
-- Date: 2026-07-03

-- 1. Create custom_fields_metadata table
CREATE TABLE IF NOT EXISTS public.custom_fields_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'text', -- text, number, date, boolean, select
  category TEXT NOT NULL DEFAULT 'lead', -- lead, deal, company
  group_name TEXT DEFAULT 'Sem grupo',
  is_visible BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT custom_fields_metadata_key_company UNIQUE (company_id, category, key)
);

CREATE INDEX IF NOT EXISTS idx_custom_fields_metadata_company ON public.custom_fields_metadata(company_id);

-- Enable RLS
ALTER TABLE public.custom_fields_metadata ENABLE ROW LEVEL SECURITY;

-- Policies for custom_fields_metadata
CREATE POLICY "Company members can view custom fields metadata" ON public.custom_fields_metadata
  FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Company admins can manage custom fields metadata" ON public.custom_fields_metadata
  FOR ALL TO authenticated USING (public.is_company_admin(company_id, auth.uid())) 
  WITH CHECK (public.is_company_admin(company_id, auth.uid()));

-- Grant permissions
GRANT ALL ON TABLE public.custom_fields_metadata TO authenticated, anon, service_role;

-- 2. Add current_node_id to sequence_executions
ALTER TABLE public.sequence_executions ADD COLUMN IF NOT EXISTS current_node_id UUID;

-- 3. Add trigger for updated_at
DROP TRIGGER IF EXISTS update_custom_fields_metadata_updated_at ON public.custom_fields_metadata;
CREATE TRIGGER update_custom_fields_metadata_updated_at
  BEFORE UPDATE ON public.custom_fields_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
