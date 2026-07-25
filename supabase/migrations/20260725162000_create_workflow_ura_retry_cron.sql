-- Migration: 20260725162000_create_workflow_ura_retry_cron.sql
-- Description: Create cron job to trigger URA retry dispatcher every minute

SELECT cron.schedule(
  'workflow-ura-retry',
  '* * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://qualify.6ksfuf.easypanel.host/functions/v1/workflow-ura-dispatch',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := '{}'::jsonb
    );
  $$
);
