-- =====================================================
-- workflow_folder_parents: hierarchical subfolders for
-- workflow_folders (parent-child relationship).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.workflow_folder_parents (
  folder_id uuid PRIMARY KEY REFERENCES public.workflow_folders(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.workflow_folders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_folder_parents_parent_id 
  ON public.workflow_folder_parents(parent_id);

ALTER TABLE public.workflow_folder_parents ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workflow_folder_parents' AND policyname = 'Allow authenticated read folder parents'
  ) THEN
    CREATE POLICY "Allow authenticated read folder parents" 
      ON public.workflow_folder_parents FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workflow_folder_parents' AND policyname = 'Allow authenticated insert folder parents'
  ) THEN
    CREATE POLICY "Allow authenticated insert folder parents" 
      ON public.workflow_folder_parents FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workflow_folder_parents' AND policyname = 'Allow authenticated update folder parents'
  ) THEN
    CREATE POLICY "Allow authenticated update folder parents" 
      ON public.workflow_folder_parents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workflow_folder_parents' AND policyname = 'Allow authenticated delete folder parents'
  ) THEN
    CREATE POLICY "Allow authenticated delete folder parents" 
      ON public.workflow_folder_parents FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

GRANT ALL ON TABLE public.workflow_folder_parents TO authenticated, service_role;
