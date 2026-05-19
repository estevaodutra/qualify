-- Fix: reserve_operator_for_call now filters operators by the campaign's company_id.
-- Previously any available operator from any company could be assigned, causing
-- cross-company operator assignment.

CREATE OR REPLACE FUNCTION public.reserve_operator_for_call(
  p_call_id uuid,
  p_campaign_id uuid,
  p_preferred_operator_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  success boolean,
  operator_id uuid,
  operator_name text,
  operator_extension text,
  error_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_operator RECORD;
  v_company_id UUID;
BEGIN
  -- Resolve company_id da campanha para restringir seleção de operadores
  SELECT company_id INTO v_company_id
  FROM call_campaigns
  WHERE id = p_campaign_id;

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
      UPDATE call_logs
      SET call_status = 'cancelled', ended_at = NOW()
      WHERE call_logs.operator_id = v_operator.id
        AND call_status IN ('dialing','ringing','answered','in_progress')
        AND id != p_call_id;

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

  -- Find available operator da mesma empresa (round-robin by last_call_ended_at)
  SELECT co.id, co.operator_name AS name, co.extension
  INTO v_operator
  FROM call_operators co
  WHERE co.is_active = true
    AND co.status = 'available'
    AND co.current_call_id IS NULL
    AND (v_company_id IS NULL OR co.company_id = v_company_id)
  ORDER BY co.last_call_ended_at ASC NULLS FIRST
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT,
      'no_operator_available'::TEXT;
    RETURN;
  END IF;

  UPDATE call_logs
  SET call_status = 'cancelled', ended_at = NOW()
  WHERE call_logs.operator_id = v_operator.id
    AND call_status IN ('dialing','ringing','answered','in_progress')
    AND id != p_call_id;

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
$function$;
