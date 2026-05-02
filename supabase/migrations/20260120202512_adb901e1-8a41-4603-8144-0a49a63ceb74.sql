-- Create the handle_updated_at function first
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela principal de campanhas de grupo
CREATE TABLE public.group_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instance_id UUID REFERENCES public.instances(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  group_jid TEXT,
  group_name TEXT,
  group_description TEXT,
  group_photo_url TEXT,
  invite_link TEXT,
  status TEXT DEFAULT 'draft',
  message_permission TEXT DEFAULT 'all',
  edit_permission TEXT DEFAULT 'all',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Membros do grupo
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_campaign_id UUID REFERENCES public.group_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  profile_photo TEXT,
  status TEXT DEFAULT 'active',
  strikes INTEGER DEFAULT 0,
  last_strike_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  is_admin BOOLEAN DEFAULT false,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ
);

-- Histórico de membros
CREATE TABLE public.group_member_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_campaign_id UUID REFERENCES public.group_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  member_phone TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mensagens automáticas
CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_campaign_id UUID REFERENCES public.group_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  trigger_keyword TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  schedule JSONB,
  send_private BOOLEAN DEFAULT false,
  mention_member BOOLEAN DEFAULT false,
  sequence_order INTEGER DEFAULT 0,
  delay_seconds INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Regras de moderação
CREATE TABLE public.group_moderation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_campaign_id UUID REFERENCES public.group_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  rule_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  action TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Logs de moderação
CREATE TABLE public.group_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_campaign_id UUID REFERENCES public.group_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  member_id UUID REFERENCES public.group_members(id) ON DELETE SET NULL,
  member_phone TEXT,
  rule_id UUID REFERENCES public.group_moderation_rules(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  reason TEXT,
  message_content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Logs de mensagens enviadas
CREATE TABLE public.group_message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_campaign_id UUID REFERENCES public.group_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  message_id UUID REFERENCES public.group_messages(id) ON DELETE SET NULL,
  recipient_phone TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_member_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_moderation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_message_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_campaigns
CREATE POLICY "Users can view own group_campaigns" ON public.group_campaigns FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own group_campaigns" ON public.group_campaigns FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own group_campaigns" ON public.group_campaigns FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own group_campaigns" ON public.group_campaigns FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for group_members
CREATE POLICY "Users can view own group_members" ON public.group_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own group_members" ON public.group_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own group_members" ON public.group_members FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own group_members" ON public.group_members FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for group_member_history
CREATE POLICY "Users can view own group_member_history" ON public.group_member_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own group_member_history" ON public.group_member_history FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for group_messages
CREATE POLICY "Users can view own group_messages" ON public.group_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own group_messages" ON public.group_messages FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own group_messages" ON public.group_messages FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own group_messages" ON public.group_messages FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for group_moderation_rules
CREATE POLICY "Users can view own group_moderation_rules" ON public.group_moderation_rules FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own group_moderation_rules" ON public.group_moderation_rules FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own group_moderation_rules" ON public.group_moderation_rules FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own group_moderation_rules" ON public.group_moderation_rules FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for group_moderation_logs
CREATE POLICY "Users can view own group_moderation_logs" ON public.group_moderation_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own group_moderation_logs" ON public.group_moderation_logs FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for group_message_logs
CREATE POLICY "Users can view own group_message_logs" ON public.group_message_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own group_message_logs" ON public.group_message_logs FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_group_campaigns_updated_at
  BEFORE UPDATE ON public.group_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();