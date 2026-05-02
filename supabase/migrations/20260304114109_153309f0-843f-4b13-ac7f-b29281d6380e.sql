
CREATE OR REPLACE FUNCTION public.queue_remove_preview(p_company_id uuid, p_campaign_ids uuid[] DEFAULT NULL::uuid[], p_attempt_filter text DEFAULT NULL::text)
 RETURNS TABLE(total_count bigint, priority_count bigint, normal_count bigint, scheduled_count bigint, by_campaign jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total bigint;
  v_priority bigint;
  v_normal bigint;
  v_scheduled bigint;
  v_by_campaign jsonb;
BEGIN
  -- Count from both call_queue AND call_logs (scheduled/ready)
  WITH combined AS (
    -- Items from call_queue
    SELECT cq.campaign_id, cq.attempt_number, cq.max_attempts, cq.scheduled_for,
           COALESCE(cc.is_priority, false) as is_priority
    FROM call_queue cq
    JOIN call_campaigns cc ON cc.id = cq.campaign_id
    WHERE cq.company_id = p_company_id
      AND cq.status = 'waiting'
      AND (p_campaign_ids IS NULL OR cq.campaign_id = ANY(p_campaign_ids))
      AND (p_attempt_filter IS NULL
        OR (p_attempt_filter = 'first' AND COALESCE(cq.attempt_number, 1) = 1)
        OR (p_attempt_filter = 'retry' AND COALESCE(cq.attempt_number, 1) > 1)
        OR (p_attempt_filter = 'last' AND COALESCE(cq.attempt_number, 1) = COALESCE(cq.max_attempts, 3)))
    UNION ALL
    -- Items from call_logs (fallback queue)
    SELECT cl.campaign_id, cl.attempt_number, cl.max_attempts, cl.scheduled_for,
           COALESCE(cc.is_priority, false) as is_priority
    FROM call_logs cl
    JOIN call_campaigns cc ON cc.id = cl.campaign_id
    WHERE cl.company_id = p_company_id
      AND cl.call_status IN ('scheduled', 'ready')
      AND (p_campaign_ids IS NULL OR cl.campaign_id = ANY(p_campaign_ids))
      AND (p_attempt_filter IS NULL
        OR (p_attempt_filter = 'first' AND COALESCE(cl.attempt_number, 1) = 1)
        OR (p_attempt_filter = 'retry' AND COALESCE(cl.attempt_number, 1) > 1)
        OR (p_attempt_filter = 'last' AND COALESCE(cl.attempt_number, 1) = COALESCE(cl.max_attempts, 3)))
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_priority = true),
    COUNT(*) FILTER (WHERE is_priority = false),
    COUNT(*) FILTER (WHERE scheduled_for IS NOT NULL)
  INTO v_total, v_priority, v_normal, v_scheduled
  FROM combined;

  -- Breakdown by campaign from both sources
  WITH combined AS (
    SELECT cq.campaign_id, cq.attempt_number, cq.max_attempts
    FROM call_queue cq
    WHERE cq.company_id = p_company_id
      AND cq.status = 'waiting'
      AND (p_campaign_ids IS NULL OR cq.campaign_id = ANY(p_campaign_ids))
      AND (p_attempt_filter IS NULL
        OR (p_attempt_filter = 'first' AND COALESCE(cq.attempt_number, 1) = 1)
        OR (p_attempt_filter = 'retry' AND COALESCE(cq.attempt_number, 1) > 1)
        OR (p_attempt_filter = 'last' AND COALESCE(cq.attempt_number, 1) = COALESCE(cq.max_attempts, 3)))
    UNION ALL
    SELECT cl.campaign_id, cl.attempt_number, cl.max_attempts
    FROM call_logs cl
    WHERE cl.company_id = p_company_id
      AND cl.call_status IN ('scheduled', 'ready')
      AND (p_campaign_ids IS NULL OR cl.campaign_id = ANY(p_campaign_ids))
      AND (p_attempt_filter IS NULL
        OR (p_attempt_filter = 'first' AND COALESCE(cl.attempt_number, 1) = 1)
        OR (p_attempt_filter = 'retry' AND COALESCE(cl.attempt_number, 1) > 1)
        OR (p_attempt_filter = 'last' AND COALESCE(cl.attempt_number, 1) = COALESCE(cl.max_attempts, 3)))
  )
  SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb)
  INTO v_by_campaign
  FROM (
    SELECT cc.id as campaign_id, cc.name as campaign_name, COALESCE(cc.is_priority, false) as is_priority, COUNT(*) as count
    FROM combined c
    JOIN call_campaigns cc ON cc.id = c.campaign_id
    GROUP BY cc.id, cc.name, cc.is_priority
    ORDER BY cc.is_priority DESC, cc.name
  ) sub;

  RETURN QUERY SELECT v_total, v_priority, v_normal, v_scheduled, v_by_campaign;
