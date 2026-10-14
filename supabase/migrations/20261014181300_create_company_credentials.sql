-- ========================================================
-- MIGRATION: COMPANY CREDENTIALS STORE (FASE 5)
-- Infraestrutura compartilhada centralizada da Qualify
-- ========================================================

CREATE TABLE IF NOT EXISTS public.company_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL, -- 'openai', 'meta', etc.
  api_key_masked TEXT, -- Ex: sk-proj-...xxxx para exibição segura no frontend
  encrypted_key TEXT NOT NULL, -- Chave armazenada para uso pelas Edge Functions
  settings JSONB NOT NULL DEFAULT '{}'::jsonb, -- Configurações extras (ex: default_model)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT company_credentials_service_unique UNIQUE (company_id, service_name)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_company_credentials_lookup 
  ON public.company_credentials (company_id, service_name);

-- RLS
ALTER TABLE public.company_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage company_credentials"
  ON public.company_credentials FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    )
  );
