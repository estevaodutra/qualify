
-- Drop existing call_queue table and recreate with self-contained fields
DROP TABLE IF EXISTS call_queue CASCADE;

CREATE TABLE call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  campaign_id UUID NOT NULL REFERENCES call_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES call_leads(id) ON DELETE SET NULL,
  phone VARCHAR(20) NOT NULL,
  lead_name VARCHAR(255),
  position SERIAL,
  is_priority BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMPTZ,
  attempt_number INT DEFAULT 1,
  max_attempts INT DEFAULT 3,
  observations TEXT,
  status VARCHAR(20) DEFAULT 'waiting',
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID NOT NULL,
  UNIQUE(company_id, campaign_id, phone, attempt_number)
);

ALTER TABLE call_queue ENABLE ROW LEVEL SECURITY;

-- Re-create RLS policies (same as before)
CREATE POLICY "Company members can select call_queue"
ON call_queue FOR SELECT TO authenticated
USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid()))
  OR (company_id IS NULL AND user_id = auth.uid())
);

CREATE POLICY "Company members can insert call_queue"
ON call_queue FOR INSERT TO authenticated
WITH CHECK (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid()))
  OR (company_id IS NULL AND user_id = auth.uid())
);

CREATE POLICY "Company members can update call_queue"
ON call_queue FOR UPDATE TO authenticated
USING (
  (company_id IS NOT NULL AND is_company_member(company_id, auth.uid()))
  OR (company_id IS NULL AND user_id = auth.uid())
);

CREATE POLICY "Company members can delete call_queue"
ON call_queue FOR DELETE TO authenticated
USING (
  (company_id IS NOT NULL AND is_company_admin(company_id, auth.uid()))
  OR (company_id IS NULL AND user_id = auth.uid())
);