END;
$function$;

CREATE OR REPLACE FUNCTION public.queue_remove_bulk(p_company_id uuid, p_campaign_ids uuid[] DEFAULT NULL::uuid[], p_attempt_filter text DEFAULT NULL::text)
 RETURNS TABLE(removed_count bigint, removed_priority bigint, removed_normal bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_queue_ids uuid[];
  v_log_ids uuid[];
  v_removed bigint := 0;
  v_priority bigint := 0;
  v_normal bigint := 0;
  v_q_removed bigint := 0;
  v_q_priority bigint := 0;
  v_q_normal bigint := 0;
  v_l_removed bigint := 0;
  v_l_priority bigint := 0;
  v_l_normal bigint := 0;
BEGIN
  -- Collect call_queue IDs
  SELECT ARRAY_AGG(cq.id)
  INTO v_queue_ids
  FROM call_queue cq
  JOIN call_campaigns cc ON cc.id = cq.campaign_id
  WHERE cq.company_id = p_company_id
    AND cq.status = 'waiting'
    AND (p_campaign_ids IS NULL OR cq.campaign_id = ANY(p_campaign_ids))
    AND (p_attempt_filter IS NULL
      OR (p_attempt_filter = 'first' AND COALESCE(cq.attempt_number, 1) = 1)
      OR (p_attempt_filter = 'retry' AND COALESCE(cq.attempt_number, 1) > 1)
      OR (p_attempt_filter = 'last' AND COALESCE(cq.attempt_number, 1) = COALESCE(cq.max_attempts, 3)));

  -- Collect call_logs IDs (scheduled/ready)
  SELECT ARRAY_AGG(cl.id)
  INTO v_log_ids
  FROM call_logs cl
  JOIN call_campaigns cc ON cc.id = cl.campaign_id
  WHERE cl.company_id = p_company_id
    AND cl.call_status IN ('scheduled', 'ready')
    AND (p_campaign_ids IS NULL OR cl.campaign_id = ANY(p_campaign_ids))
    AND (p_attempt_filter IS NULL
      OR (p_attempt_filter = 'first' AND COALESCE(cl.attempt_number, 1) = 1)
      OR (p_attempt_filter = 'retry' AND COALESCE(cl.attempt_number, 1) > 1)
      OR (p_attempt_filter = 'last' AND COALESCE(cl.attempt_number, 1) = COALESCE(cl.max_attempts, 3)));

  -- Process call_queue removals (delete)
  IF v_queue_ids IS NOT NULL AND array_length(v_queue_ids, 1) > 0 THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE COALESCE(cc.is_priority, false) = true),
      COUNT(*) FILTER (WHERE COALESCE(cc.is_priority, false) = false)
    INTO v_q_removed, v_q_priority, v_q_normal
    FROM call_queue cq
    JOIN call_campaigns cc ON cc.id = cq.campaign_id
    WHERE cq.id = ANY(v_queue_ids);

    DELETE FROM call_queue WHERE id = ANY(v_queue_ids);
  END IF;

  -- Process call_logs removals (update status to cancelled)
  IF v_log_ids IS NOT NULL AND array_length(v_log_ids, 1) > 0 THEN
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE COALESCE(cc.is_priority, false) = true),
      COUNT(*) FILTER (WHERE COALESCE(cc.is_priority, false) = false)
    INTO v_l_removed, v_l_priority, v_l_normal
    FROM call_logs cl
    JOIN call_campaigns cc ON cc.id = cl.campaign_id
    WHERE cl.id = ANY(v_log_ids);

    UPDATE call_logs SET call_status = 'cancelled', ended_at = now() WHERE id = ANY(v_log_ids);
  END IF;

  v_removed := v_q_removed + v_l_removed;
  v_priority := v_q_priority + v_l_priority;
  v_normal := v_q_normal + v_l_normal;

  IF v_removed = 0 THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_removed, v_priority, v_normal;
END;
$function$;
