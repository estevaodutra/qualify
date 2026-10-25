-- ========================================================
-- MIGRATION: SPRINT APP — CLONE DO TRELLO (KANBAN MODERNO)
-- Módulo 100% independente do Cronogramas
-- ========================================================

-- 1. QUADROS (BOARDS)
CREATE TABLE IF NOT EXISTS public.sprint_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  background_value TEXT NOT NULL DEFAULT '#0F172A',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprint_boards_company ON public.sprint_boards(company_id);

ALTER TABLE public.sprint_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_boards_select" ON public.sprint_boards FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_boards_insert" ON public.sprint_boards FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_boards_update" ON public.sprint_boards FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_boards_delete" ON public.sprint_boards FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- 2. LISTAS / COLUNAS (LISTS)
CREATE TABLE IF NOT EXISTS public.sprint_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.sprint_boards(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position DOUBLE PRECISION NOT NULL DEFAULT 65535,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprint_lists_board ON public.sprint_lists(board_id);

ALTER TABLE public.sprint_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_lists_select" ON public.sprint_lists FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_lists_insert" ON public.sprint_lists FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_lists_update" ON public.sprint_lists FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_lists_delete" ON public.sprint_lists FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- 3. CARTÕES (CARDS)
CREATE TABLE IF NOT EXISTS public.sprint_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.sprint_lists(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.sprint_boards(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  position DOUBLE PRECISION NOT NULL DEFAULT 65535,
  due_date TIMESTAMPTZ,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  cover_color TEXT,
  archived_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprint_cards_list ON public.sprint_cards(list_id);
CREATE INDEX IF NOT EXISTS idx_sprint_cards_board ON public.sprint_cards(board_id);

ALTER TABLE public.sprint_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_cards_select" ON public.sprint_cards FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_cards_insert" ON public.sprint_cards FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_cards_update" ON public.sprint_cards FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_cards_delete" ON public.sprint_cards FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- 4. ETIQUETAS DO QUADRO (LABELS)
CREATE TABLE IF NOT EXISTS public.sprint_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.sprint_boards(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprint_labels_board ON public.sprint_labels(board_id);

ALTER TABLE public.sprint_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_labels_select" ON public.sprint_labels FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_labels_insert" ON public.sprint_labels FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_labels_update" ON public.sprint_labels FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "sprint_labels_delete" ON public.sprint_labels FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- 5. RELAÇÃO CARTÃO - ETIQUETA
CREATE TABLE IF NOT EXISTS public.sprint_card_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.sprint_cards(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.sprint_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(card_id, label_id)
);
CREATE INDEX IF NOT EXISTS idx_sprint_card_labels_card ON public.sprint_card_labels(card_id);

ALTER TABLE public.sprint_card_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_card_labels_all" ON public.sprint_card_labels FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sprint_cards c WHERE c.id = sprint_card_labels.card_id AND c.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true)));

-- 6. MEMBROS ATRIBUÍDOS AO CARTÃO
CREATE TABLE IF NOT EXISTS public.sprint_card_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.sprint_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(card_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_sprint_card_members_card ON public.sprint_card_members(card_id);

ALTER TABLE public.sprint_card_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_card_members_all" ON public.sprint_card_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sprint_cards c WHERE c.id = sprint_card_members.card_id AND c.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true)));

-- 7. CHECKLISTS
CREATE TABLE IF NOT EXISTS public.sprint_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.sprint_cards(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Checklist',
  position DOUBLE PRECISION NOT NULL DEFAULT 65535,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprint_checklists_card ON public.sprint_checklists(card_id);

ALTER TABLE public.sprint_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_checklists_all" ON public.sprint_checklists FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sprint_cards c WHERE c.id = sprint_checklists.card_id AND c.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true)));

-- 8. ITENS DO CHECKLIST
CREATE TABLE IF NOT EXISTS public.sprint_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.sprint_checklists(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.sprint_cards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  position DOUBLE PRECISION NOT NULL DEFAULT 65535,
  due_date TIMESTAMPTZ,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprint_checklist_items_ch ON public.sprint_checklist_items(checklist_id);

ALTER TABLE public.sprint_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_checklist_items_all" ON public.sprint_checklist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sprint_cards c WHERE c.id = sprint_checklist_items.card_id AND c.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true)));

-- 9. COMENTÁRIOS DO CARTÃO
CREATE TABLE IF NOT EXISTS public.sprint_card_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.sprint_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprint_card_comments_card ON public.sprint_card_comments(card_id);

ALTER TABLE public.sprint_card_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_card_comments_select" ON public.sprint_card_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sprint_cards c WHERE c.id = sprint_card_comments.card_id AND c.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true)));
CREATE POLICY "sprint_card_comments_insert" ON public.sprint_card_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "sprint_card_comments_update" ON public.sprint_card_comments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "sprint_card_comments_delete" ON public.sprint_card_comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 10. MENÇÕES RÁPIDAS (@)
CREATE TABLE IF NOT EXISTS public.sprint_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES public.sprint_boards(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.sprint_cards(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES public.sprint_checklist_items(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.sprint_card_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprint_mentions_user ON public.sprint_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_sprint_mentions_card ON public.sprint_mentions(card_id);

ALTER TABLE public.sprint_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_mentions_all" ON public.sprint_mentions FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true));

-- 11. REGISTRO DE ATIVIDADES DO QUADRO / CARTÃO (HISTÓRICO)
CREATE TABLE IF NOT EXISTS public.sprint_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.sprint_boards(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.sprint_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sprint_activities_board ON public.sprint_activities(board_id);
CREATE INDEX IF NOT EXISTS idx_sprint_activities_card ON public.sprint_activities(card_id);

ALTER TABLE public.sprint_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprint_activities_select" ON public.sprint_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sprint_boards b WHERE b.id = sprint_activities.board_id AND b.company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true)));
CREATE POLICY "sprint_activities_insert" ON public.sprint_activities FOR INSERT TO authenticated
  WITH CHECK (true);
