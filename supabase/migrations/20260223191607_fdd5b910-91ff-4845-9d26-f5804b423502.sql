ALTER TABLE call_campaigns ADD COLUMN is_priority BOOLEAN DEFAULT false;
ALTER TABLE call_campaigns ADD COLUMN priority_position INT DEFAULT 3;