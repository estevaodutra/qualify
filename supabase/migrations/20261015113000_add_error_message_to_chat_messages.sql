-- Add error_message column to chat_messages for displaying failure details in chat
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
