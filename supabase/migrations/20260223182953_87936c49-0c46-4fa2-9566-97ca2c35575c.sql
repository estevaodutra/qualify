ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_name text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_campaign_id uuid;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_group_id uuid;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source_group_name text;