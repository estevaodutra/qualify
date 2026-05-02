-- Add columns to store Z-API response data
ALTER TABLE group_message_logs
ADD COLUMN IF NOT EXISTS provider_response jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS zaap_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS external_message_id text DEFAULT NULL;

COMMENT ON COLUMN group_message_logs.provider_response IS 'Resposta completa do provedor (Z-API/Evolution)';
COMMENT ON COLUMN group_message_logs.zaap_id IS 'ID interno do Z-API (zaapId)';
COMMENT ON COLUMN group_message_logs.external_message_id IS 'ID da mensagem no WhatsApp (messageId)';