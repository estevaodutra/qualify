-- ============ scheduling_appointments ============
CREATE TABLE public.scheduling_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  calendar_id uuid NOT NULL REFERENCES public.scheduling_calendars(id) ON DELETE CASCADE,
  attendant_id uuid REFERENCES public.scheduling_attendants(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'confirmed',
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  lead_name text NOT NULL,
  lead_phone text NOT NULL,
  lead_email text,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  meeting_url text,
  location_snapshot jsonb,
  cancel_token text NOT NULL UNIQUE,
  cancel_reason text,
  cancel_comment text,
  cancelled_at timestamptz,
  rescheduled_from_id uuid REFERENCES public.scheduling_appointments(id) ON DELETE SET NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sched_appts_calendar_start ON public.scheduling_appointments(calendar_id, scheduled_start);
CREATE INDEX idx_sched_appts_attendant_start ON public.scheduling_appointments(attendant_id, scheduled_start);
CREATE INDEX idx_sched_appts_company_start ON public.scheduling_appointments(company_id, scheduled_start);
CREATE INDEX idx_sched_appts_token ON public.scheduling_appointments(cancel_token);

ALTER TABLE public.scheduling_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members select appointments"
  ON public.scheduling_appointments FOR SELECT
  USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Company members insert appointments"
  ON public.scheduling_appointments FOR INSERT
  WITH CHECK (is_company_member(company_id, auth.uid()));

CREATE POLICY "Company members update appointments"
  ON public.scheduling_appointments FOR UPDATE
  USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Company admins delete appointments"
  ON public.scheduling_appointments FOR DELETE
  USING (is_company_admin(company_id, auth.uid()));

CREATE TRIGGER update_sched_appts_updated_at
  BEFORE UPDATE ON public.scheduling_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ scheduling_appointment_events ============
CREATE TABLE public.scheduling_appointment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.scheduling_appointments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sched_appt_events_appt ON public.scheduling_appointment_events(appointment_id, created_at DESC);

ALTER TABLE public.scheduling_appointment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members select appt events"
  ON public.scheduling_appointment_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.scheduling_appointments a
    WHERE a.id = scheduling_appointment_events.appointment_id
      AND is_company_member(a.company_id, auth.uid())
  ));

CREATE POLICY "Company members insert appt events"
  ON public.scheduling_appointment_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.scheduling_appointments a
    WHERE a.id = scheduling_appointment_events.appointment_id
      AND is_company_member(a.company_id, auth.uid())
  ));

-- ============ scheduling_attendant_integrations ============
CREATE TABLE public.scheduling_attendant_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendant_id uuid NOT NULL REFERENCES public.scheduling_attendants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  is_connected boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attendant_id, provider)
);

ALTER TABLE public.scheduling_attendant_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage attendant integrations"
  ON public.scheduling_attendant_integrations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.scheduling_attendants a
    WHERE a.id = scheduling_attendant_integrations.attendant_id
      AND is_company_member(a.company_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.scheduling_attendants a
    WHERE a.id = scheduling_attendant_integrations.attendant_id
      AND is_company_member(a.company_id, auth.uid())
  ));

CREATE TRIGGER update_sched_integrations_updated_at
  BEFORE UPDATE ON public.scheduling_attendant_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RPC: get_public_calendar ============
