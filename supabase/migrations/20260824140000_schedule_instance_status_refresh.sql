-- Migration: 20260824140000_schedule_instance_status_refresh.sql
-- Description: Schedule automatic active instance status refresh every 5 minutes via pg_cron

-- 1. Unschedule previous refresh-instance-status job if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-instance-status') THEN
    PERFORM cron.unschedule('refresh-instance-status');
  END IF;
END $$;

-- 2. Schedule pg_cron job to invoke refresh-instance-status every 5 minutes
SELECT cron.schedule(
  'refresh-instance-status',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://qualify-supabase.d2x.site/functions/v1/refresh-instance-status',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := '{}'::jsonb
    );
  $$
);
