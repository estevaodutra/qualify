ALTER TABLE leads ADD COLUMN IF NOT EXISTS lid text;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS lid text;
CREATE INDEX IF NOT EXISTS idx_leads_lid ON leads(lid);
CREATE INDEX IF NOT EXISTS idx_group_members_lid ON group_members(lid);