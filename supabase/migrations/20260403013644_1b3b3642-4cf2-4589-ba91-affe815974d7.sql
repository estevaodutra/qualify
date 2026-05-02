
-- Table: group_execution_lists
CREATE TABLE public.group_execution_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  window_type text NOT NULL DEFAULT 'fixed',
  window_start_time time,
  window_end_time time,
  window_duration_hours int,
  monitored_events text[] NOT NULL DEFAULT '{}',
  action_type text NOT NULL DEFAULT 'webhook',
  webhook_url text,
  message_template text,
  call_campaign_id uuid,
  current_cycle_id uuid DEFAULT gen_random_uuid(),
  current_window_start timestamptz,
  current_window_end timestamptz,
  last_executed_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_gel_campaign ON public.group_execution_lists(campaign_id);
CREATE INDEX idx_gel_window_end ON public.group_execution_lists(current_window_end, is_active);

ALTER TABLE public.group_execution_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own group_execution_lists"
  ON public.group_execution_lists FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access on group_execution_lists"
  ON public.group_execution_lists FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Table: group_execution_leads
CREATE TABLE public.group_execution_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  list_id uuid NOT NULL REFERENCES public.group_execution_lists(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL,
  phone text NOT NULL,
  name text,
  origin_event text,
  origin_detail text,
  status text NOT NULL DEFAULT 'pending',
  executed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(list_id, phone, cycle_id)
);

CREATE INDEX idx_gel_leads_cycle ON public.group_execution_leads(list_id, cycle_id, status);

ALTER TABLE public.group_execution_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own group_execution_leads"
  ON public.group_execution_leads FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role full access on group_execution_leads"
  ON public.group_execution_leads FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
