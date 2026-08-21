-- Migration: Add pin and archive capabilities to chat conversations

-- 1. Add archive columns to chat_conversations
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_archived 
  ON public.chat_conversations(company_id, is_archived);

-- 2. Create chat_conversation_pins table for per-operator pinning
CREATE TABLE IF NOT EXISTS public.chat_conversation_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chat_conv_pins_unique UNIQUE (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_conv_pins_user 
  ON public.chat_conversation_pins(company_id, user_id);

ALTER TABLE public.chat_conversation_pins ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy for chat_conversation_pins
DROP POLICY IF EXISTS "Users can manage their own conversation pins" ON public.chat_conversation_pins;
CREATE POLICY "Users can manage their own conversation pins" 
  ON public.chat_conversation_pins
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid() AND public.is_company_member(company_id, auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid() AND public.is_company_member(company_id, auth.uid())
  );

-- 4. Enable Realtime on chat_conversation_pins if publication exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversation_pins;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
