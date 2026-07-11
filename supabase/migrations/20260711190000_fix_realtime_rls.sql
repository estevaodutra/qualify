-- Drop existing policies
DROP POLICY IF EXISTS "Company members can manage conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Company members can manage chat messages" ON public.chat_messages;

-- Create new policies using direct SELECT instead of functions/joins that break Realtime
CREATE POLICY "Company members can manage conversations" ON public.chat_conversations
  FOR ALL TO authenticated USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    )
  ) WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Company members can manage chat messages" ON public.chat_messages
  FOR ALL TO authenticated USING (
    conversation_id IN (
      SELECT id FROM public.chat_conversations WHERE company_id IN (
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  ) WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.chat_conversations WHERE company_id IN (
        SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
