
-- =====================================================
-- dispatch_campaigns
-- =====================================================
CREATE TABLE public.dispatch_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  instance_id UUID REFERENCES public.instances(id),
  use_exclusive_instance BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatch_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dispatch_campaigns" ON public.dispatch_campaigns FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_dispatch_campaigns_updated_at BEFORE UPDATE ON public.dispatch_campaigns FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- dispatch_campaign_contacts
-- =====================================================
CREATE TABLE public.dispatch_campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.dispatch_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  status TEXT NOT NULL DEFAULT 'active',
  current_sequence_id UUID,
  current_step INTEGER NOT NULL DEFAULT 0,
  sequence_started_at TIMESTAMPTZ,
  sequence_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, lead_id)
);

CREATE INDEX idx_dispatch_contacts_campaign ON public.dispatch_campaign_contacts(campaign_id);
CREATE INDEX idx_dispatch_contacts_status ON public.dispatch_campaign_contacts(status);

ALTER TABLE public.dispatch_campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dispatch_campaign_contacts" ON public.dispatch_campaign_contacts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_dispatch_campaign_contacts_updated_at BEFORE UPDATE ON public.dispatch_campaign_contacts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- dispatch_sequences
-- =====================================================
CREATE TABLE public.dispatch_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.dispatch_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispatch_sequences_campaign ON public.dispatch_sequences(campaign_id);

ALTER TABLE public.dispatch_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dispatch_sequences" ON public.dispatch_sequences FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_dispatch_sequences_updated_at BEFORE UPDATE ON public.dispatch_sequences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add FK from contacts to sequences
ALTER TABLE public.dispatch_campaign_contacts ADD CONSTRAINT dispatch_contacts_sequence_fk FOREIGN KEY (current_sequence_id) REFERENCES public.dispatch_sequences(id) ON DELETE SET NULL;

-- =====================================================
-- dispatch_sequence_steps
-- =====================================================
CREATE TABLE public.dispatch_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sequence_id UUID NOT NULL REFERENCES public.dispatch_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  step_type TEXT NOT NULL,
  message_type TEXT,
  message_content TEXT,
  message_media_url TEXT,
  message_buttons JSONB,
  delay_value INTEGER,
  delay_unit TEXT,
  condition_type TEXT,
  condition_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispatch_steps_sequence ON public.dispatch_sequence_steps(sequence_id);
CREATE INDEX idx_dispatch_steps_order ON public.dispatch_sequence_steps(sequence_id, step_order);

ALTER TABLE public.dispatch_sequence_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dispatch_sequence_steps" ON public.dispatch_sequence_steps FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_dispatch_sequence_steps_updated_at BEFORE UPDATE ON public.dispatch_sequence_steps FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- dispatch_sequence_logs
-- =====================================================
CREATE TABLE public.dispatch_sequence_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sequence_id UUID REFERENCES public.dispatch_sequences(id),
  contact_id UUID REFERENCES public.dispatch_campaign_contacts(id),
  step_id UUID REFERENCES public.dispatch_sequence_steps(id),
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispatch_logs_sequence ON public.dispatch_sequence_logs(sequence_id);
CREATE INDEX idx_dispatch_logs_contact ON public.dispatch_sequence_logs(contact_id);

ALTER TABLE public.dispatch_sequence_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own dispatch_sequence_logs" ON public.dispatch_sequence_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view own dispatch_sequence_logs" ON public.dispatch_sequence_logs FOR SELECT USING (user_id = auth.uid());
