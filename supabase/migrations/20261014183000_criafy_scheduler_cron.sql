-- ========================================================
-- CRON: CRIAFY SCHEDULER WORKER (FASE 7)
-- Executa a cada minuto para publicar agendamentos pendentes server-side
-- ========================================================

DO $$
BEGIN
  -- Desagenda se já existir para idempotência
  PERFORM cron.unschedule('criafy-scheduler-worker')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'criafy-scheduler-worker'
  );

  -- Agenda execução a cada 1 minuto
  PERFORM cron.schedule(
    'criafy-scheduler-worker',
    '* * * * *',
    $cron$
      SELECT net.http_post(
        url := 'https://qualify.6ksfuf.easypanel.host/functions/v1/criafy-scheduler-worker',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := '{}'::jsonb
      );
    $cron$
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Ignora se extensão pg_cron ou pg_net não estiver disponível no ambiente local
    RAISE NOTICE 'pg_cron ou pg_net não configurado neste ambiente: %', SQLERRM;
END $$;
