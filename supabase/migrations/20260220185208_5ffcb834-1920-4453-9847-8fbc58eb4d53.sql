
-- ============================================================
-- 1. Índice UNIQUE parcial em current_call_id
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_operator_unique_call
ON call_operators (current_call_id)
WHERE current_call_id IS NOT NULL;

-- ============================================================
-- 2. reserve_operator_for_call
-- ============================================================
CREATE OR REPLACE FUNCTION public.reserve_operator_for_call(
  p_call_id UUID,
  p_campaign_id UUID,
  p_preferred_operator_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  operator_id UUID,
  operator_name TEXT,
  operator_extension TEXT,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator RECORD;
BEGIN
  -- Check if call already has an operator
  IF EXISTS (
    SELECT 1 FROM call_operators
    WHERE current_call_id = p_call_id
  ) THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT,
      'call_already_has_operator'::TEXT;
    RETURN;
  END IF;

  -- Try preferred operator first
  IF p_preferred_operator_id IS NOT NULL THEN
    SELECT co.id, co.operator_name AS name, co.extension
    INTO v_operator
    FROM call_operators co
    WHERE co.id = p_preferred_operator_id
      AND co.is_active = true
      AND co.status = 'available'
      AND co.current_call_id IS NULL
    FOR UPDATE SKIP LOCKED;

    IF FOUND THEN
      UPDATE call_operators
      SET
        status = 'on_call',
        current_call_id = p_call_id,
        current_campaign_id = p_campaign_id,
        updated_at = NOW()
      WHERE call_operators.id = v_operator.id
        AND current_call_id IS NULL;

      IF FOUND THEN
        RETURN QUERY SELECT
          true, v_operator.id, v_operator.name, v_operator.extension, NULL::TEXT;
        RETURN;
      END IF;
    END IF;
  END IF;

  -- Find any available operator (round-robin by last_call_ended_at)
  SELECT co.id, co.operator_name AS name, co.extension
  INTO v_operator
  FROM call_operators co
  WHERE co.is_active = true
    AND co.status = 'available'
    AND co.current_call_id IS NULL
  ORDER BY co.last_call_ended_at ASC NULLS FIRST
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT,
      'no_operator_available'::TEXT;
    RETURN;
  END IF;

  -- Reserve operator
  UPDATE call_operators
  SET
    status = 'on_call',
    current_call_id = p_call_id,
    current_campaign_id = p_campaign_id,
    updated_at = NOW()
  WHERE call_operators.id = v_operator.id
    AND current_call_id IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT,
      'operator_taken'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true, v_operator.id, v_operator.name, v_operator.extension, NULL::TEXT;
END;
$$;

-- ============================================================
-- 3. release_operator
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_operator(
  p_call_id UUID,
  p_force BOOLEAN DEFAULT false
)
RETURNS TABLE(
  success BOOLEAN,
  released_operator_id UUID,
  new_status TEXT,
  cooldown_seconds INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator RECORD;
  v_interval INT;
  v_new_status TEXT;
  v_campaign_interval INT;
BEGIN
  -- Find operator linked to this call
  IF p_force THEN
    SELECT * INTO v_operator
    FROM call_operators
    WHERE current_call_id = p_call_id
    FOR UPDATE;
  ELSE
    SELECT * INTO v_operator
    FROM call_operators
    WHERE current_call_id = p_call_id
      AND status = 'on_call'
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::INT;
    RETURN;
  END IF;

  -- Determine interval (personal > campaign > default 30s)
  v_interval := COALESCE(v_operator.personal_interval_seconds, -1);

  IF v_interval = -1 AND v_operator.current_campaign_id IS NOT NULL THEN
    SELECT queue_interval_seconds INTO v_campaign_interval
    FROM call_campaigns
    WHERE id = v_operator.current_campaign_id;

    v_interval := COALESCE(v_campaign_interval, 30);
  ELSIF v_interval = -1 THEN
    v_interval := 30;
  END IF;

  -- Determine new status
  IF v_interval > 0 THEN
    v_new_status := 'cooldown';
  ELSE
    v_new_status := 'available';
  END IF;

  -- Release operator
  UPDATE call_operators
  SET
    status = v_new_status,
    current_call_id = NULL,
    current_campaign_id = NULL,
    last_call_ended_at = NOW(),
    updated_at = NOW()
  WHERE call_operators.id = v_operator.id;

  RETURN QUERY SELECT
    true,
    v_operator.id,
    v_new_status,
    v_interval;
END;
$$;

-- ============================================================
-- 4. resolve_cooldowns
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_cooldowns()
RETURNS TABLE(
  resolved_operator_id UUID,
  resolved_operator_name TEXT,
  was_cooldown_seconds INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH resolved AS (
    UPDATE call_operators
    SET
      status = 'available',
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
$$;

-- ============================================================
-- 5. heal_stuck_operators
-- ============================================================
CREATE OR REPLACE FUNCTION public.heal_stuck_operators(
  p_stuck_threshold_minutes INT DEFAULT 10
)
RETURNS TABLE(
  healed_operator_id UUID,
  healed_operator_name TEXT,
  previous_status TEXT,
  action_taken TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ============================================================
-- 6. Trigger check_operator_not_busy
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_operator_not_busy()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If trying to set current_call_id
  IF NEW.current_call_id IS NOT NULL THEN
    -- Check if already has a different call
    IF OLD.current_call_id IS NOT NULL
       AND OLD.current_call_id != NEW.current_call_id THEN
      RAISE EXCEPTION 'Operador já está em outra ligação: %', OLD.current_call_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_operator_not_busy
BEFORE UPDATE ON call_operators
FOR EACH ROW
EXECUTE FUNCTION public.check_operator_not_busy();
