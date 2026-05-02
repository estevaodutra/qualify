-- Create table for tracking sent polls (to match responses with actions)
CREATE TABLE public.poll_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message_id TEXT NOT NULL,
  zaap_id TEXT,
  node_id UUID NOT NULL,
  sequence_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  group_jid TEXT NOT NULL,
  instance_id UUID NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  option_actions JSONB NOT NULL DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Create unique index on message_id
CREATE UNIQUE INDEX idx_poll_messages_message_id ON poll_messages(message_id);
CREATE INDEX idx_poll_messages_zaap_id ON poll_messages(zaap_id);
CREATE INDEX idx_poll_messages_campaign ON poll_messages(campaign_id);
CREATE INDEX idx_poll_messages_sequence ON poll_messages(sequence_id);

-- Enable RLS
ALTER TABLE poll_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for poll_messages
CREATE POLICY "Users can view own poll_messages" ON poll_messages
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own poll_messages" ON poll_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own poll_messages" ON poll_messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own poll_messages" ON poll_messages
  FOR DELETE USING (user_id = auth.uid());

-- Create table for poll responses and action execution tracking
CREATE TABLE public.poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  poll_message_id UUID NOT NULL REFERENCES poll_messages(id) ON DELETE CASCADE,
  respondent_phone TEXT NOT NULL,
  respondent_name TEXT,
  respondent_jid TEXT,
  option_index INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  action_type TEXT,
  action_executed BOOLEAN DEFAULT false,
  action_result JSONB DEFAULT '{}',
  responded_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ
);

-- Unique constraint for deduplication (one vote per phone per option per poll)
CREATE UNIQUE INDEX idx_poll_responses_unique ON poll_responses(poll_message_id, respondent_phone, option_index);
CREATE INDEX idx_poll_responses_poll ON poll_responses(poll_message_id);
CREATE INDEX idx_poll_responses_phone ON poll_responses(respondent_phone);

-- Enable RLS
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for poll_responses
CREATE POLICY "Users can view own poll_responses" ON poll_responses
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own poll_responses" ON poll_responses
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own poll_responses" ON poll_responses
  FOR UPDATE USING (user_id = auth.uid());

-- Add tags column to group_members for tagging functionality
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];
CREATE INDEX IF NOT EXISTS idx_group_members_tags ON group_members USING GIN(tags);