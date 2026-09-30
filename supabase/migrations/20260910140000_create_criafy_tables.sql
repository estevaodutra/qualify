-- ========================================================
-- MIGRATION: CRIAFY DOMAIN SCHEMA (FASE 1)
-- Aplicativo Criafy dentro da Plataforma Qualify
-- ========================================================

-- 1. CONTAS DO INSTAGRAM
CREATE TABLE IF NOT EXISTS public.criafy_instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  instagram_account_id TEXT,
  instagram_user_id TEXT,
  username TEXT NOT NULL,
  name TEXT,
  profile_picture_url TEXT,
  account_type TEXT DEFAULT 'BUSINESS',
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connection_status TEXT NOT NULL DEFAULT 'CONNECTED', -- CONNECTED, EXPIRED, DISCONNECTED, ERROR
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. BRIEFING POR CONTA
CREATE TABLE IF NOT EXISTS public.criafy_account_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL UNIQUE REFERENCES public.criafy_instagram_accounts(id) ON DELETE CASCADE,
  brand_name TEXT,
  about TEXT,
  objective TEXT,
  target_audience TEXT,
  brand_positioning TEXT,
  tone_of_voice TEXT,
  main_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_ctas JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_vocabulary JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_vocabulary JSONB NOT NULL DEFAULT '[]'::jsonb,
  free_ai_context TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. BIBLIOTECA DE CONTEÚDOS (Pertence à Empresa)
CREATE TABLE IF NOT EXISTS public.criafy_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  media_type TEXT NOT NULL, -- IMAGE, VIDEO
  file_size_bytes BIGINT,
  mime_type TEXT,
  duration_seconds NUMERIC(10, 2),
  width INTEGER,
  height INTEGER,
  aspect_ratio TEXT,
  meta_validation_status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, VALID, INVALID
  meta_validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ARCHIVED
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. JUNÇÃO CONTEÚDO ↔ CONTAS (N : N)
CREATE TABLE IF NOT EXISTS public.criafy_content_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.criafy_contents(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.criafy_instagram_accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT criafy_content_accounts_unique UNIQUE (content_id, account_id)
);

-- 5. REGRAS DE FILA AUTOMÁTICA / CADÊNCIA POR CONTA
CREATE TABLE IF NOT EXISTS public.criafy_queue_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.criafy_instagram_accounts(id) ON DELETE CASCADE,
  posts_per_day INTEGER NOT NULL DEFAULT 1,
  publication_times JSONB NOT NULL DEFAULT '["08:00", "13:00", "19:00"]'::jsonb,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  allowed_days JSONB NOT NULL DEFAULT '[1,2,3,4,5,6,7]'::jsonb, -- 1=Mon..7=Sun
  is_active BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. PUBLICAÇÕES
CREATE TABLE IF NOT EXISTS public.criafy_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.criafy_instagram_accounts(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.criafy_contents(id) ON DELETE CASCADE,
  publication_type TEXT NOT NULL, -- FEED, REEL, STORY_IMAGE, STORY_VIDEO
  caption TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, SCHEDULED, PUBLISHING, PUBLISHED, FAILED, CANCELED
  ig_media_id TEXT,
  ig_permalink TEXT,
  is_auto_queued BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. AUDITORIA / TENTATIVAS DE PUBLICAÇÃO (RETRY & LOGS)
CREATE TABLE IF NOT EXISTS public.criafy_publication_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  publication_id UUID NOT NULL REFERENCES public.criafy_publications(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL, -- SUCCESS, FAILED, IN_PROGRESS
  error_code TEXT,
  error_message TEXT,
  raw_response_sanitized JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================================
-- INDEXES PARA ALTÍSSIMA PERFORMANCE
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_criafy_accounts_company ON public.criafy_instagram_accounts (company_id);
CREATE INDEX IF NOT EXISTS idx_criafy_briefings_account ON public.criafy_account_briefings (account_id);
CREATE INDEX IF NOT EXISTS idx_criafy_contents_company ON public.criafy_contents (company_id, status);
CREATE INDEX IF NOT EXISTS idx_criafy_content_accounts_link ON public.criafy_content_accounts (content_id, account_id);
CREATE INDEX IF NOT EXISTS idx_criafy_queue_rules_account ON public.criafy_queue_rules (account_id);
CREATE INDEX IF NOT EXISTS idx_criafy_publications_schedule ON public.criafy_publications (company_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_criafy_publications_account ON public.criafy_publications (account_id, status);
CREATE INDEX IF NOT EXISTS idx_criafy_attempts_pub ON public.criafy_publication_attempts (publication_id);

-- ========================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ========================================================
ALTER TABLE public.criafy_instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criafy_account_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criafy_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criafy_content_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criafy_queue_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criafy_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criafy_publication_attempts ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- POLÍTICAS RLS (BASEADAS NO COMPANY_MEMBERS DA QUALIFY)
-- ========================================================

-- criafy_instagram_accounts
CREATE POLICY "Users can manage criafy_instagram_accounts"
  ON public.criafy_instagram_accounts FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- criafy_account_briefings
CREATE POLICY "Users can manage criafy_account_briefings"
  ON public.criafy_account_briefings FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- criafy_contents
CREATE POLICY "Users can manage criafy_contents"
  ON public.criafy_contents FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- criafy_content_accounts
CREATE POLICY "Users can manage criafy_content_accounts"
  ON public.criafy_content_accounts FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- criafy_queue_rules
CREATE POLICY "Users can manage criafy_queue_rules"
  ON public.criafy_queue_rules FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- criafy_publications
CREATE POLICY "Users can manage criafy_publications"
  ON public.criafy_publications FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- criafy_publication_attempts
CREATE POLICY "Users can manage criafy_publication_attempts"
  ON public.criafy_publication_attempts FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
