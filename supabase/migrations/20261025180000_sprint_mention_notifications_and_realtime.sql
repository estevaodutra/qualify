-- =====================================================
-- MIGRATION: Notificações de Menções no Sprint e Realtime
-- =====================================================

-- 1. Garante que a tabela alerts possua os campos necessários para links e metadados
ALTER TABLE public.alerts 
  ADD COLUMN IF NOT EXISTS link TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Índices de performance para busca rápida por usuário e empresa
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_company_user ON public.alerts (company_id, user_id);

-- 3. Inclusão das tabelas no publication do Realtime do Supabase
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  EXCEPTION WHEN others THEN
    -- Ignora se já estiver na publicação
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sprint_mentions;
  EXCEPTION WHEN others THEN
    -- Ignora se já estiver na publicação
  END;
END $$;
