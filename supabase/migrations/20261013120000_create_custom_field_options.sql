-- Migration: 20261013120000_create_custom_field_options.sql
-- Description: Create custom_field_options table to support select/multi_select options without requiring DDL on custom_fields_metadata

CREATE TABLE IF NOT EXISTS public.custom_field_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES public.custom_fields_metadata(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_field_options_field_id ON public.custom_field_options(field_id);

ALTER TABLE public.custom_field_options ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'custom_field_options' AND policyname = 'Allow all for custom_field_options'
  ) THEN
    CREATE POLICY "Allow all for custom_field_options" ON public.custom_field_options FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON TABLE public.custom_field_options TO authenticated, anon, service_role;
