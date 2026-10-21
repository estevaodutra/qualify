-- ========================================================
-- MIGRATION: SPRINT OS — CRONOGRAMA INTERATIVO
-- Workspace por projeto (documento versionado, concorrência otimista),
-- log de atividades imutável, templates versionados e links de compartilhamento.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.sprint_os_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  archived_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprint_os_workspaces_company ON public.sprint_os_workspaces (company_id);

ALTER TABLE public.sprint_os_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_os_workspaces members select" ON public.sprint_os_workspaces FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_os_workspaces members insert" ON public.sprint_os_workspaces FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
-- UPDATE somente via RPC sprint_os_save (controle de versão). Sem DELETE físico (arquivamento lógico).

-- Salvar com concorrência otimista: falha se a versão esperada não for a atual.
CREATE OR REPLACE FUNCTION public.sprint_os_save(p_id UUID, p_expected_version INTEGER, p_data JSONB, p_name TEXT)
RETURNS TABLE (ok BOOLEAN, current_version INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_company UUID; v_version INTEGER;
BEGIN
  SELECT company_id, version INTO v_company, v_version FROM sprint_os_workspaces WHERE id = p_id FOR UPDATE;
  IF v_company IS NULL THEN RAISE EXCEPTION 'workspace not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM company_members WHERE company_id = v_company AND user_id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_version <> p_expected_version THEN
    RETURN QUERY SELECT false, v_version; RETURN;
  END IF;
  UPDATE sprint_os_workspaces SET data = p_data, name = COALESCE(p_name, name), version = v_version + 1,
    updated_by = auth.uid(), updated_at = now() WHERE id = p_id;
  RETURN QUERY SELECT true, v_version + 1;
END $$;
GRANT EXECUTE ON FUNCTION public.sprint_os_save(UUID, INTEGER, JSONB, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.sprint_os_archive(p_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE sprint_os_workspaces w SET archived_at = now(), updated_by = auth.uid()
  WHERE w.id = p_id AND w.company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid() AND is_active = true);
END $$;
GRANT EXECUTE ON FUNCTION public.sprint_os_archive(UUID) TO authenticated;

-- Log de atividades: append-only (sem UPDATE/DELETE).
CREATE TABLE IF NOT EXISTS public.sprint_os_activity_logs (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.sprint_os_workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  summary TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprint_os_logs_ws ON public.sprint_os_activity_logs (workspace_id, created_at DESC);
ALTER TABLE public.sprint_os_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_os_logs select" ON public.sprint_os_activity_logs FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_os_logs insert" ON public.sprint_os_activity_logs FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- Templates versionados (independentes das instâncias).
CREATE TABLE IF NOT EXISTS public.sprint_os_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  source_id TEXT,
  payload JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sprint_os_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_os_templates all" ON public.sprint_os_templates FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- Links de compartilhamento somente-leitura para externos.
CREATE TABLE IF NOT EXISTS public.sprint_os_share_links (
  token TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.sprint_os_workspaces(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label TEXT,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sprint_os_share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_os_share all" ON public.sprint_os_share_links FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- Leitura pública por token: remove dados financeiros/sensíveis no servidor.
CREATE OR REPLACE FUNCTION public.sprint_os_get_shared(p_token TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  SELECT (w.data - 'costs' - 'financialRecords' - 'activity' - 'prompts') INTO v
  FROM sprint_os_share_links s JOIN sprint_os_workspaces w ON w.id = s.workspace_id
  WHERE s.token = p_token AND s.revoked_at IS NULL AND (s.expires_at IS NULL OR s.expires_at > now()) AND w.archived_at IS NULL;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION public.sprint_os_get_shared(TEXT) TO anon, authenticated;
