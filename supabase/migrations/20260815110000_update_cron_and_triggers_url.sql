-- Migration: 20260815110000_update_cron_and_triggers_url.sql
-- Description: Update legacy pg_cron URLs and triggers to point to the production domain

-- 1. Unschedule legacy pg_cron jobs if they exist
SELECT cron.unschedule('process-scheduled-messages');
SELECT cron.unschedule('process-group-updates');
SELECT cron.unschedule('workflow-ura-retry');

-- 2. Reschedule pg_cron jobs with the production domain
SELECT cron.schedule(
  'process-scheduled-messages',
  '* * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://qualify-supabase.d2x.site/functions/v1/process-scheduled-messages',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := '{}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'process-group-updates',
  '* * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://qualify-supabase.d2x.site/functions/v1/process-group-updates',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := '{}'::jsonb
    );
  $$
);

SELECT cron.schedule(
  'workflow-ura-retry',
  '* * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://qualify-supabase.d2x.site/functions/v1/workflow-ura-dispatch',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := '{}'::jsonb
    );
  $$
);

-- 3. Update scheduling trigger function with correct URL
CREATE OR REPLACE FUNCTION public.handle_scheduling_appointment_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_should_fire BOOLEAN := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('confirmed','cancelled','rescheduled','completed','no_show') THEN
      v_should_fire := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('confirmed','cancelled','rescheduled','completed','no_show') THEN
      v_should_fire := true;
    END IF;
  END IF;

  IF v_should_fire THEN
    PERFORM net.http_post(
      url := 'https://qualify-supabase.d2x.site/functions/v1/scheduling-dispatch',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'appointment_id', NEW.id,
        'op', TG_OP,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;
