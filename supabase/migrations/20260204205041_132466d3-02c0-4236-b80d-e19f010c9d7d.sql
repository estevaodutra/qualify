-- Adicionar coluna para ID externo da ligação (API4com)
ALTER TABLE call_logs ADD COLUMN external_call_id text;

-- Adicionar coluna para status da ligação
ALTER TABLE call_logs ADD COLUMN call_status text DEFAULT 'dialing';

-- Índice para busca rápida pelo ID externo
CREATE INDEX idx_call_logs_external_call_id 
ON call_logs(external_call_id) 
WHERE external_call_id IS NOT NULL;