-- Add notes and comments support to sprint checklist items
ALTER TABLE public.sprint_checklist_items ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS public.sprint_checklist_item_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id UUID NOT NULL REFERENCES public.sprint_checklist_items(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.sprint_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprint_chk_item_comments_item ON public.sprint_checklist_item_comments(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_sprint_chk_item_comments_card ON public.sprint_checklist_item_comments(card_id);

ALTER TABLE public.sprint_checklist_item_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sprint_checklist_item_comments' AND policyname = 'sprint_chk_item_comments_all'
  ) THEN
    CREATE POLICY "sprint_chk_item_comments_all" ON public.sprint_checklist_item_comments FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.sprint_cards c WHERE c.id = sprint_checklist_item_comments.card_id AND c.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true)));
  END IF;
END $$;
