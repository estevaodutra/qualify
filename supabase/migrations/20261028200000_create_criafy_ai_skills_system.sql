-- ========================================================
-- MIGRATION: CRIAFY OPENAI SKILLS & AI SUPER ADMIN ARCHITECTURE
-- Central de IA exclusiva OpenAI com Skills Globais e Versionamento
-- ========================================================

-- 1. MODEL PROFILES
CREATE TABLE IF NOT EXISTS public.ai_model_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  reasoning_effort TEXT DEFAULT NULL, -- 'low', 'medium', 'high'
  max_output_tokens INTEGER NOT NULL DEFAULT 2000,
  temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.70,
  timeout_seconds INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. AI SKILLS (GLOBAIS DA PLATAFORMA CRIAFY)
CREATE TABLE IF NOT EXISTS public.ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'CONTEÚDO', -- 'CONTEÚDO', 'ESTRATÉGIA', 'ANÁLISE'
  when_to_use TEXT,
  target_objective TEXT,
  main_instructions TEXT,
  output_format TEXT NOT NULL DEFAULT 'json', -- 'json', 'markdown', 'text'
  output_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_model_profile TEXT NOT NULL DEFAULT 'CONTENT_STANDARD' REFERENCES public.ai_model_profiles(code) ON UPDATE CASCADE,
  status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'testing', 'published', 'deprecated', 'disabled'
  openai_skill_id TEXT,
  openai_default_version TEXT,
  openai_latest_version TEXT,
  active_version_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. AI SKILL VERSIONS (IMUTÁVEIS QUANDO PUBLICADAS)
CREATE TABLE IF NOT EXISTS public.ai_skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.ai_skills(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  openai_version TEXT,
  bundle_path TEXT,
  manifest_content TEXT NOT NULL,
  files JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de [{ path, name, type, content, size, updatedAt }]
  changelog TEXT,
  status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'testing', 'published', 'deprecated', 'disabled'
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT ai_skill_versions_skill_version_unique UNIQUE (skill_id, version)
);

-- Adicionar foreign key de active_version_id agora que ai_skill_versions existe
ALTER TABLE public.ai_skills 
  DROP CONSTRAINT IF EXISTS fk_ai_skills_active_version;
ALTER TABLE public.ai_skills 
  ADD CONSTRAINT fk_ai_skills_active_version 
  FOREIGN KEY (active_version_id) REFERENCES public.ai_skill_versions(id) ON DELETE SET NULL;

-- 4. AI EXECUTIONS (LOGS E AUDITORIA COMPLETA DE TODAS AS GERAÇÕES)
CREATE TABLE IF NOT EXISTS public.ai_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.criafy_instagram_accounts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. 'generate_reel', 'generate_stories_lite', 'generate_carousel', 'generate_static_post', 'plan_week', 'strategist_chat', 'playground_test'
  skill_id UUID REFERENCES public.ai_skills(id) ON DELETE SET NULL,
  skill_slug TEXT NOT NULL,
  skill_version INTEGER NOT NULL DEFAULT 1,
  openai_skill_id TEXT,
  openai_version TEXT,
  model_profile TEXT NOT NULL,
  model TEXT NOT NULL,
  input_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_response TEXT,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error', 'retrying'
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  estimated_cost NUMERIC(10, 6) DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  error TEXT,
  attempt INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_skills_category ON public.ai_skills(category);
CREATE INDEX IF NOT EXISTS idx_ai_skills_status ON public.ai_skills(status);
CREATE INDEX IF NOT EXISTS idx_ai_skill_versions_skill ON public.ai_skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_ai_executions_company ON public.ai_executions(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_executions_account ON public.ai_executions(account_id);
CREATE INDEX IF NOT EXISTS idx_ai_executions_skill ON public.ai_executions(skill_slug);
CREATE INDEX IF NOT EXISTS idx_ai_executions_status ON public.ai_executions(status);
CREATE INDEX IF NOT EXISTS idx_ai_executions_created_at ON public.ai_executions(created_at DESC);

-- HABILITAR RLS
ALTER TABLE public.ai_model_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_skill_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_executions ENABLE ROW LEVEL SECURITY;

-- POLICIES PARA ai_model_profiles
CREATE POLICY "ai_model_profiles_select_auth" ON public.ai_model_profiles 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_model_profiles_all_superadmin" ON public.ai_model_profiles 
  FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

-- POLICIES PARA ai_skills (Skills são globais Criafy, leitura para membros, escrita exclusiva Superadmin)
CREATE POLICY "ai_skills_select_auth" ON public.ai_skills 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_skills_all_superadmin" ON public.ai_skills 
  FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

-- POLICIES PARA ai_skill_versions
CREATE POLICY "ai_skill_versions_select_auth" ON public.ai_skill_versions 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_skill_versions_all_superadmin" ON public.ai_skill_versions 
  FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

-- POLICIES PARA ai_executions (Superadmin vê tudo, empresas veem apenas seus logs)
CREATE POLICY "ai_executions_superadmin_select" ON public.ai_executions 
  FOR SELECT TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "ai_executions_company_select" ON public.ai_executions 
  FOR SELECT TO authenticated 
  USING (company_id IN (SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid() AND cm.is_active = true));
CREATE POLICY "ai_executions_insert" ON public.ai_executions 
  FOR INSERT TO authenticated WITH CHECK (
    public.is_superadmin(auth.uid()) OR 
    (company_id IS NULL OR company_id IN (SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid() AND cm.is_active = true))
  );

-- ========================================================
-- SEED DOS PERFIS DE MODELOS
-- ========================================================
INSERT INTO public.ai_model_profiles (code, name, description, provider, model, reasoning_effort, max_output_tokens, temperature, timeout_seconds, is_active)
VALUES
  ('CONTENT_STANDARD', 'Content Standard (GPT-4o Mini)', 'Modelo ultra-rápido e econômico para legendas, hooks, ideias e postagens rotineiras.', 'openai', 'gpt-4o-mini', NULL, 2000, 0.70, 45, true),
  ('CONTENT_ADVANCED', 'Content Advanced (GPT-4o)', 'Modelo de alta precisão e nuance criativa para Reels profundos, carrosséis e roteirização complexa.', 'openai', 'gpt-4o', NULL, 3000, 0.70, 60, true),
  ('STRATEGY_ADVANCED', 'Strategy Advanced (GPT-4o / Reasoning)', 'Modelo com capacidade analítica aprofundada para planejamento editorial, campanhas e diagnóstico de marca.', 'openai', 'gpt-4o', 'medium', 4000, 0.50, 90, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  model = EXCLUDED.model,
  max_output_tokens = EXCLUDED.max_output_tokens,
  temperature = EXCLUDED.temperature;
