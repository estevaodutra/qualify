
-- 1. Criar tabela call_operators
CREATE TABLE call_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  operator_name TEXT NOT NULL,
  extension TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'offline',
  current_call_id UUID,
  current_campaign_id UUID,
  personal_interval_seconds INTEGER,
  last_call_ended_at TIMESTAMPTZ,
  total_calls INTEGER DEFAULT 0,
  total_calls_answered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, extension)
);

CREATE INDEX idx_call_operators_status ON call_operators(status);
CREATE INDEX idx_call_operators_active ON call_operators(is_active);
CREATE INDEX idx_call_operators_user ON call_operators(user_id);

ALTER TABLE call_operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own call_operators" ON call_operators
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE call_operators;

-- 2. Migrar dados existentes
INSERT INTO call_operators (user_id, operator_name, extension, is_active, status, personal_interval_seconds, last_call_ended_at, created_at)
SELECT DISTINCT ON (user_id, operator_name, extension)
  user_id, operator_name, extension, is_active, status, personal_interval_seconds, last_call_ended_at, created_at
FROM call_campaign_operators
ORDER BY user_id, operator_name, extension, created_at ASC;

-- 3. Nullify orphaned operator_id in call_logs before adding FK
UPDATE call_logs SET operator_id = NULL
WHERE operator_id IS NOT NULL
  AND operator_id NOT IN (SELECT id FROM call_operators);

-- 4. Update FK
ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS call_logs_operator_id_fkey;
ALTER TABLE call_logs ADD CONSTRAINT call_logs_operator_id_fkey
  FOREIGN KEY (operator_id) REFERENCES call_operators(id) ON DELETE SET NULL;

-- 5. Drop old table
DROP TABLE IF EXISTS call_campaign_operators;
