
-- Função de limpeza diária da fila
CREATE OR REPLACE FUNCTION public.clear_daily_queue()
RETURNS TABLE(companies_processed int, total_expired int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_companies int := 0;
  v_total int := 0;
  v_company_id uuid;
  v_count int;
BEGIN
  FOR v_company_id IN
    SELECT DISTINCT company_id FROM call_queue WHERE status = 'waiting'
  LOOP
    WITH expired AS (
      UPDATE call_queue SET status = 'expired'
      WHERE company_id = v_company_id AND status = 'waiting'
      RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM expired;

    v_total := v_total + v_count;

    -- Stop all queues and reset priority counters
    UPDATE queue_execution_state
    SET status = 'stopped', priority_counter = 0, updated_at = NOW()
    WHERE company_id = v_company_id;

    v_companies := v_companies + 1;
  END LOOP;

  RETURN QUERY SELECT v_companies, v_total;
END;
$$;
