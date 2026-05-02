
-- Campo de intervalo na campanha
ALTER TABLE call_campaigns ADD COLUMN dial_delay_minutes integer DEFAULT 10;

-- Campo de agendamento no log de ligacao
ALTER TABLE call_logs ADD COLUMN scheduled_for timestamptz;

-- Habilitar realtime para uso futuro
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
