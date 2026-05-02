-- Adicionar colunas necessárias para logging detalhado
ALTER TABLE group_message_logs
ADD COLUMN IF NOT EXISTS sequence_id uuid,
ADD COLUMN IF NOT EXISTS node_type text,
ADD COLUMN IF NOT EXISTS node_order integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS group_jid text,
ADD COLUMN IF NOT EXISTS group_name text,
ADD COLUMN IF NOT EXISTS instance_id uuid,
ADD COLUMN IF NOT EXISTS instance_name text,
ADD COLUMN IF NOT EXISTS error_message text,
ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS response_time_ms integer,
ADD COLUMN IF NOT EXISTS campaign_name text;

-- Habilitar realtime para atualizações ao vivo
ALTER PUBLICATION supabase_realtime ADD TABLE group_message_logs;