-- ========================================================
-- MIGRATION: ANEXOS E ARQUIVOS DO SPRINT (CHECKLIST, COMENTÁRIOS E CARTÕES)
-- ========================================================

-- 1. Garante colunas de anexo direto nos itens de checklist
ALTER TABLE public.sprint_checklist_items 
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- 2. Garante colunas de anexo direto nos comentários dos cartões
ALTER TABLE public.sprint_card_comments 
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size BIGINT,
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- 3. Tabela consolidada de anexos do Sprint (Arquivos do Quadro e do Cartão)
CREATE TABLE IF NOT EXISTS public.sprint_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.sprint_boards(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.sprint_cards(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES public.sprint_checklist_items(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.sprint_card_comments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  file_type TEXT DEFAULT '',
  storage_path TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_sprint_attachments_board ON public.sprint_attachments(board_id);
CREATE INDEX IF NOT EXISTS idx_sprint_attachments_card ON public.sprint_attachments(card_id);
CREATE INDEX IF NOT EXISTS idx_sprint_attachments_item ON public.sprint_attachments(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_sprint_attachments_comment ON public.sprint_attachments(comment_id);

-- 4. RLS para sprint_attachments
ALTER TABLE public.sprint_attachments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sprint_attachments' AND policyname = 'sprint_attachments_all'
  ) THEN
    CREATE POLICY "sprint_attachments_all" ON public.sprint_attachments FOR ALL TO authenticated
      USING (company_id IN (
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
      ));
  END IF;
END $$;

-- 5. Bucket de storage dedicado para sprint-files (se ainda não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sprint-files', 'sprint-files', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  -- Permissões no bucket sprint-files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'sprint_files_select'
  ) THEN
    CREATE POLICY "sprint_files_select" ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'sprint-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'sprint_files_insert'
  ) THEN
    CREATE POLICY "sprint_files_insert" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'sprint-files');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'sprint_files_delete'
  ) THEN
    CREATE POLICY "sprint_files_delete" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'sprint-files');
  END IF;
END $$;
