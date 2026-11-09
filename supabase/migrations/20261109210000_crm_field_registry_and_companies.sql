-- ============================================================
-- CRM FIELD REGISTRY + CRM COMPANIES
-- Separates Qualify workspace (companies) from CRM organizations.
-- ============================================================

-- 1. Real CRM company/entity (NOT the Qualify tenant)
CREATE TABLE IF NOT EXISTS public.crm_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trade_name TEXT,
  document TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  segment TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  street TEXT,
  address_number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_companies_tenant ON public.crm_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_name ON public.crm_companies(company_id, name);
CREATE INDEX IF NOT EXISTS idx_crm_companies_document ON public.crm_companies(company_id, document);

ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can manage crm companies" ON public.crm_companies;
CREATE POLICY "Company members can manage crm companies"
  ON public.crm_companies
  FOR ALL TO authenticated
  USING (public.is_company_member(company_id, auth.uid()))
  WITH CHECK (public.is_company_member(company_id, auth.uid()));

DROP TRIGGER IF EXISTS update_crm_companies_updated_at ON public.crm_companies;
CREATE TRIGGER update_crm_companies_updated_at
  BEFORE UPDATE ON public.crm_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Promote person/company/deal relationships to real first-class fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS crm_company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL;

ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS crm_company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_crm_company ON public.leads(crm_company_id);
CREATE INDEX IF NOT EXISTS idx_deals_crm_company ON public.deals(crm_company_id);

-- Best-effort split for legacy full names. Does not overwrite explicit values.
UPDATE public.leads
SET
  first_name = COALESCE(first_name, NULLIF(split_part(trim(name), ' ', 1), '')),
  last_name = COALESCE(
    last_name,
    NULLIF(trim(regexp_replace(trim(name), '^\\S+\\s*', '')), '')
  )
WHERE name IS NOT NULL AND trim(name) <> '';

-- 3. Migrate legacy lead.company_name into crm_companies without deleting legacy data.
INSERT INTO public.crm_companies (company_id, name)
SELECT DISTINCT l.company_id, trim(l.company_name)
FROM public.leads l
WHERE l.company_id IS NOT NULL
  AND l.company_name IS NOT NULL
  AND trim(l.company_name) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.crm_companies cc
    WHERE cc.company_id = l.company_id
      AND lower(trim(cc.name)) = lower(trim(l.company_name))
      AND cc.deleted_at IS NULL
  );

UPDATE public.leads l
SET crm_company_id = cc.id
FROM public.crm_companies cc
WHERE l.crm_company_id IS NULL
  AND l.company_id = cc.company_id
  AND l.company_name IS NOT NULL
  AND lower(trim(l.company_name)) = lower(trim(cc.name))
  AND cc.deleted_at IS NULL;

UPDATE public.deals d
SET crm_company_id = l.crm_company_id
FROM public.leads l
WHERE d.lead_id = l.id
  AND d.crm_company_id IS NULL
  AND l.crm_company_id IS NOT NULL;

-- 4. Turn custom_fields_metadata into the single CRM field registry.
ALTER TABLE public.custom_fields_metadata
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_column TEXT,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_custom_fields_metadata_entity_order
  ON public.custom_fields_metadata(company_id, category, order_index);

