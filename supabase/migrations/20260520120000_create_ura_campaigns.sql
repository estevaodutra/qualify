-- Tabelas para Campanhas de URA (TVOZ)
CREATE TABLE IF NOT EXISTS public.ura_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  
  -- Configurações específicas do MOS BR
  service_id INT,
  regra_renitencia_id INT,
  cost_center_name TEXT,
  data_termino TIMESTAMPTZ,
  agressividade INT DEFAULT 1,
  limite_canais_ativos INT DEFAULT 0,
  limite_canais INT DEFAULT 0,
  
  -- Configurações de Áudio / TTS / URA
  audio_type TEXT DEFAULT 'audio' CHECK (audio_type IN ('audio', 'tts', 'ura')),
  audio_value TEXT, -- Nome do áudio, texto do TTS, ou nome da URA na plataforma
  
  -- Configurações de Ações de DTMF (JSONB)
  dtmf_actions JSONB DEFAULT '{}'::jsonb,

  -- Configuração de SMS alternativo (se a ligação falhar)
  sms_message TEXT,
  sms_service_id INT,
  sms_rule TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.ura_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage URA campaigns" ON public.ura_campaigns
  FOR ALL TO authenticated USING (is_company_member(company_id, auth.uid()));

-- Tabela de Leads da URA
CREATE TABLE IF NOT EXISTS public.ura_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.ura_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  -- Estado de execução
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'calling', 'completed', 'no_answer', 'busy', 'failed', 'cancelled')),
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  duration_seconds INT,
  cause_id INT,
  cause_name TEXT,
  dtmf_pressed TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ura_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage URA leads" ON public.ura_leads
  FOR ALL TO authenticated USING (is_company_member(company_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ura_leads_campaign_status ON public.ura_leads(campaign_id, status);

-- Tabela de Logs de Chamadas da URA (Histórico detalhado)
CREATE TABLE IF NOT EXISTS public.ura_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.ura_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.ura_leads(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  status_id INT,
  status_name TEXT,
  cause_id INT,
  cause_name TEXT,
  dtmf_pressed TEXT,
  cost_value NUMERIC(10, 4),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ura_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view URA logs" ON public.ura_logs
  FOR SELECT TO authenticated USING (is_company_member(company_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ura_logs_campaign ON public.ura_logs(campaign_id);

-- Gatilhos de update_at
CREATE TRIGGER update_ura_campaigns_updated_at
  BEFORE UPDATE ON public.ura_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_ura_leads_updated_at
  BEFORE UPDATE ON public.ura_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
