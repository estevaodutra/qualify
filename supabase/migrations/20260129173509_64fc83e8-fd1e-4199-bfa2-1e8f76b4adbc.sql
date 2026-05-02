-- Adicionar 'orphaned' como status válido no constraint
ALTER TABLE sequence_executions 
DROP CONSTRAINT sequence_executions_status_check;

ALTER TABLE sequence_executions 
ADD CONSTRAINT sequence_executions_status_check 
CHECK (status = ANY (ARRAY['running'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'orphaned'::text, 'superseded'::text]));

-- Adicionar política RLS para service_role gerenciar todas as execuções
CREATE POLICY "Service role can manage all sequence_executions" 
ON sequence_executions
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Limpar execuções órfãs existentes que estão bloqueando o scheduler
UPDATE sequence_executions 
SET status = 'orphaned', 
    error_message = 'Manual cleanup - blocked scheduler',
    updated_at = now()
WHERE status = 'running' 
  AND updated_at < NOW() - INTERVAL '30 minutes';