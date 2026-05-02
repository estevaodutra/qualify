
CREATE TABLE public.member_export_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_campaign_id uuid NOT NULL,
  webhook_url text NOT NULL,
  status_filter text[] DEFAULT '{active}',
  schedule_type text NOT NULL DEFAULT 'once',
  schedule_time time DEFAULT '08:00',
  schedule_day_of_week int,
  next_run_at timestamptz,
  last_run_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.member_export_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own exports" ON public.member_export_schedules
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
