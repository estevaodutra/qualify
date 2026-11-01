/* ========================================================
   MIGRATION: CRIAFY CONTEÚDO SEMENTE & ESTADO DE ATIVAÇÃO
   Marco zero da jornada de ativação por conta no Criafy
======================================================== */

-- 1. TABELA: CRIATY_ACCOUNT_ACTIVATIONS
CREATE TABLE IF NOT EXISTS public.criafy_account_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.criafy_instagram_accounts(id) ON DELETE CASCADE,
  seed_status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'started', 'generated', 'in_production', 'completed'
  seed_started_at TIMESTAMPTZ,
  seed_generated_at TIMESTAMPTZ,
  seed_completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT criafy_account_activations_account_unique UNIQUE (account_id)
);

CREATE INDEX IF NOT EXISTS idx_criafy_account_activations_company ON public.criafy_account_activations (company_id);
CREATE INDEX IF NOT EXISTS idx_criafy_account_activations_account ON public.criafy_account_activations (account_id);
CREATE INDEX IF NOT EXISTS idx_criafy_account_activations_status ON public.criafy_account_activations (seed_status);

-- 2. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.criafy_account_activations ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES
DROP POLICY IF EXISTS "criafy_account_activations members select" ON public.criafy_account_activations;
CREATE POLICY "criafy_account_activations members select" ON public.criafy_account_activations FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "criafy_account_activations members insert" ON public.criafy_account_activations;
CREATE POLICY "criafy_account_activations members insert" ON public.criafy_account_activations FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "criafy_account_activations members update" ON public.criafy_account_activations;
CREATE POLICY "criafy_account_activations members update" ON public.criafy_account_activations FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "criafy_account_activations members delete" ON public.criafy_account_activations;
CREATE POLICY "criafy_account_activations members delete" ON public.criafy_account_activations FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