CREATE OR REPLACE FUNCTION public.get_public_calendar(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cal record;
  v_attendants jsonb;
  v_questions jsonb;
  v_lead_fields jsonb;
BEGIN
  SELECT * INTO v_cal FROM public.scheduling_calendars
   WHERE slug = p_slug AND status = 'active'
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'bio', a.bio,
    'photo_url', a.photo_url
  ) ORDER BY a.name), '[]'::jsonb)
  INTO v_attendants
  FROM public.scheduling_calendar_attendants ca
  JOIN public.scheduling_attendants a ON a.id = ca.attendant_id
  WHERE ca.calendar_id = v_cal.id AND a.is_active = true;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'question_text', q.question_text,
    'question_type', q.question_type,
    'options', q.options,
    'is_required', q.is_required,
    'sort_order', q.sort_order
  ) ORDER BY q.sort_order), '[]'::jsonb)
  INTO v_questions
  FROM public.scheduling_questions q
  WHERE q.calendar_id = v_cal.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', f.id,
    'field_name', f.field_name,
    'field_type', f.field_type,
    'is_required', f.is_required,
    'is_default', f.is_default,
    'sort_order', f.sort_order
  ) ORDER BY f.sort_order), '[]'::jsonb)
  INTO v_lead_fields
  FROM public.scheduling_lead_fields f
  WHERE f.calendar_id = v_cal.id;

  RETURN jsonb_build_object(
    'id', v_cal.id,
    'name', v_cal.name,
    'slug', v_cal.slug,
    'description', v_cal.description,
    'modality', v_cal.modality,
    'duration_minutes', v_cal.duration_minutes,
    'color', v_cal.color,
    'distribution', v_cal.distribution,
    'branding', v_cal.branding,
    'texts', v_cal.texts,
    'layout', v_cal.layout,
    'advanced', v_cal.advanced,
    'attendants', v_attendants,
    'questions', v_questions,
    'lead_fields', v_lead_fields
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_calendar(text) TO anon, authenticated;

-- ============ RPC: get_calendar_availability ============
CREATE OR REPLACE FUNCTION public.get_calendar_availability(
  p_calendar_id uuid,
  p_attendant_id uuid,
  p_from_date date,
  p_to_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cal record;
  v_result jsonb := '[]'::jsonb;
  v_day date;
  v_dow int;
  v_slots jsonb;
  v_buffer int;
  v_min_notice int;
  v_window_days int;
  v_daily_limit int;
  v_duration int;
  v_attendant_ids uuid[];
BEGIN
  SELECT * INTO v_cal FROM public.scheduling_calendars WHERE id = p_calendar_id AND status = 'active';
  IF NOT FOUND THEN RETURN '[]'::jsonb; END IF;

  v_duration := v_cal.duration_minutes;
  v_buffer := COALESCE((v_cal.advanced->>'buffer_minutes')::int, 0);
  v_min_notice := COALESCE((v_cal.advanced->>'min_notice_hours')::int, 1);
  v_window_days := COALESCE((v_cal.advanced->>'booking_window_days')::int, 30);
  v_daily_limit := COALESCE((v_cal.advanced->>'daily_limit')::int, 0);

  -- Limit to window
  IF p_to_date > (current_date + v_window_days) THEN
    p_to_date := current_date + v_window_days;
  END IF;
  IF p_from_date < current_date THEN
    p_from_date := current_date;
  END IF;

  -- Resolve attendants: specific one or all linked to calendar
  IF p_attendant_id IS NOT NULL THEN
    v_attendant_ids := ARRAY[p_attendant_id];
  ELSE
    SELECT COALESCE(array_agg(ca.attendant_id), ARRAY[]::uuid[])
    INTO v_attendant_ids
    FROM public.scheduling_calendar_attendants ca
    JOIN public.scheduling_attendants a ON a.id = ca.attendant_id
    WHERE ca.calendar_id = p_calendar_id AND a.is_active = true;
  END IF;

  IF array_length(v_attendant_ids, 1) IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  v_day := p_from_date;
  WHILE v_day <= p_to_date LOOP
    v_dow := EXTRACT(DOW FROM v_day)::int;
    v_slots := '[]'::jsonb;

    -- Build candidate slots from attendants availability for that dow
    WITH windows AS (
      SELECT av.start_time, av.end_time, av.attendant_id
      FROM public.scheduling_availability av
      WHERE av.attendant_id = ANY(v_attendant_ids)
        AND av.day_of_week = v_dow
        AND NOT EXISTS (
          SELECT 1 FROM public.scheduling_blocked_dates bd
          WHERE bd.attendant_id = av.attendant_id
            AND v_day BETWEEN bd.start_date AND bd.end_date
        )
    ),
    slot_times AS (
      SELECT gs AS slot_start,
             gs + (v_duration || ' minutes')::interval AS slot_end
      FROM windows w,
           LATERAL generate_series(
             (v_day::timestamp + w.start_time::time)::timestamptz,
             (v_day::timestamp + w.end_time::time - (v_duration || ' minutes')::interval)::timestamptz,
             ((v_duration + v_buffer) || ' minutes')::interval
           ) AS gs
    ),
    available AS (
      SELECT DISTINCT to_char(slot_start AT TIME ZONE 'UTC', 'HH24:MI') AS hhmm, slot_start
      FROM slot_times st
      WHERE slot_start >= (now() + (v_min_notice || ' hours')::interval)
        AND NOT EXISTS (
          SELECT 1 FROM public.scheduling_appointments appt
          WHERE appt.calendar_id = p_calendar_id
            AND appt.status IN ('confirmed', 'completed')
            AND appt.attendant_id = ANY(v_attendant_ids)
            AND tstzrange(appt.scheduled_start, appt.scheduled_end, '[)') &&
                tstzrange(st.slot_start, st.slot_end, '[)')
        )
    )
    SELECT COALESCE(jsonb_agg(to_char(slot_start, 'HH24:MI') ORDER BY slot_start), '[]'::jsonb)
    INTO v_slots
    FROM available;

    -- Daily limit check
    IF v_daily_limit > 0 THEN
      DECLARE v_count int;
      BEGIN
        SELECT count(*) INTO v_count FROM public.scheduling_appointments
         WHERE calendar_id = p_calendar_id
           AND status IN ('confirmed','completed')
           AND scheduled_start::date = v_day;
        IF v_count >= v_daily_limit THEN
          v_slots := '[]'::jsonb;
        END IF;
      END;
    END IF;

    IF jsonb_array_length(v_slots) > 0 THEN
      v_result := v_result || jsonb_build_object('date', v_day::text, 'slots', v_slots);
    END IF;

    v_day := v_day + 1;
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_calendar_availability(uuid, uuid, date, date) TO anon, authenticated;

-- ============ RPC: create_public_appointment ============
CREATE OR REPLACE FUNCTION public.create_public_appointment(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cal record;
  v_attendant_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_token text;
  v_id uuid;
  v_conflict_count int;
  v_candidate_ids uuid[];
  v_best_attendant uuid;
BEGIN
  SELECT * INTO v_cal FROM public.scheduling_calendars
   WHERE id = (p_payload->>'calendar_id')::uuid AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Calendar not found or inactive';
  END IF;

  v_start := (p_payload->>'scheduled_start')::timestamptz;
  v_end := v_start + (v_cal.duration_minutes || ' minutes')::interval;

  -- Resolve attendant
  IF p_payload ? 'attendant_id' AND (p_payload->>'attendant_id') IS NOT NULL THEN
    v_attendant_id := (p_payload->>'attendant_id')::uuid;
  ELSE
    -- round-robin: attendant linked with fewest future confirmed appointments
    SELECT array_agg(ca.attendant_id) INTO v_candidate_ids
    FROM public.scheduling_calendar_attendants ca
    JOIN public.scheduling_attendants a ON a.id = ca.attendant_id
    WHERE ca.calendar_id = v_cal.id AND a.is_active = true;

    IF v_candidate_ids IS NULL OR array_length(v_candidate_ids, 1) IS NULL THEN
      RAISE EXCEPTION 'No attendants available';
    END IF;

    SELECT cid INTO v_best_attendant
    FROM unnest(v_candidate_ids) AS cid
    LEFT JOIN LATERAL (
      SELECT count(*) AS n
      FROM public.scheduling_appointments a2
      WHERE a2.attendant_id = cid
        AND a2.status IN ('confirmed','completed')
        AND a2.scheduled_start >= now()
        AND NOT (tstzrange(a2.scheduled_start, a2.scheduled_end, '[)') &&
                 tstzrange(v_start, v_end, '[)'))
    ) x ON true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.scheduling_appointments a3
      WHERE a3.attendant_id = cid
        AND a3.status IN ('confirmed','completed')
        AND tstzrange(a3.scheduled_start, a3.scheduled_end, '[)') &&
            tstzrange(v_start, v_end, '[)')
    )
    ORDER BY COALESCE(x.n, 0), cid
    LIMIT 1;

    IF v_best_attendant IS NULL THEN
      RAISE EXCEPTION 'Slot not available';
    END IF;
    v_attendant_id := v_best_attendant;
  END IF;

  -- Lock conflict check
  PERFORM 1 FROM public.scheduling_appointments
   WHERE attendant_id = v_attendant_id
     AND status IN ('confirmed','completed')
     AND tstzrange(scheduled_start, scheduled_end, '[)') && tstzrange(v_start, v_end, '[)')
   FOR UPDATE;

  SELECT count(*) INTO v_conflict_count FROM public.scheduling_appointments
   WHERE attendant_id = v_attendant_id
     AND status IN ('confirmed','completed')
     AND tstzrange(scheduled_start, scheduled_end, '[)') && tstzrange(v_start, v_end, '[)');

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Slot no longer available';
  END IF;

  v_token := replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+','-'), '/','_'), '=','');

  INSERT INTO public.scheduling_appointments (
    company_id, calendar_id, attendant_id, status,
    scheduled_start, scheduled_end, timezone,
    lead_name, lead_phone, lead_email,
    custom_fields, answers, cancel_token,
    utm_source, utm_medium, utm_campaign
  ) VALUES (
    v_cal.company_id, v_cal.id, v_attendant_id, 'confirmed',
    v_start, v_end, COALESCE(p_payload->>'timezone', 'America/Sao_Paulo'),
    p_payload->>'lead_name', p_payload->>'lead_phone', p_payload->>'lead_email',
    COALESCE(p_payload->'custom_fields', '{}'::jsonb),
    COALESCE(p_payload->'answers', '{}'::jsonb),
    v_token,
    p_payload->>'utm_source', p_payload->>'utm_medium', p_payload->>'utm_campaign'
  ) RETURNING id INTO v_id;

  INSERT INTO public.scheduling_appointment_events (appointment_id, event_type, payload)
  VALUES (v_id, 'created', jsonb_build_object('source', 'public_booking'));

  RETURN jsonb_build_object(
    'id', v_id,
    'cancel_token', v_token,
    'attendant_id', v_attendant_id,
    'scheduled_start', v_start,
    'scheduled_end', v_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_appointment(jsonb) TO anon, authenticated;

-- ============ RPC: get_appointment_by_token ============
CREATE OR REPLACE FUNCTION public.get_appointment_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt record;
  v_cal record;
  v_att record;
BEGIN
  SELECT * INTO v_appt FROM public.scheduling_appointments WHERE cancel_token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_cal FROM public.scheduling_calendars WHERE id = v_appt.calendar_id;
  SELECT * INTO v_att FROM public.scheduling_attendants WHERE id = v_appt.attendant_id;

  RETURN jsonb_build_object(
    'id', v_appt.id,
    'status', v_appt.status,
    'scheduled_start', v_appt.scheduled_start,
    'scheduled_end', v_appt.scheduled_end,
    'timezone', v_appt.timezone,
    'lead_name', v_appt.lead_name,
    'lead_phone', v_appt.lead_phone,
    'lead_email', v_appt.lead_email,
    'meeting_url', v_appt.meeting_url,
    'location_snapshot', v_appt.location_snapshot,
    'cancel_token', v_appt.cancel_token,
    'calendar', jsonb_build_object(
      'id', v_cal.id, 'name', v_cal.name, 'slug', v_cal.slug,
      'modality', v_cal.modality, 'duration_minutes', v_cal.duration_minutes,
      'color', v_cal.color, 'branding', v_cal.branding, 'texts', v_cal.texts,
      'layout', v_cal.layout
    ),
    'attendant', CASE WHEN v_att.id IS NOT NULL THEN jsonb_build_object(
      'id', v_att.id, 'name', v_att.name, 'photo_url', v_att.photo_url, 'bio', v_att.bio
    ) ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_appointment_by_token(text) TO anon, authenticated;

-- ============ RPC: cancel_appointment_by_token ============
CREATE OR REPLACE FUNCTION public.cancel_appointment_by_token(p_token text, p_reason text, p_comment text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE public.scheduling_appointments
     SET status = 'cancelled',
         cancel_reason = p_reason,
         cancel_comment = p_comment,
         cancelled_at = now()
   WHERE cancel_token = p_token AND status IN ('confirmed')
   RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found or cannot be cancelled';
  END IF;

  INSERT INTO public.scheduling_appointment_events (appointment_id, event_type, payload)
  VALUES (v_id, 'cancelled', jsonb_build_object('reason', p_reason, 'comment', p_comment, 'by', 'lead'));

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_appointment_by_token(text, text, text) TO anon, authenticated;

-- ============ RPC: reschedule_appointment_by_token ============
CREATE OR REPLACE FUNCTION public.reschedule_appointment_by_token(p_token text, p_new_start timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old record;
  v_cal record;
  v_new_end timestamptz;
  v_conflict int;
  v_new_id uuid;
BEGIN
  SELECT * INTO v_old FROM public.scheduling_appointments WHERE cancel_token = p_token;
  IF NOT FOUND OR v_old.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Appointment not found or not active';
  END IF;
  SELECT * INTO v_cal FROM public.scheduling_calendars WHERE id = v_old.calendar_id;
  v_new_end := p_new_start + (v_cal.duration_minutes || ' minutes')::interval;

  PERFORM 1 FROM public.scheduling_appointments
   WHERE attendant_id = v_old.attendant_id
     AND status IN ('confirmed','completed')
     AND id <> v_old.id
     AND tstzrange(scheduled_start, scheduled_end, '[)') && tstzrange(p_new_start, v_new_end, '[)')
   FOR UPDATE;

  SELECT count(*) INTO v_conflict FROM public.scheduling_appointments
   WHERE attendant_id = v_old.attendant_id
     AND status IN ('confirmed','completed')
     AND id <> v_old.id
     AND tstzrange(scheduled_start, scheduled_end, '[)') && tstzrange(p_new_start, v_new_end, '[)');
  IF v_conflict > 0 THEN RAISE EXCEPTION 'Slot not available'; END IF;

  -- Mark old as rescheduled, clear its token so the new record owns it
  UPDATE public.scheduling_appointments
     SET status = 'rescheduled', cancel_token = v_old.cancel_token || '_old_' || extract(epoch from now())::text
   WHERE id = v_old.id;

  INSERT INTO public.scheduling_appointments (
    company_id, calendar_id, attendant_id, status,
    scheduled_start, scheduled_end, timezone,
    lead_name, lead_phone, lead_email,
    custom_fields, answers, cancel_token,
    rescheduled_from_id, utm_source, utm_medium, utm_campaign
  ) VALUES (
    v_old.company_id, v_old.calendar_id, v_old.attendant_id, 'confirmed',
    p_new_start, v_new_end, v_old.timezone,
    v_old.lead_name, v_old.lead_phone, v_old.lead_email,
    v_old.custom_fields, v_old.answers, v_old.cancel_token,
    v_old.id, v_old.utm_source, v_old.utm_medium, v_old.utm_campaign
  ) RETURNING id INTO v_new_id;

  INSERT INTO public.scheduling_appointment_events (appointment_id, event_type, payload)
  VALUES (v_new_id, 'rescheduled', jsonb_build_object('from_id', v_old.id, 'by', 'lead'));

  RETURN jsonb_build_object('ok', true, 'id', v_new_id, 'cancel_token', v_old.cancel_token);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reschedule_appointment_by_token(text, timestamptz) TO anon, authenticated;