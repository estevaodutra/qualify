
-- ============================================
-- LEADS MODULE: 3 tables + RLS + indices
-- ============================================

-- 1. leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}',
  active_campaign_id UUID,
  active_campaign_type TEXT,
  total_calls INT DEFAULT 0,
  total_messages INT DEFAULT 0,
  last_contact_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, phone)
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own leads"
  ON public.leads FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_leads_phone ON public.leads(phone);
CREATE INDEX idx_leads_tags ON public.leads USING GIN(tags);
CREATE INDEX idx_leads_active_campaign ON public.leads(active_campaign_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. lead_campaign_history table
CREATE TABLE public.lead_campaign_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL,
  campaign_type TEXT NOT NULL,
  campaign_name TEXT,
  status TEXT,
  result_action TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.lead_campaign_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lead_campaign_history"
  ON public.lead_campaign_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own lead_campaign_history"
  ON public.lead_campaign_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_lead_history_lead ON public.lead_campaign_history(lead_id);

-- 3. call_queue table
CREATE TABLE public.call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.call_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  position INT NOT NULL,
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_result TEXT,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, lead_id)
);

ALTER TABLE public.call_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own call_queue"
  ON public.call_queue FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_call_queue_campaign ON public.call_queue(campaign_id);
CREATE INDEX idx_call_queue_position ON public.call_queue(campaign_id, position);
CREATE INDEX idx_call_queue_status ON public.call_queue(status);

CREATE TRIGGER update_call_queue_updated_at
  BEFORE UPDATE ON public.call_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
