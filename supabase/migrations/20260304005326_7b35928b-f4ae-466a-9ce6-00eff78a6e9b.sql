
-- Add company_id and priority tracking columns to queue_execution_state
ALTER TABLE queue_execution_state
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS priority_counter integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_priority_campaign_id uuid,
  ADD COLUMN IF NOT EXISTS last_normal_campaign_id uuid;

-- Index for company-level lookups
CREATE INDEX IF NOT EXISTS idx_queue_exec_state_company_id ON queue_execution_state(company_id) WHERE company_id IS NOT NULL;

-- Index for priority campaign lookups in call_queue
CREATE INDEX IF NOT EXISTS idx_call_queue_company_waiting ON call_queue(company_id, status) WHERE status = 'waiting';

-- queue_get_next_v2: Company-level queue selection with 3:1 priority ratio
CREATE OR REPLACE FUNCTION public.queue_get_next_v2(p_company_id uuid)
RETURNS TABLE(
  queue_id uuid,
  out_campaign_id uuid,
  out_lead_id uuid,
  out_phone varchar,
  out_lead_name varchar,
  out_attempt_number int,
  out_max_attempts int,
  out_observations text,
  out_campaign_name text,
  out_is_priority boolean,
  out_source_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_priority_counter int;
  v_last_priority_cid uuid;
  v_last_normal_cid uuid;
  v_should_process_priority boolean;
  v_target_campaign_id uuid;
  v_has_priority_campaigns boolean;
  v_has_normal_campaigns boolean;
  v_row_count int;
BEGIN

  -- Get or create global state for this company
  SELECT qs.priority_counter, qs.last_priority_campaign_id, qs.last_normal_campaign_id
  INTO v_priority_counter, v_last_priority_cid, v_last_normal_cid
  FROM queue_execution_state qs
  WHERE qs.company_id = p_company_id AND qs.campaign_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO queue_execution_state (user_id, company_id, campaign_id, status, priority_counter)
    VALUES ((SELECT owner_id FROM companies WHERE id = p_company_id), p_company_id, NULL, 'running', 0)
    ON CONFLICT DO NOTHING;
    v_priority_counter := 0;
    v_last_priority_cid := NULL;
    v_last_normal_cid := NULL;
  END IF;

  -- STEP 1: Check for scheduled items (always first)
  RETURN QUERY
  WITH scheduled_item AS (
    SELECT cq.id FROM call_queue cq
    JOIN call_campaigns cc ON cc.id = cq.campaign_id
    WHERE cq.company_id = p_company_id
      AND cq.status = 'waiting'
      AND cq.scheduled_for IS NOT NULL
      AND cq.scheduled_for <= NOW()
    ORDER BY cc.is_priority DESC, cq.scheduled_for ASC, cq.created_at ASC
    LIMIT 1
    FOR UPDATE OF cq SKIP LOCKED
  )
  UPDATE call_queue q SET status = 'processing'
  FROM scheduled_item s WHERE q.id = s.id
  RETURNING q.id, q.campaign_id, q.lead_id, q.phone::varchar, q.lead_name::varchar,
    q.attempt_number, q.max_attempts, q.observations,
    (SELECT name FROM call_campaigns WHERE id = q.campaign_id)::text,
    COALESCE((SELECT cc.is_priority FROM call_campaigns cc WHERE cc.id = q.campaign_id), false),
    'scheduled'::text;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count > 0 THEN
    RETURN;
  END IF;

  -- STEP 2: Check which campaign levels have items
  SELECT EXISTS (
    SELECT 1 FROM call_queue cq
    JOIN call_campaigns cc ON cc.id = cq.campaign_id
    WHERE cq.company_id = p_company_id AND cq.status = 'waiting'
      AND (cq.scheduled_for IS NULL OR cq.scheduled_for <= NOW())
      AND cc.is_priority = true
  ) INTO v_has_priority_campaigns;

  SELECT EXISTS (
    SELECT 1 FROM call_queue cq
    JOIN call_campaigns cc ON cc.id = cq.campaign_id
    WHERE cq.company_id = p_company_id AND cq.status = 'waiting'
      AND (cq.scheduled_for IS NULL OR cq.scheduled_for <= NOW())
      AND COALESCE(cc.is_priority, false) = false
  ) INTO v_has_normal_campaigns;

  -- STEP 3: Decide priority vs normal (3:1 ratio)
  IF v_priority_counter < 3 AND v_has_priority_campaigns THEN
    v_should_process_priority := true;
  ELSIF v_has_normal_campaigns THEN
    v_should_process_priority := false;
  ELSIF v_has_priority_campaigns THEN
    v_should_process_priority := true;
  ELSE
    RETURN;
  END IF;

  -- STEP 4: Select campaign (round-robin within level)
  IF v_should_process_priority THEN
    SELECT cq.campaign_id INTO v_target_campaign_id
    FROM call_queue cq
    JOIN call_campaigns cc ON cc.id = cq.campaign_id
    WHERE cq.company_id = p_company_id AND cq.status = 'waiting'
      AND (cq.scheduled_for IS NULL OR cq.scheduled_for <= NOW())
      AND cc.is_priority = true
      AND (v_last_priority_cid IS NULL OR cq.campaign_id != v_last_priority_cid)
    ORDER BY cq.created_at ASC
    LIMIT 1;

    IF v_target_campaign_id IS NULL THEN
      SELECT cq.campaign_id INTO v_target_campaign_id
      FROM call_queue cq
      JOIN call_campaigns cc ON cc.id = cq.campaign_id
      WHERE cq.company_id = p_company_id AND cq.status = 'waiting'
        AND (cq.scheduled_for IS NULL OR cq.scheduled_for <= NOW())
        AND cc.is_priority = true
      ORDER BY cq.created_at ASC
      LIMIT 1;
    END IF;
  ELSE
    SELECT cq.campaign_id INTO v_target_campaign_id
    FROM call_queue cq
    JOIN call_campaigns cc ON cc.id = cq.campaign_id
    WHERE cq.company_id = p_company_id AND cq.status = 'waiting'
      AND (cq.scheduled_for IS NULL OR cq.scheduled_for <= NOW())
      AND COALESCE(cc.is_priority, false) = false
      AND (v_last_normal_cid IS NULL OR cq.campaign_id != v_last_normal_cid)
    ORDER BY cq.created_at ASC
    LIMIT 1;

    IF v_target_campaign_id IS NULL THEN
      SELECT cq.campaign_id INTO v_target_campaign_id
      FROM call_queue cq
      JOIN call_campaigns cc ON cc.id = cq.campaign_id
      WHERE cq.company_id = p_company_id AND cq.status = 'waiting'
        AND (cq.scheduled_for IS NULL OR cq.scheduled_for <= NOW())
        AND COALESCE(cc.is_priority, false) = false
      ORDER BY cq.created_at ASC
      LIMIT 1;
    END IF;
  END IF;

  IF v_target_campaign_id IS NULL THEN
    RETURN;
  END IF;

  -- STEP 5: Select next item from chosen campaign
  RETURN QUERY
  WITH next_item AS (
    SELECT cq.id FROM call_queue cq
    WHERE cq.company_id = p_company_id
      AND cq.status = 'waiting'
      AND cq.campaign_id = v_target_campaign_id
      AND (cq.scheduled_for IS NULL OR cq.scheduled_for <= NOW())
    ORDER BY cq.is_priority DESC, cq.position ASC, cq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE call_queue q SET status = 'processing'
  FROM next_item n WHERE q.id = n.id
  RETURNING q.id, q.campaign_id, q.lead_id, q.phone::varchar, q.lead_name::varchar,
    q.attempt_number, q.max_attempts, q.observations,
    (SELECT name FROM call_campaigns WHERE id = q.campaign_id)::text,
    COALESCE((SELECT cc2.is_priority FROM call_campaigns cc2 WHERE cc2.id = q.campaign_id), false),
    'queue'::text;

  -- STEP 6: Update counters
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count > 0 THEN
    IF v_should_process_priority THEN
      UPDATE queue_execution_state
      SET priority_counter = priority_counter + 1,
          last_priority_campaign_id = v_target_campaign_id,
          updated_at = NOW()
      WHERE company_id = p_company_id AND campaign_id IS NULL;
    ELSE
      UPDATE queue_execution_state
      SET priority_counter = 0,
          last_normal_campaign_id = v_target_campaign_id,
          updated_at = NOW()
      WHERE company_id = p_company_id AND campaign_id IS NULL;
    END IF;
  END IF;
END;
$$;
