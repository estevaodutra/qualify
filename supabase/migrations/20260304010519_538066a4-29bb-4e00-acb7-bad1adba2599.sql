
-- Preview function: returns counts and breakdown by campaign for removal filters
CREATE OR REPLACE FUNCTION public.queue_remove_preview(
  p_company_id uuid,
  p_campaign_ids uuid[] DEFAULT NULL,
  p_attempt_filter text DEFAULT NULL
)
RETURNS TABLE(total_count bigint, priority_count bigint, normal_count bigint, scheduled_count bigint, by_campaign jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint;
  v_priority bigint;
  v_normal bigint;
  v_scheduled bigint;
  v_by_campaign jsonb;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE COALESCE(cc.is_priority, false) = true),
    COUNT(*) FILTER (WHERE COALESCE(cc.is_priority, false) = false),
    COUNT(*) FILTER (WHERE cq.scheduled_for IS NOT NULL)
  INTO v_total, v_priority, v_normal, v_scheduled
  FROM call_queue cq
  JOIN call_campaigns cc ON cc.id = cq.campaign_id
  WHERE cq.company_id = p_company_id
    AND cq.status = 'waiting'
    AND (p_campaign_ids IS NULL OR cq.campaign_id = ANY(p_campaign_ids))
    AND (p_attempt_filter IS NULL
      OR (p_attempt_filter = 'first' AND COALESCE(cq.attempt_number, 1) = 1)
      OR (p_attempt_filter = 'retry' AND COALESCE(cq.attempt_number, 1) > 1)
      OR (p_attempt_filter = 'last' AND COALESCE(cq.attempt_number, 1) = COALESCE(cq.max_attempts, 3)));

  SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb)
  INTO v_by_campaign
  FROM (
    SELECT cc.id as campaign_id, cc.name as campaign_name, COALESCE(cc.is_priority, false) as is_priority, COUNT(*) as count
    FROM call_queue cq
    JOIN call_campaigns cc ON cc.id = cq.campaign_id
    WHERE cq.company_id = p_company_id
      AND cq.status = 'waiting'
      AND (p_campaign_ids IS NULL OR cq.campaign_id = ANY(p_campaign_ids))
      AND (p_attempt_filter IS NULL
        OR (p_attempt_filter = 'first' AND COALESCE(cq.attempt_number, 1) = 1)
        OR (p_attempt_filter = 'retry' AND COALESCE(cq.attempt_number, 1) > 1)
        OR (p_attempt_filter = 'last' AND COALESCE(cq.attempt_number, 1) = COALESCE(cq.max_attempts, 3)))
    GROUP BY cc.id, cc.name, cc.is_priority
    ORDER BY cc.is_priority DESC, cc.name
  ) sub;

  RETURN QUERY SELECT v_total, v_priority, v_normal, v_scheduled, v_by_campaign;
END;
$$;

-- Bulk remove function
CREATE OR REPLACE FUNCTION public.queue_remove_bulk(
  p_company_id uuid,
  p_campaign_ids uuid[] DEFAULT NULL,
  p_attempt_filter text DEFAULT NULL
)
RETURNS TABLE(removed_count bigint, removed_priority bigint, removed_normal bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ids uuid[];
  v_removed bigint;
  v_priority bigint;
  v_normal bigint;
BEGIN
  SELECT ARRAY_AGG(cq.id)
  INTO v_ids
  FROM call_queue cq
  JOIN call_campaigns cc ON cc.id = cq.campaign_id
  WHERE cq.company_id = p_company_id
    AND cq.status = 'waiting'
    AND (p_campaign_ids IS NULL OR cq.campaign_id = ANY(p_campaign_ids))
    AND (p_attempt_filter IS NULL
      OR (p_attempt_filter = 'first' AND COALESCE(cq.attempt_number, 1) = 1)
      OR (p_attempt_filter = 'retry' AND COALESCE(cq.attempt_number, 1) > 1)
      OR (p_attempt_filter = 'last' AND COALESCE(cq.attempt_number, 1) = COALESCE(cq.max_attempts, 3)));

  IF v_ids IS NULL OR array_length(v_ids, 1) IS NULL THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE COALESCE(cc.is_priority, false) = true),
    COUNT(*) FILTER (WHERE COALESCE(cc.is_priority, false) = false)
  INTO v_removed, v_priority, v_normal
  FROM call_queue cq
  JOIN call_campaigns cc ON cc.id = cq.campaign_id
  WHERE cq.id = ANY(v_ids);

  DELETE FROM call_queue WHERE id = ANY(v_ids);

  RETURN QUERY SELECT v_removed, v_priority, v_normal;
END;
$$;

-- Clear all preview: breakdown for the "clear all" modal
CREATE OR REPLACE FUNCTION public.queue_clear_all_preview(p_company_id uuid)
RETURNS TABLE(total_count bigint, priority_count bigint, normal_count bigint, scheduled_count bigint, by_campaign jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY SELECT * FROM queue_remove_preview(p_company_id, NULL, NULL);
END;
$$;
