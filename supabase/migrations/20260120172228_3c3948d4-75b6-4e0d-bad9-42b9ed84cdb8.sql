-- Tabela de logs de API
CREATE TABLE public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  ip_address TEXT,
  api_key_id UUID REFERENCES public.api_keys(id),
  request_body JSONB,
  response_body JSONB,
  error_message TEXT
);

-- Tabela de logs de despacho
CREATE TABLE public.dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  campaign_id UUID,
  instance_id UUID REFERENCES public.instances(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  error_message TEXT
);

-- Tabela de campanhas
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT DEFAULT 'draft',
  sent INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de alertas
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT,
  entity TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  read BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Policies para api_logs
CREATE POLICY "Allow public read of api_logs" ON public.api_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert of api_logs" ON public.api_logs FOR INSERT WITH CHECK (true);

-- Policies para dispatch_logs
CREATE POLICY "Allow public read of dispatch_logs" ON public.dispatch_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert of dispatch_logs" ON public.dispatch_logs FOR INSERT WITH CHECK (true);

-- Policies para campaigns
CREATE POLICY "Allow public read of campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Allow public insert of campaigns" ON public.campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of campaigns" ON public.campaigns FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of campaigns" ON public.campaigns FOR DELETE USING (true);

-- Policies para alerts
CREATE POLICY "Allow public read of alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Allow public insert of alerts" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update of alerts" ON public.alerts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete of alerts" ON public.alerts FOR DELETE USING (true);