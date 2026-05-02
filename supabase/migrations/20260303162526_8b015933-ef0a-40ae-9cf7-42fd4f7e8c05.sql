
CREATE OR REPLACE FUNCTION public.heal_stuck_operators(p_stuck_threshold_minutes integer DEFAULT 10)
 RETURNS TABLE(healed_operator_id uuid, healed_operator_name text, previous_status text, action_taken text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  -- Case A: on_call operators with invalid/terminated calls
  WITH stuck_on_call AS (
    UPDATE call_operators op
    SET
      status = 'available',
      current_call_id = NULL,
      current_campaign_id = NULL,
      updated_at = NOW()
    WHERE op.is_active = true
      AND op.status = 'on_call'
      AND (
        op.current_call_id IS NULL
        OR EXISTS (
          SELECT 1 FROM call_logs cl
          WHERE cl.id = op.current_call_id
            AND cl.call_status IN ('completed', 'failed', 'busy', 'not_found',
                              'voicemail', 'cancelled', 'timeout', 'no_answer')
        )
        OR NOT EXISTS (
          SELECT 1 FROM call_logs cl
          WHERE cl.id = op.current_call_id
        )
        OR EXISTS (
          SELECT 1 FROM call_logs cl
          WHERE cl.id = op.current_call_id
            AND cl.call_status IN ('waiting_operator', 'ready', 'scheduled')
        )
      )
    RETURNING op.id, op.operator_name, op.status
  ),
  -- Case B: non-on_call operators with stale current_call_id (only if call is terminal)
  stuck_ghost AS (
    UPDATE call_operators op
    SET
      current_call_id = NULL,
      current_campaign_id = NULL,
      updated_at = NOW()
    WHERE op.is_active = true
      AND op.status != 'on_call'
      AND op.current_call_id IS NOT NULL
      -- Only clear if the associated call is NOT active
      AND NOT EXISTS (
        SELECT 1 FROM call_logs cl
        WHERE cl.id = op.current_call_id
          AND cl.call_status IN ('dialing','ringing','answered','in_progress')
      )
      -- Exclude those already fixed by stuck_on_call
      AND NOT EXISTS (SELECT 1 FROM stuck_on_call s WHERE s.id = op.id)
    RETURNING op.id, op.operator_name, op.status
  ),
  -- Case C: operators with active call but wrong status -> restore to on_call
  stuck_wrong_status AS (
    UPDATE call_operators op
    SET
      status = 'on_call',
      updated_at = NOW()
    WHERE op.is_active = true
      AND op.status != 'on_call'
      AND op.current_call_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM call_logs cl
        WHERE cl.id = op.current_call_id
          AND cl.call_status IN ('dialing','ringing','answered','in_progress')
      )
      -- Exclude those already handled
      AND NOT EXISTS (SELECT 1 FROM stuck_on_call s WHERE s.id = op.id)
      AND NOT EXISTS (SELECT 1 FROM stuck_ghost g WHERE g.id = op.id)
    RETURNING op.id, op.operator_name, op.status
  )
  SELECT s.id, s.operator_name, s.status, 'released_to_available'::TEXT FROM stuck_on_call s
  UNION ALL
  SELECT g.id, g.operator_name, g.status, 'cleared_stale_call_id'::TEXT FROM stuck_ghost g
  UNION ALL
  SELECT w.id, w.operator_name, w.status, 'restored_to_on_call'::TEXT FROM stuck_wrong_status w;
END;
$function$;
