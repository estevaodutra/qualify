
-- 1. Fix resolve_cooldowns: clear current_call_id and current_campaign_id
CREATE OR REPLACE FUNCTION public.resolve_cooldowns()
 RETURNS TABLE(resolved_operator_id uuid, resolved_operator_name text, was_cooldown_seconds integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH resolved AS (
    UPDATE call_operators
    SET
      status = 'available',
      current_call_id = NULL,
      current_campaign_id = NULL,
      updated_at = NOW()
    WHERE status = 'cooldown'
      AND is_active = true
      AND last_call_ended_at IS NOT NULL
      AND EXTRACT(EPOCH FROM (NOW() - last_call_ended_at)) >=
          COALESCE(personal_interval_seconds, 30)
    RETURNING id, operator_name, COALESCE(personal_interval_seconds, 30) AS interval_used
  )
  SELECT
    id,
    operator_name,
    interval_used
  FROM resolved;
END;
$function$;

-- 2. Fix heal_stuck_operators: add case for non-on_call operators with stale current_call_id
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
  -- Case B: non-on_call operators with stale current_call_id (ghost state)
  stuck_ghost AS (
    UPDATE call_operators op
    SET
      current_call_id = NULL,
      current_campaign_id = NULL,
      updated_at = NOW()
    WHERE op.is_active = true
      AND op.status != 'on_call'
      AND op.current_call_id IS NOT NULL
      -- Exclude those already fixed by stuck_on_call
      AND NOT EXISTS (SELECT 1 FROM stuck_on_call s WHERE s.id = op.id)
    RETURNING op.id, op.operator_name, op.status
  )
  SELECT s.id, s.operator_name, s.status, 'released_to_available'::TEXT FROM stuck_on_call s
  UNION ALL
  SELECT g.id, g.operator_name, g.status, 'cleared_stale_call_id'::TEXT FROM stuck_ghost g;
END;
$function$;
