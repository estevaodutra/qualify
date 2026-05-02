-- Add sequence_id column to link messages to sequences
ALTER TABLE public.group_messages 
ADD COLUMN sequence_id UUID REFERENCES public.message_sequences(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_group_messages_sequence ON public.group_messages(sequence_id);