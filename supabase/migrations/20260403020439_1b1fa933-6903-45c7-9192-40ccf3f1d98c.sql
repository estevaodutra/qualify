ALTER TABLE public.group_execution_lists
  ADD COLUMN execution_schedule_type text NOT NULL DEFAULT 'window_end',
  ADD COLUMN execution_scheduled_time text,
  ADD COLUMN execution_days_of_week integer[];