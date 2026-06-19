-- Cria job pg_cron que invoca process-scheduled-messages a cada minuto.
-- A função tem verify_jwt = false, portanto não requer Authorization header.
SELECT cron.schedule(
  'process-scheduled-messages',
  '* * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://qualify.6ksfuf.easypanel.host/functions/v1/process-scheduled-messages',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := '{}'::jsonb
    );
  $$
);
