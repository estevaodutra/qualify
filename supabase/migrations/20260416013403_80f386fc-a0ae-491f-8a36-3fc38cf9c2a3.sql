-- Fix existing data: move @lid values from phone to lid
UPDATE leads SET lid = phone, phone = NULL WHERE phone LIKE '%@lid%';
UPDATE group_members SET lid = phone, phone = NULL WHERE phone LIKE '%@lid%';

-- Make phone nullable
ALTER TABLE leads ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE group_members ALTER COLUMN phone DROP NOT NULL;

-- Add check constraint: must have phone OR lid
ALTER TABLE leads ADD CONSTRAINT check_leads_phone_or_lid CHECK (phone IS NOT NULL OR lid IS NOT NULL);
ALTER TABLE group_members ADD CONSTRAINT check_gm_phone_or_lid CHECK (phone IS NOT NULL OR lid IS NOT NULL);

-- Partial unique index for lid-based dedup on leads
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_lid_user ON leads(lid, user_id) WHERE lid IS NOT NULL;
