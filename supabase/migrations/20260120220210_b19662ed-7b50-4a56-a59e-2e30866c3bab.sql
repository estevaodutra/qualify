-- Create table to store groups linked to campaigns
CREATE TABLE public.campaign_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  user_id UUID NOT NULL,
  group_jid TEXT NOT NULL,
  group_name TEXT NOT NULL,
  instance_id UUID,
  added_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(campaign_id, group_jid)
);

-- Enable RLS
ALTER TABLE public.campaign_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own campaign_groups" 
  ON public.campaign_groups 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own campaign_groups" 
  ON public.campaign_groups 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own campaign_groups" 
  ON public.campaign_groups 
  FOR DELETE 
  USING (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_campaign_groups_campaign_id ON public.campaign_groups(campaign_id);