-- 5. Reusable seeding function for system fields.
CREATE OR REPLACE FUNCTION public.seed_crm_system_fields(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.custom_fields_metadata
    (company_id, name, key, description, type, category, group_name, is_visible, is_private, is_system, source_column, is_required, order_index)
  VALUES
    -- LEAD / PERSON
    (p_company_id, 'Nome completo', 'name', 'Nome completo da pessoa/lead.', 'text', 'lead', 'Dados Pessoais', true, false, true, 'name', true, 10),
    (p_company_id, 'Primeiro nome', 'first_name', 'Primeiro nome da pessoa.', 'text', 'lead', 'Dados Pessoais', true, false, true, 'first_name', false, 20),
    (p_company_id, 'Sobrenome', 'last_name', 'Sobrenome da pessoa.', 'text', 'lead', 'Dados Pessoais', true, false, true, 'last_name', false, 30),
    (p_company_id, 'Telefone', 'phone', 'Telefone principal.', 'phone', 'lead', 'Contato', true, false, true, 'phone', false, 40),
    (p_company_id, 'Telefone fixo', 'telefone_fixo', 'Telefone fixo/alternativo.', 'phone', 'lead', 'Contato', true, false, true, 'telefone_fixo', false, 50),
    (p_company_id, 'E-mail', 'email', 'E-mail principal.', 'email', 'lead', 'Contato', true, false, true, 'email', false, 60),
    (p_company_id, 'Documento', 'document', 'CPF ou outro documento da pessoa.', 'text', 'lead', 'Dados Pessoais', true, true, true, 'document', false, 70),
    (p_company_id, 'Data de nascimento', 'birth_date', 'Data de nascimento.', 'date', 'lead', 'Dados Pessoais', false, true, true, 'birth_date', false, 80),
    (p_company_id, 'Responsável', 'owner_id', 'Responsável interno pelo lead.', 'relation', 'lead', 'CRM', true, false, true, 'owner_id', false, 90),
    (p_company_id, 'Origem', 'source_name', 'Origem de aquisição do lead.', 'text', 'lead', 'CRM', true, false, true, 'source_name', false, 100),
    (p_company_id, 'Tags', 'tags', 'Tags vinculadas ao lead.', 'multi_select', 'lead', 'CRM', true, false, true, 'tags', false, 110),
    (p_company_id, 'Empresa', 'company', 'Empresa do CRM vinculada à pessoa.', 'relation', 'lead', 'CRM', true, false, true, 'crm_company_id', false, 120),

    -- CRM COMPANY
    (p_company_id, 'Nome / Razão social', 'name', 'Nome principal da empresa do CRM.', 'text', 'company', 'Dados da Empresa', true, false, true, 'name', true, 10),
    (p_company_id, 'Nome fantasia', 'trade_name', 'Nome fantasia.', 'text', 'company', 'Dados da Empresa', true, false, true, 'trade_name', false, 20),
    (p_company_id, 'CNPJ / Documento', 'document', 'Documento fiscal da empresa.', 'text', 'company', 'Dados da Empresa', true, true, true, 'document', false, 30),
    (p_company_id, 'Telefone', 'phone', 'Telefone principal da empresa.', 'phone', 'company', 'Contato', true, false, true, 'phone', false, 40),
    (p_company_id, 'E-mail', 'email', 'E-mail principal da empresa.', 'email', 'company', 'Contato', true, false, true, 'email', false, 50),
    (p_company_id, 'Site', 'website', 'Site da empresa.', 'url', 'company', 'Contato', true, false, true, 'website', false, 60),
    (p_company_id, 'Segmento', 'segment', 'Segmento/mercado da empresa.', 'text', 'company', 'Dados da Empresa', true, false, true, 'segment', false, 70),
    (p_company_id, 'Responsável', 'owner_id', 'Responsável interno pela conta.', 'relation', 'company', 'CRM', true, false, true, 'owner_id', false, 80),
    (p_company_id, 'Logradouro', 'street', 'Rua/avenida.', 'text', 'company', 'Endereço', false, false, true, 'street', false, 90),
    (p_company_id, 'Número', 'address_number', 'Número do endereço.', 'text', 'company', 'Endereço', false, false, true, 'address_number', false, 100),
    (p_company_id, 'Complemento', 'complement', 'Complemento do endereço.', 'text', 'company', 'Endereço', false, false, true, 'complement', false, 110),
    (p_company_id, 'Bairro', 'neighborhood', 'Bairro.', 'text', 'company', 'Endereço', false, false, true, 'neighborhood', false, 120),
    (p_company_id, 'Cidade', 'city', 'Cidade.', 'text', 'company', 'Endereço', false, false, true, 'city', false, 130),
    (p_company_id, 'Estado', 'state', 'Estado/UF.', 'text', 'company', 'Endereço', false, false, true, 'state', false, 140),
    (p_company_id, 'CEP', 'postal_code', 'CEP.', 'text', 'company', 'Endereço', false, false, true, 'postal_code', false, 150),

    -- DEAL
    (p_company_id, 'Negócio', 'title', 'Título do negócio.', 'text', 'deal', 'Dados do Negócio', true, false, true, 'title', true, 10),
    (p_company_id, 'Lead / Pessoa', 'lead_id', 'Pessoa principal vinculada ao negócio.', 'relation', 'deal', 'Vínculos', true, false, true, 'lead_id', true, 20),
    (p_company_id, 'Empresa', 'company', 'Empresa do CRM vinculada ao negócio.', 'relation', 'deal', 'Vínculos', true, false, true, 'crm_company_id', false, 30),
    (p_company_id, 'Pipeline', 'pipeline_id', 'Pipeline atual.', 'relation', 'deal', 'Pipeline', true, false, true, 'pipeline_id', false, 40),
    (p_company_id, 'Etapa', 'stage_id', 'Etapa atual da pipeline.', 'relation', 'deal', 'Pipeline', true, false, true, 'stage_id', false, 50),
    (p_company_id, 'Valor', 'value', 'Valor do negócio.', 'currency', 'deal', 'Dados do Negócio', true, false, true, 'value', false, 60),
    (p_company_id, 'Moeda', 'currency', 'Moeda do negócio.', 'text', 'deal', 'Dados do Negócio', false, false, true, 'currency', false, 70),
    (p_company_id, 'Status', 'status', 'Status do negócio.', 'select', 'deal', 'Pipeline', true, false, true, 'status', false, 80),
    (p_company_id, 'Responsável', 'owner_id', 'Responsável pelo negócio.', 'relation', 'deal', 'CRM', true, false, true, 'owner_id', false, 90),
    (p_company_id, 'Prioridade', 'priority', 'Prioridade comercial.', 'select', 'deal', 'CRM', true, false, true, 'priority', false, 100),
    (p_company_id, 'Probabilidade', 'probability', 'Probabilidade de fechamento em percentual.', 'number', 'deal', 'CRM', true, false, true, 'probability', false, 110),
    (p_company_id, 'Previsão de fechamento', 'expected_close_date', 'Data prevista de fechamento.', 'date', 'deal', 'CRM', true, false, true, 'expected_close_date', false, 120),
    (p_company_id, 'Motivo de perda', 'lost_reason_id', 'Motivo associado à perda do negócio.', 'relation', 'deal', 'CRM', false, false, true, 'lost_reason_id', false, 130)
  ON CONFLICT (company_id, category, key) DO UPDATE SET
    is_system = true,
    source_column = EXCLUDED.source_column,
    is_required = EXCLUDED.is_required,
    order_index = CASE
      WHEN custom_fields_metadata.order_index = 0 THEN EXCLUDED.order_index
      ELSE custom_fields_metadata.order_index
    END,
    description = COALESCE(custom_fields_metadata.description, EXCLUDED.description);
END;
$$;

-- Existing workspaces
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.companies LOOP
    PERFORM public.seed_crm_system_fields(r.id);
  END LOOP;
END;
$$;

-- New workspaces
CREATE OR REPLACE FUNCTION public.seed_crm_system_fields_on_company_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_crm_system_fields(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_crm_system_fields_after_company_insert ON public.companies;
CREATE TRIGGER seed_crm_system_fields_after_company_insert
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.seed_crm_system_fields_on_company_insert();

-- 6. Realtime optional
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_companies;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END;
$$;
