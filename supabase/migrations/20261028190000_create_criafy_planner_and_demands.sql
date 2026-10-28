-- ========================================================
-- MIGRATION: CRIAFY PLANNER & CENTRAL DE DEMANDAS
-- Criação de tabelas para o Planejador Editorial e Central de Demandas da Criafy
-- ========================================================

-- 1. PLANNER EDITORIAL
CREATE TABLE IF NOT EXISTS public.criafy_planner_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.criafy_instagram_accounts(id) ON DELETE SET NULL,
  format TEXT NOT NULL DEFAULT 'REEL', -- REEL, CAROUSEL, POST, STORY, STORIES_LITE, SCRIPT, AUDIO, VIDEO_LONGO
  theme TEXT NOT NULL,
  objective TEXT, -- identificacao, autoridade, vendas, conexao, educacao, retencao
  pillar TEXT, -- Relacionamento, Metodo, Bastidor, etc.
  angle TEXT,
  responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responsible_name TEXT,
  campaign TEXT,
  priority TEXT NOT NULL DEFAULT 'media', -- baixa, media, alta, urgente
  status TEXT NOT NULL DEFAULT 'ideia', -- ideia, pauta, roteirizado, aguardando_gravacao, em_edicao, pronto, agendado, publicado
  desired_date TIMESTAMPTZ,
  hook TEXT,
  script TEXT,
  caption TEXT,
  content_id UUID REFERENCES public.criafy_contents(id) ON DELETE SET NULL,
  publication_id UUID REFERENCES public.criafy_publications(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_criafy_planner_company ON public.criafy_planner_items (company_id);
CREATE INDEX IF NOT EXISTS idx_criafy_planner_account ON public.criafy_planner_items (account_id);
CREATE INDEX IF NOT EXISTS idx_criafy_planner_status ON public.criafy_planner_items (status);
CREATE INDEX IF NOT EXISTS idx_criafy_planner_desired_date ON public.criafy_planner_items (desired_date);

ALTER TABLE public.criafy_planner_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "criafy_planner_items members select" ON public.criafy_planner_items FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "criafy_planner_items members insert" ON public.criafy_planner_items FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "criafy_planner_items members update" ON public.criafy_planner_items FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "criafy_planner_items members delete" ON public.criafy_planner_items FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- 2. CENTRAL DE DEMANDAS
CREATE TABLE IF NOT EXISTS public.criafy_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.criafy_instagram_accounts(id) ON DELETE SET NULL,
  planner_item_id UUID REFERENCES public.criafy_planner_items(id) ON DELETE CASCADE,
  related_content_id UUID REFERENCES public.criafy_contents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'tarefa_generica', -- gravar_video, gravar_audio, tirar_foto, revisar_copy, aprovar_conteudo, enviar_material, editar, publicar, responder, coletar_depoimento, stories_lite, tarefa_generica
  priority TEXT NOT NULL DEFAULT 'media', -- baixa, media, alta, urgente
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, not_occurred, cancelled
  origin TEXT NOT NULL DEFAULT 'usuario', -- ia, usuario, equipe, gestor, automacao
  responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responsible_name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  stories_lite JSONB, -- { context, contextLabel, hook, bridge, coreMessage, connectionToMethod, cta, script }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_criafy_demands_company ON public.criafy_demands (company_id);
CREATE INDEX IF NOT EXISTS idx_criafy_demands_account ON public.criafy_demands (account_id);
CREATE INDEX IF NOT EXISTS idx_criafy_demands_planner ON public.criafy_demands (planner_item_id);
CREATE INDEX IF NOT EXISTS idx_criafy_demands_type ON public.criafy_demands (type);
CREATE INDEX IF NOT EXISTS idx_criafy_demands_status ON public.criafy_demands (status);
CREATE INDEX IF NOT EXISTS idx_criafy_demands_due_date ON public.criafy_demands (due_date);

ALTER TABLE public.criafy_demands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "criafy_demands members select" ON public.criafy_demands FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "criafy_demands members insert" ON public.criafy_demands FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "criafy_demands members update" ON public.criafy_demands FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "criafy_demands members delete" ON public.criafy_demands FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
