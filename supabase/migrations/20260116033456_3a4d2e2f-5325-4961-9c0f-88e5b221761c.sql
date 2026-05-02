-- Tabela para armazenar eventos dos provedores (histórico 24h)
CREATE TABLE public.provider_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('message_sent', 'message_received', 'connected', 'disconnected', 'message_status', 'chat_presence')),
  instance_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('Z-API', 'Evolution API', 'Other')),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_provider_events_instance ON public.provider_events(instance_id);
CREATE INDEX idx_provider_events_type ON public.provider_events(event_type);
CREATE INDEX idx_provider_events_created ON public.provider_events(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;

-- Política pública para leitura (webhooks não têm usuário autenticado)
CREATE POLICY "Allow public read of provider events" 
ON public.provider_events 
FOR SELECT 
USING (true);

-- Política pública para inserção (webhooks do n8n)
CREATE POLICY "Allow public insert of provider events" 
ON public.provider_events 
FOR INSERT 
WITH CHECK (true);

-- Política pública para deleção (limpeza automática)
CREATE POLICY "Allow public delete of provider events" 
ON public.provider_events 
FOR DELETE 
USING (true);

-- Comentários na tabela
COMMENT ON TABLE public.provider_events IS 'Armazena eventos de comunicação com provedores (Z-API, Evolution API). Dados mantidos por 24 horas.';
COMMENT ON COLUMN public.provider_events.event_type IS 'Tipo do evento: message_sent, message_received, connected, disconnected, message_status, chat_presence';
COMMENT ON COLUMN public.provider_events.instance_id IS 'ID da instância WhatsApp';
COMMENT ON COLUMN public.provider_events.provider IS 'Provedor de API: Z-API, Evolution API, Other';
COMMENT ON COLUMN public.provider_events.payload IS 'Dados do evento em formato JSON';