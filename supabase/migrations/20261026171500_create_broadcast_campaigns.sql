-- Create broadcast_campaigns table
CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  workflow_id UUID REFERENCES public.message_sequences(id) ON DELETE SET NULL,
  instance_id UUID REFERENCES public.instances(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  distribution_mode TEXT NOT NULL DEFAULT 'daily_limit',
  daily_limit INTEGER NOT NULL DEFAULT 10,
  send_time_start TEXT NOT NULL DEFAULT '09:00',
  send_time_end TEXT NOT NULL DEFAULT '18:00',
  workdays_only BOOLEAN NOT NULL DEFAULT false,
  audience_filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_leads INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  pending_count INTEGER NOT NULL DEFAULT 0,
  estimated_completion_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies for broadcast_campaigns
DROP POLICY IF EXISTS "Company members can select broadcast_campaigns" ON public.broadcast_campaigns;
CREATE POLICY "Company members can select broadcast_campaigns" ON public.broadcast_campaigns
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = broadcast_campaigns.company_id AND cm.user_id = auth.uid()) OR
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Company members can insert broadcast_campaigns" ON public.broadcast_campaigns;
CREATE POLICY "Company members can insert broadcast_campaigns" ON public.broadcast_campaigns
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NULL OR 
    EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = broadcast_campaigns.company_id AND cm.user_id = auth.uid()) OR
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Company members can update broadcast_campaigns" ON public.broadcast_campaigns;
CREATE POLICY "Company members can update broadcast_campaigns" ON public.broadcast_campaigns
  FOR UPDATE TO authenticated
  USING (
    company_id IS NULL OR 
    EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = broadcast_campaigns.company_id AND cm.user_id = auth.uid()) OR
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Company members can delete broadcast_campaigns" ON public.broadcast_campaigns;
CREATE POLICY "Company members can delete broadcast_campaigns" ON public.broadcast_campaigns
  FOR DELETE TO authenticated
  USING (
    company_id IS NULL OR 
    EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = broadcast_campaigns.company_id AND cm.user_id = auth.uid()) OR
    user_id = auth.uid()
  );

-- Create broadcast_recipients table
CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.broadcast_campaigns(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  batch_index INTEGER NOT NULL DEFAULT 1,
  scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  dispatched_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id ON public.broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status ON public.broadcast_recipients(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_date ON public.broadcast_recipients(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_company ON public.broadcast_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_status ON public.broadcast_campaigns(status);

-- Policies for broadcast_recipients
DROP POLICY IF EXISTS "Company members can select broadcast_recipients" ON public.broadcast_recipients;
CREATE POLICY "Company members can select broadcast_recipients" ON public.broadcast_recipients
  FOR SELECT TO authenticated
  USING (
    company_id IS NULL OR 
    EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = broadcast_recipients.company_id AND cm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Company members can insert broadcast_recipients" ON public.broadcast_recipients;
CREATE POLICY "Company members can insert broadcast_recipients" ON public.broadcast_recipients
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IS NULL OR 
    EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = broadcast_recipients.company_id AND cm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Company members can update broadcast_recipients" ON public.broadcast_recipients;
CREATE POLICY "Company members can update broadcast_recipients" ON public.broadcast_recipients
  FOR UPDATE TO authenticated
  USING (
    company_id IS NULL OR 
    EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = broadcast_recipients.company_id AND cm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Company members can delete broadcast_recipients" ON public.broadcast_recipients;
CREATE POLICY "Company members can delete broadcast_recipients" ON public.broadcast_recipients
  FOR DELETE TO authenticated
  USING (
    company_id IS NULL OR 
    EXISTS (SELECT 1 FROM public.company_members cm WHERE cm.company_id = broadcast_recipients.company_id AND cm.user_id = auth.uid())
  );

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trg_broadcast_campaigns_updated_at ON public.broadcast_campaigns;
CREATE TRIGGER trg_broadcast_campaigns_updated_at
  BEFORE UPDATE ON public.broadcast_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_broadcast_recipients_updated_at ON public.broadcast_recipients;
CREATE TRIGGER trg_broadcast_recipients_updated_at
  BEFORE UPDATE ON public.broadcast_recipients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
