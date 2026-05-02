-- Create instances table
CREATE TABLE public.instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  provider TEXT NOT NULL,
  external_instance_id TEXT,
  external_instance_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ,
  messages_count INTEGER DEFAULT 0
);

-- Indexes for fast lookup
CREATE INDEX idx_instances_phone ON public.instances(phone);
CREATE INDEX idx_instances_external_id ON public.instances(external_instance_id);
CREATE INDEX idx_instances_external_token ON public.instances(external_instance_token);

-- Enable RLS
ALTER TABLE public.instances ENABLE ROW LEVEL SECURITY;

-- RLS policies (public access for API key authenticated requests)
CREATE POLICY "Allow public read of instances" 
ON public.instances FOR SELECT USING (true);

CREATE POLICY "Allow public insert of instances" 
ON public.instances FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update of instances" 
ON public.instances FOR UPDATE USING (true);

CREATE POLICY "Allow public delete of instances" 
ON public.instances FOR DELETE USING (true);

-- Insert test data with the external_instance_id the user tested
INSERT INTO public.instances (name, phone, status, provider, external_instance_id, external_instance_token, messages_count)
VALUES 
  ('WhatsApp Principal', '5511999999999', 'connected', 'evolution', '3E2535E6DDA3413414F54AAAADA6D328', 'token_abc123', 1542),
  ('WhatsApp Suporte', '5511988888888', 'connected', 'z-api', 'ext_uvw456', 'token_def456', 892),
  ('WhatsApp Vendas', '5511977777777', 'disconnected', 'evolution', 'ext_xyz789', 'token_ghi789', 2341);