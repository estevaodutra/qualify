CREATE TABLE IF NOT EXISTS public.chat_notification_preferences (
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_muted boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS chat_notification_preferences_muted
  ON public.chat_notification_preferences (company_id, conversation_id, user_id)
  WHERE is_muted = true;

ALTER TABLE public.chat_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own chat notification preferences" ON public.chat_notification_preferences;
CREATE POLICY "Users can read own chat notification preferences"
  ON public.chat_notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own chat notification preferences" ON public.chat_notification_preferences;
CREATE POLICY "Users can insert own chat notification preferences"
  ON public.chat_notification_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = conversation_id AND c.company_id = chat_notification_preferences.company_id
      AND cm.user_id = auth.uid() AND cm.is_active = true
  ));

DROP POLICY IF EXISTS "Users can update own chat notification preferences" ON public.chat_notification_preferences;
CREATE POLICY "Users can update own chat notification preferences"
  ON public.chat_notification_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.chat_conversations c
    JOIN public.company_members cm ON cm.company_id = c.company_id
    WHERE c.id = conversation_id AND c.company_id = chat_notification_preferences.company_id
      AND cm.user_id = auth.uid() AND cm.is_active = true
  ));

NOTIFY pgrst, 'reload schema';
