-- Tabela de Campanhas de Contexto
CREATE TABLE public.context_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  group_jid TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'keyword')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Execuções de Contexto
CREATE TABLE public.context_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.context_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'collecting' CHECK (status IN ('collecting', 'completed', 'failed')),
  trigger_message TEXT,
  result_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_context_campaigns_company ON public.context_campaigns(company_id);
CREATE INDEX idx_context_campaigns_trigger ON public.context_campaigns(trigger_type);
CREATE INDEX idx_context_executions_campaign ON public.context_executions(campaign_id);
CREATE INDEX idx_context_executions_status ON public.context_executions(status);
CREATE INDEX idx_context_executions_end_at ON public.context_executions(end_at);

-- RLS Policies
ALTER TABLE public.context_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view context campaigns" ON public.context_campaigns
  FOR SELECT TO authenticated USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can manage context campaigns" ON public.context_campaigns
  FOR ALL TO authenticated USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can view context executions" ON public.context_executions
  FOR SELECT TO authenticated USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can manage context executions" ON public.context_executions
  FOR ALL TO authenticated USING (is_company_member(company_id, auth.uid()));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_context_campaigns_updated_at
    BEFORE UPDATE ON public.context_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
