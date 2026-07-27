-- Migration: 20260727140000_alter_workflow_ura_tasks.sql
-- Description: Alter workflow_ura_tasks column types to support new simplified MOS BR IDs

ALTER TABLE public.workflow_ura_tasks 
  ALTER COLUMN mos_campaign_id TYPE TEXT USING mos_campaign_id::text,
  ADD COLUMN IF NOT EXISTS mos_ura_id TEXT,
  ADD COLUMN IF NOT EXISTS mos_id_type TEXT DEFAULT 'campaign';

NOTIFY pgrst, 'reload schema';
