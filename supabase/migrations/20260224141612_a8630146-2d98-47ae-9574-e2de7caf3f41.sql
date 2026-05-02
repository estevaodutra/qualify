CREATE OR REPLACE FUNCTION public.heal_stuck_operators(p_stuck_threshold_minutes integer DEFAULT 10)
 RETURNS TABLE(healed_operator_id uuid, healed_operator_name text, previous_status text, action_taken text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH stuck AS (
    UPDATE call_operators op
    SET
      status = 'available',
      current_call_id = NULL,
      current_campaign_id = NULL,
      updated_at = NOW()
    WHERE op.is_active = true
      AND op.status = 'on_call'
      AND (
        -- Case 1: current_call_id is NULL (inconsistent)
        op.current_call_id IS NULL
        OR
        -- Case 2: call already terminated
        EXISTS (
          SELECT 1 FROM call_logs cl
          WHERE cl.id = op.current_call_id
            AND cl.call_status IN ('completed', 'failed', 'busy', 'not_found',
                              'voicemail', 'cancelled', 'timeout', 'no_answer')
        )
        OR
        -- Case 3: call doesn't exist
        NOT EXISTS (
          SELECT 1 FROM call_logs cl
          WHERE cl.id = op.current_call_id
        )
        OR
        -- Case 4: stuck too long
        op.updated_at < NOW() - (p_stuck_threshold_minutes || ' minutes')::INTERVAL
        OR
        -- Case 5: call in non-active state (never actually started)
        EXISTS (
          SELECT 1 FROM call_logs cl
          WHERE cl.id = op.current_call_id
            AND cl.call_status IN ('waiting_operator', 'ready', 'scheduled')
        )
      )
    RETURNING op.id, op.operator_name, op.status
  )
  SELECT
    stuck.id,
    stuck.operator_name,
    stuck.status,
    'released_to_available'::TEXT
  FROM stuck;
END;
$function$;