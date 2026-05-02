-- 1. call_campaigns
CREATE TABLE IF NOT EXISTS public.call_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  api4com_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.call_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own call_campaigns" ON public.call_campaigns
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_call_campaigns_user_status 
  ON public.call_campaigns(user_id, status);

CREATE TRIGGER update_call_campaigns_updated_at
  BEFORE UPDATE ON public.call_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. call_campaign_operators
CREATE TABLE IF NOT EXISTS public.call_campaign_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.call_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  operator_name TEXT,
  extension TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

ALTER TABLE public.call_campaign_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage operators via campaign" ON public.call_campaign_operators
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.call_campaigns 
      WHERE id = campaign_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.call_campaigns 
      WHERE id = campaign_id AND user_id = auth.uid()
    )
  );

-- 3. call_scripts
CREATE TABLE IF NOT EXISTS public.call_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.call_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Roteiro Principal',
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.call_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own call_scripts" ON public.call_scripts
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_call_scripts_updated_at
  BEFORE UPDATE ON public.call_scripts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. call_script_actions
CREATE TABLE IF NOT EXISTS public.call_script_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.call_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10b981',
  icon TEXT DEFAULT 'check',
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.call_script_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own call_script_actions" ON public.call_script_actions
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- 5. call_leads
CREATE TABLE IF NOT EXISTS public.call_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.call_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  custom_fields JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  result_action_id UUID REFERENCES public.call_script_actions(id) ON DELETE SET NULL,
  result_notes TEXT,
  assigned_operator_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.call_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own call_leads" ON public.call_leads
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_call_leads_campaign_status 
  ON public.call_leads(campaign_id, status);

CREATE TRIGGER update_call_leads_updated_at
  BEFORE UPDATE ON public.call_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. call_logs
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.call_campaigns(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.call_leads(id) ON DELETE SET NULL,
  operator_id UUID,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  action_id UUID REFERENCES public.call_script_actions(id) ON DELETE SET NULL,
  notes TEXT,
  script_path JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own call_logs" ON public.call_logs
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_call_logs_campaign 
  ON public.call_logs(campaign_id);