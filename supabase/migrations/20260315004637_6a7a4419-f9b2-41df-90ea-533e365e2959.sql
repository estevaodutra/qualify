
-- Tabela principal de campanhas pirata
CREATE TABLE public.pirate_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  instance_id UUID REFERENCES public.instances(id),
  name TEXT NOT NULL,
  description TEXT,
  webhook_url TEXT,
  webhook_headers JSONB DEFAULT '{}',
  auto_create_lead BOOLEAN DEFAULT true,
  ignore_duplicates BOOLEAN DEFAULT false,
  target_campaign_id UUID,
  status TEXT DEFAULT 'active',
  total_leads_captured INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pirate_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage pirate_campaigns"
  ON public.pirate_campaigns FOR ALL TO authenticated
  USING (is_company_member(company_id, auth.uid()) OR user_id = auth.uid())
  WITH CHECK (is_company_member(company_id, auth.uid()) OR user_id = auth.uid());

-- Grupos vinculados a campanhas pirata
CREATE TABLE public.pirate_campaign_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.pirate_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  group_jid TEXT NOT NULL,
  group_name TEXT,
  is_active BOOLEAN DEFAULT true,
  leads_captured INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, group_jid)
);

ALTER TABLE public.pirate_campaign_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pirate_campaign_groups"
  ON public.pirate_campaign_groups FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Leads capturados
CREATE TABLE public.pirate_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.pirate_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  group_jid TEXT NOT NULL,
  phone TEXT NOT NULL,
  lid TEXT,
  lead_id UUID,
  webhook_sent BOOLEAN DEFAULT false,
  webhook_sent_at TIMESTAMPTZ,
  webhook_response_status INT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pirate_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage pirate_leads"
  ON public.pirate_leads FOR ALL TO authenticated
  USING (is_company_member(company_id, auth.uid()) OR user_id = auth.uid())
  WITH CHECK (is_company_member(company_id, auth.uid()) OR user_id = auth.uid());

CREATE INDEX idx_pirate_leads_campaign ON public.pirate_leads(campaign_id);
CREATE INDEX idx_pirate_leads_duplicate ON public.pirate_leads(campaign_id, phone);

-- Funcao para incrementar contadores
CREATE OR REPLACE FUNCTION public.increment_pirate_counters(
  p_campaign_id UUID, p_group_jid TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE pirate_campaigns SET total_leads_captured = total_leads_captured + 1, updated_at = now() WHERE id = p_campaign_id;
  UPDATE pirate_campaign_groups SET leads_captured = leads_captured + 1, updated_at = now() WHERE campaign_id = p_campaign_id AND group_jid = p_group_jid;
END;
$$;
