-- Settings table (1:1 with companies)
CREATE TABLE public.scheduling_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE,
  default_timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  custom_domain TEXT,
  custom_domain_status TEXT NOT NULL DEFAULT 'pending' CHECK (custom_domain_status IN ('pending','verified','error')),
  custom_domain_verified_at TIMESTAMPTZ,
  hide_branding BOOLEAN NOT NULL DEFAULT false,
  webhook_global_enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_global_url TEXT,
  default_whatsapp_instance_id UUID,
  send_email_confirmation BOOLEAN NOT NULL DEFAULT false,
  send_ics_invite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduling_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view scheduling_settings" ON public.scheduling_settings
  FOR SELECT USING (is_company_member(company_id, auth.uid()));
CREATE POLICY "Admins can insert scheduling_settings" ON public.scheduling_settings
  FOR INSERT WITH CHECK (is_company_admin(company_id, auth.uid()));
CREATE POLICY "Admins can update scheduling_settings" ON public.scheduling_settings
  FOR UPDATE USING (is_company_admin(company_id, auth.uid()));
CREATE POLICY "Admins can delete scheduling_settings" ON public.scheduling_settings
  FOR DELETE USING (is_company_admin(company_id, auth.uid()));

CREATE TRIGGER update_scheduling_settings_updated_at
  BEFORE UPDATE ON public.scheduling_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Global integrations placeholder
CREATE TABLE public.scheduling_global_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar','outlook','zoom','google_meet')),
  is_connected BOOLEAN NOT NULL DEFAULT false,
  account_email TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider)
);

ALTER TABLE public.scheduling_global_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view scheduling_global_integrations" ON public.scheduling_global_integrations
  FOR SELECT USING (is_company_admin(company_id, auth.uid()));
CREATE POLICY "Admins can insert scheduling_global_integrations" ON public.scheduling_global_integrations
  FOR INSERT WITH CHECK (is_company_admin(company_id, auth.uid()));
CREATE POLICY "Admins can update scheduling_global_integrations" ON public.scheduling_global_integrations
  FOR UPDATE USING (is_company_admin(company_id, auth.uid()));
CREATE POLICY "Admins can delete scheduling_global_integrations" ON public.scheduling_global_integrations
  FOR DELETE USING (is_company_admin(company_id, auth.uid()));

CREATE TRIGGER update_scheduling_global_integrations_updated_at
  BEFORE UPDATE ON public.scheduling_global_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Funnel counters
ALTER TABLE public.scheduling_calendars
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slot_select_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS details_submit_count INTEGER NOT NULL DEFAULT 0;

