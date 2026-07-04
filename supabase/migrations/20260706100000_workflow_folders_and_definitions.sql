-- =====================================================
-- workflow_folders: free-form, user-created folders for
-- organizing automations. A folder never represents a
-- channel/campaign type -- that's just a badge on the card.
-- =====================================================

CREATE TABLE public.workflow_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_folders_name_not_blank CHECK (btrim(name) <> '')
);

CREATE INDEX idx_workflow_folders_company ON public.workflow_folders (company_id, position);

ALTER TABLE public.workflow_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company workflow_folders"
  ON public.workflow_folders FOR SELECT TO authenticated
  USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can create company workflow_folders"
  ON public.workflow_folders FOR INSERT TO authenticated
  WITH CHECK (is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can update company workflow_folders"
  ON public.workflow_folders FOR UPDATE TO authenticated
  USING (is_company_member(company_id, auth.uid()))
  WITH CHECK (is_company_member(company_id, auth.uid()));

CREATE POLICY "Admins can delete company workflow_folders"
  ON public.workflow_folders FOR DELETE TO authenticated
  USING (is_company_admin(company_id, auth.uid()));

CREATE TRIGGER update_workflow_folders_updated_at
  BEFORE UPDATE ON public.workflow_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON TABLE public.workflow_folders TO authenticated, service_role;

-- =====================================================
-- workflow_definitions: the unified index over every
-- automation, regardless of which legacy engine actually
-- runs it. source_type/source_id point at the real entity;
-- nothing about execution moves here -- this is a library
-- layer, not a second execution engine.
-- =====================================================

CREATE TABLE public.workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.workflow_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  trigger_type text, -- derived mirror of the Start node's config; never edited independently
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id)
);

ALTER TABLE public.workflow_definitions
  ADD CONSTRAINT workflow_definitions_status_check CHECK (status IN ('draft', 'active', 'paused', 'error'));

ALTER TABLE public.workflow_definitions
  ADD CONSTRAINT workflow_definitions_source_type_check CHECK (source_type IN (
    'dispatch_sequence', 'group_sequence', 'context_campaign', 'pirate_campaign', 'call_campaign'
  ));

CREATE INDEX idx_workflow_definitions_company ON public.workflow_definitions (company_id);
CREATE INDEX idx_workflow_definitions_folder ON public.workflow_definitions (folder_id);
CREATE INDEX idx_workflow_definitions_status ON public.workflow_definitions (company_id, status);

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view company workflow_definitions"
  ON public.workflow_definitions FOR SELECT TO authenticated
  USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can create company workflow_definitions"
  ON public.workflow_definitions FOR INSERT TO authenticated
  WITH CHECK (is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can update company workflow_definitions"
  ON public.workflow_definitions FOR UPDATE TO authenticated
  USING (is_company_member(company_id, auth.uid()))
  WITH CHECK (is_company_member(company_id, auth.uid()));

CREATE POLICY "Admins can delete company workflow_definitions"
  ON public.workflow_definitions FOR DELETE TO authenticated
  USING (is_company_admin(company_id, auth.uid()));

CREATE TRIGGER update_workflow_definitions_updated_at
  BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON TABLE public.workflow_definitions TO authenticated, service_role;