-- Public increment RPCs (no auth)
CREATE OR REPLACE FUNCTION public.increment_calendar_view(p_slug TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.scheduling_calendars SET view_count = view_count + 1 WHERE slug = p_slug;
$$;

CREATE OR REPLACE FUNCTION public.increment_calendar_slot_select(p_slug TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.scheduling_calendars SET slot_select_count = slot_select_count + 1 WHERE slug = p_slug;
$$;

CREATE OR REPLACE FUNCTION public.increment_calendar_details_submit(p_slug TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.scheduling_calendars SET details_submit_count = details_submit_count + 1 WHERE slug = p_slug;
$$;

GRANT EXECUTE ON FUNCTION public.increment_calendar_view(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_calendar_slot_select(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_calendar_details_submit(TEXT) TO anon, authenticated;

-- Analytics RPC: overview with prev period
CREATE OR REPLACE FUNCTION public.get_scheduling_overview(
  p_company_id UUID,
  p_calendar_id UUID DEFAULT NULL,
  p_attendant_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT (now()::date - 29),
  p_to_date DATE DEFAULT now()::date
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_period_days INT;
  v_prev_from DATE;
  v_prev_to DATE;
  v_visits_cur INT;
  v_visits_prev INT;
  v_conf_cur INT;
  v_conf_prev INT;
  v_cancel_cur INT;
  v_cancel_prev INT;
  v_noshow_cur INT;
  v_noshow_prev INT;
BEGIN
  IF NOT is_company_member(p_company_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a company member';
  END IF;
  v_period_days := (p_to_date - p_from_date) + 1;
  v_prev_to := p_from_date - 1;
  v_prev_from := v_prev_to - (v_period_days - 1);

  SELECT COALESCE(SUM(view_count),0) INTO v_visits_cur FROM scheduling_calendars
    WHERE company_id = p_company_id AND (p_calendar_id IS NULL OR id = p_calendar_id);
  v_visits_prev := v_visits_cur; -- view_count is cumulative; delta approximated

  SELECT COUNT(*) INTO v_conf_cur FROM scheduling_appointments
    WHERE company_id = p_company_id
      AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
      AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
      AND scheduled_start::date BETWEEN p_from_date AND p_to_date
      AND status NOT IN ('rescheduled');

  SELECT COUNT(*) INTO v_conf_prev FROM scheduling_appointments
    WHERE company_id = p_company_id
      AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
      AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
      AND scheduled_start::date BETWEEN v_prev_from AND v_prev_to
      AND status NOT IN ('rescheduled');

  SELECT COUNT(*) INTO v_cancel_cur FROM scheduling_appointments
    WHERE company_id = p_company_id
      AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
      AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
      AND scheduled_start::date BETWEEN p_from_date AND p_to_date
      AND status = 'cancelled';

  SELECT COUNT(*) INTO v_cancel_prev FROM scheduling_appointments
    WHERE company_id = p_company_id
      AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
      AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
      AND scheduled_start::date BETWEEN v_prev_from AND v_prev_to
      AND status = 'cancelled';

  SELECT COUNT(*) INTO v_noshow_cur FROM scheduling_appointments
    WHERE company_id = p_company_id
      AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
      AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
      AND scheduled_start::date BETWEEN p_from_date AND p_to_date
      AND status = 'no_show';

  SELECT COUNT(*) INTO v_noshow_prev FROM scheduling_appointments
    WHERE company_id = p_company_id
      AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
      AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
      AND scheduled_start::date BETWEEN v_prev_from AND v_prev_to
      AND status = 'no_show';

  RETURN jsonb_build_object(
    'conversion_rate', CASE WHEN v_visits_cur > 0 THEN round((v_conf_cur::numeric / v_visits_cur) * 100, 2) ELSE 0 END,
    'conversion_prev', CASE WHEN v_visits_prev > 0 THEN round((v_conf_prev::numeric / v_visits_prev) * 100, 2) ELSE 0 END,
    'appointments_total', v_conf_cur,
    'appointments_prev', v_conf_prev,
    'cancellations_total', v_cancel_cur,
    'cancellations_prev', v_cancel_prev,
    'no_shows_total', v_noshow_cur,
    'no_shows_prev', v_noshow_prev
  );
END;
$$;

-- By day
CREATE OR REPLACE FUNCTION public.get_scheduling_by_day(
  p_company_id UUID,
  p_calendar_id UUID DEFAULT NULL,
  p_attendant_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT (now()::date - 29),
  p_to_date DATE DEFAULT now()::date
)
RETURNS TABLE(day DATE, total BIGINT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_company_member(p_company_id, auth.uid()) THEN RAISE EXCEPTION 'not a company member'; END IF;
  RETURN QUERY
  SELECT gs::date AS day,
         COALESCE(COUNT(a.id), 0)::bigint AS total
  FROM generate_series(p_from_date, p_to_date, interval '1 day') gs
  LEFT JOIN scheduling_appointments a
    ON a.scheduled_start::date = gs::date
    AND a.company_id = p_company_id
    AND (p_calendar_id IS NULL OR a.calendar_id = p_calendar_id)
    AND (p_attendant_id IS NULL OR a.attendant_id = p_attendant_id)
    AND a.status NOT IN ('rescheduled')
  GROUP BY gs
  ORDER BY gs;
END;
$$;

-- Heatmap
CREATE OR REPLACE FUNCTION public.get_scheduling_heatmap(
  p_company_id UUID,
  p_calendar_id UUID DEFAULT NULL,
  p_attendant_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT (now()::date - 89),
  p_to_date DATE DEFAULT now()::date
)
RETURNS TABLE(dow INT, hour INT, total BIGINT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_company_member(p_company_id, auth.uid()) THEN RAISE EXCEPTION 'not a company member'; END IF;
  RETURN QUERY
  SELECT EXTRACT(ISODOW FROM scheduled_start)::int AS dow,
         EXTRACT(HOUR FROM scheduled_start)::int AS hour,
         COUNT(*)::bigint
  FROM scheduling_appointments
  WHERE company_id = p_company_id
    AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
    AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
    AND scheduled_start::date BETWEEN p_from_date AND p_to_date
    AND status NOT IN ('rescheduled')
  GROUP BY 1, 2;
END;
$$;

-- Attendant performance
CREATE OR REPLACE FUNCTION public.get_scheduling_attendant_performance(
  p_company_id UUID,
  p_calendar_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT (now()::date - 29),
  p_to_date DATE DEFAULT now()::date
)
RETURNS TABLE(attendant_id UUID, name TEXT, photo_url TEXT, total BIGINT, completed BIGINT, no_shows BIGINT, success_rate NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_company_member(p_company_id, auth.uid()) THEN RAISE EXCEPTION 'not a company member'; END IF;
  RETURN QUERY
  SELECT att.id,
         att.name,
         att.photo_url,
         COUNT(a.id)::bigint AS total,
         COUNT(a.id) FILTER (WHERE a.status = 'completed')::bigint AS completed,
         COUNT(a.id) FILTER (WHERE a.status = 'no_show')::bigint AS no_shows,
         CASE WHEN COUNT(a.id) > 0
              THEN round((COUNT(a.id) FILTER (WHERE a.status = 'completed')::numeric / COUNT(a.id)) * 100, 2)
              ELSE 0 END AS success_rate
  FROM scheduling_attendants att
  LEFT JOIN scheduling_appointments a
    ON a.attendant_id = att.id
    AND a.scheduled_start::date BETWEEN p_from_date AND p_to_date
    AND (p_calendar_id IS NULL OR a.calendar_id = p_calendar_id)
    AND a.status NOT IN ('rescheduled')
  WHERE att.company_id = p_company_id
  GROUP BY att.id, att.name, att.photo_url
  ORDER BY total DESC;
END;
$$;

-- Sources
CREATE OR REPLACE FUNCTION public.get_scheduling_sources(
  p_company_id UUID,
  p_calendar_id UUID DEFAULT NULL,
  p_attendant_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT (now()::date - 29),
  p_to_date DATE DEFAULT now()::date
)
RETURNS TABLE(source TEXT, total BIGINT, pct NUMERIC) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total BIGINT;
BEGIN
  IF NOT is_company_member(p_company_id, auth.uid()) THEN RAISE EXCEPTION 'not a company member'; END IF;
  SELECT COUNT(*) INTO v_total FROM scheduling_appointments
  WHERE company_id = p_company_id
    AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
    AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
    AND scheduled_start::date BETWEEN p_from_date AND p_to_date
    AND status NOT IN ('rescheduled');

  RETURN QUERY
  SELECT COALESCE(NULLIF(utm_source,''), 'direct') AS source,
         COUNT(*)::bigint AS total,
         CASE WHEN v_total > 0 THEN round((COUNT(*)::numeric / v_total) * 100, 2) ELSE 0 END AS pct
  FROM scheduling_appointments
  WHERE company_id = p_company_id
    AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
    AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
    AND scheduled_start::date BETWEEN p_from_date AND p_to_date
    AND status NOT IN ('rescheduled')
  GROUP BY 1
  ORDER BY total DESC;
END;
$$;

-- Funnel
CREATE OR REPLACE FUNCTION public.get_scheduling_funnel(
  p_company_id UUID,
  p_calendar_id UUID DEFAULT NULL,
  p_attendant_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT (now()::date - 29),
  p_to_date DATE DEFAULT now()::date
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_visits INT; v_slot INT; v_details INT; v_conf INT;
BEGIN
  IF NOT is_company_member(p_company_id, auth.uid()) THEN RAISE EXCEPTION 'not a company member'; END IF;

  SELECT COALESCE(SUM(view_count),0), COALESCE(SUM(slot_select_count),0), COALESCE(SUM(details_submit_count),0)
  INTO v_visits, v_slot, v_details
  FROM scheduling_calendars
  WHERE company_id = p_company_id AND (p_calendar_id IS NULL OR id = p_calendar_id);

  SELECT COUNT(*) INTO v_conf FROM scheduling_appointments
  WHERE company_id = p_company_id
    AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
    AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
    AND scheduled_start::date BETWEEN p_from_date AND p_to_date
    AND status NOT IN ('rescheduled');

  RETURN jsonb_build_object('visits', v_visits, 'slot_selected', v_slot, 'details_filled', v_details, 'confirmed', v_conf);
END;
$$;

-- Cancel reasons
CREATE OR REPLACE FUNCTION public.get_scheduling_cancel_reasons(
  p_company_id UUID,
  p_calendar_id UUID DEFAULT NULL,
  p_attendant_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT (now()::date - 29),
  p_to_date DATE DEFAULT now()::date
)
RETURNS TABLE(reason TEXT, total BIGINT, pct NUMERIC) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total BIGINT;
BEGIN
  IF NOT is_company_member(p_company_id, auth.uid()) THEN RAISE EXCEPTION 'not a company member'; END IF;
  SELECT COUNT(*) INTO v_total FROM scheduling_appointments
  WHERE company_id = p_company_id
    AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
    AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
    AND scheduled_start::date BETWEEN p_from_date AND p_to_date
    AND status = 'cancelled';

  RETURN QUERY
  SELECT COALESCE(NULLIF(cancel_reason,''), 'not_informed') AS reason,
         COUNT(*)::bigint AS total,
         CASE WHEN v_total > 0 THEN round((COUNT(*)::numeric / v_total) * 100, 2) ELSE 0 END AS pct
  FROM scheduling_appointments
  WHERE company_id = p_company_id
    AND (p_calendar_id IS NULL OR calendar_id = p_calendar_id)
    AND (p_attendant_id IS NULL OR attendant_id = p_attendant_id)
    AND scheduled_start::date BETWEEN p_from_date AND p_to_date
    AND status = 'cancelled'
  GROUP BY 1
  ORDER BY total DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_scheduling_overview(UUID,UUID,UUID,DATE,DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scheduling_by_day(UUID,UUID,UUID,DATE,DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scheduling_heatmap(UUID,UUID,UUID,DATE,DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scheduling_attendant_performance(UUID,UUID,DATE,DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scheduling_sources(UUID,UUID,UUID,DATE,DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scheduling_funnel(UUID,UUID,UUID,DATE,DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scheduling_cancel_reasons(UUID,UUID,UUID,DATE,DATE) TO authenticated;