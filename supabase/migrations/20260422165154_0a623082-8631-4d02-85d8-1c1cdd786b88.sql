-- ============================================
-- SCHEDULING SYSTEM - PART 1: FOUNDATION
-- ============================================

-- 1. Calendars (booking types)
CREATE TABLE public.scheduling_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  modality TEXT NOT NULL DEFAULT 'call', -- call | video | in_person
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  distribution TEXT NOT NULL DEFAULT 'round_robin', -- round_robin | lead_choice
  status TEXT NOT NULL DEFAULT 'active', -- active | paused
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  texts JSONB NOT NULL DEFAULT '{}'::jsonb,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  advanced JSONB NOT NULL DEFAULT '{}'::jsonb, -- buffer, min_notice, daily_limit, window_days
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scheduling_calendars_slug_unique UNIQUE (company_id, slug)
);

CREATE INDEX idx_scheduling_calendars_company ON public.scheduling_calendars(company_id);
CREATE INDEX idx_scheduling_calendars_status ON public.scheduling_calendars(status);

ALTER TABLE public.scheduling_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can select calendars" ON public.scheduling_calendars
  FOR SELECT USING (is_company_member(company_id, auth.uid()));
CREATE POLICY "Members can insert calendars" ON public.scheduling_calendars
  FOR INSERT WITH CHECK (is_company_member(company_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Members can update calendars" ON public.scheduling_calendars
  FOR UPDATE USING (is_company_member(company_id, auth.uid()));
CREATE POLICY "Admins can delete calendars" ON public.scheduling_calendars
  FOR DELETE USING (is_company_admin(company_id, auth.uid()));

-- 2. Attendants
CREATE TABLE public.scheduling_attendants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  bio TEXT,
  photo_url TEXT,
  call_operator_id UUID,
  linked_user_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduling_attendants_company ON public.scheduling_attendants(company_id);

ALTER TABLE public.scheduling_attendants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can select attendants" ON public.scheduling_attendants
  FOR SELECT USING (is_company_member(company_id, auth.uid()));
CREATE POLICY "Members can insert attendants" ON public.scheduling_attendants
  FOR INSERT WITH CHECK (is_company_member(company_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Members can update attendants" ON public.scheduling_attendants
  FOR UPDATE USING (is_company_member(company_id, auth.uid()));
CREATE POLICY "Admins can delete attendants" ON public.scheduling_attendants
  FOR DELETE USING (is_company_admin(company_id, auth.uid()));

-- 3. Calendar <-> Attendants (N:N)
CREATE TABLE public.scheduling_calendar_attendants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.scheduling_calendars(id) ON DELETE CASCADE,
  attendant_id UUID NOT NULL REFERENCES public.scheduling_attendants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scheduling_cal_att_unique UNIQUE (calendar_id, attendant_id)
);

CREATE INDEX idx_sched_cal_att_calendar ON public.scheduling_calendar_attendants(calendar_id);
CREATE INDEX idx_sched_cal_att_attendant ON public.scheduling_calendar_attendants(attendant_id);

ALTER TABLE public.scheduling_calendar_attendants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can select calendar_attendants" ON public.scheduling_calendar_attendants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.scheduling_calendars c
            WHERE c.id = calendar_id AND is_company_member(c.company_id, auth.uid()))
  );
CREATE POLICY "Members can insert calendar_attendants" ON public.scheduling_calendar_attendants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.scheduling_calendars c
            WHERE c.id = calendar_id AND is_company_member(c.company_id, auth.uid()))
  );
CREATE POLICY "Members can delete calendar_attendants" ON public.scheduling_calendar_attendants
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.scheduling_calendars c
            WHERE c.id = calendar_id AND is_company_member(c.company_id, auth.uid()))
  );

-- 4. Availability (per attendant, weekly)
CREATE TABLE public.scheduling_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendant_id UUID NOT NULL REFERENCES public.scheduling_attendants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sched_avail_attendant ON public.scheduling_availability(attendant_id);

ALTER TABLE public.scheduling_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can select availability" ON public.scheduling_availability
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.scheduling_attendants a
            WHERE a.id = attendant_id AND is_company_member(a.company_id, auth.uid()))
  );
CREATE POLICY "Members can manage availability" ON public.scheduling_availability
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.scheduling_attendants a
            WHERE a.id = attendant_id AND is_company_member(a.company_id, auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.scheduling_attendants a
            WHERE a.id = attendant_id AND is_company_member(a.company_id, auth.uid()))
  );

-- 5. Blocked dates
CREATE TABLE public.scheduling_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendant_id UUID NOT NULL REFERENCES public.scheduling_attendants(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sched_blocked_attendant ON public.scheduling_blocked_dates(attendant_id);

ALTER TABLE public.scheduling_blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage blocked_dates" ON public.scheduling_blocked_dates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.scheduling_attendants a
            WHERE a.id = attendant_id AND is_company_member(a.company_id, auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.scheduling_attendants a
            WHERE a.id = attendant_id AND is_company_member(a.company_id, auth.uid()))
  );

-- 6. Qualification questions
CREATE TABLE public.scheduling_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.scheduling_calendars(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'short_text', -- short_text | long_text | number | multiple_choice
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sched_questions_calendar ON public.scheduling_questions(calendar_id);

ALTER TABLE public.scheduling_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage questions" ON public.scheduling_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.scheduling_calendars c
            WHERE c.id = calendar_id AND is_company_member(c.company_id, auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.scheduling_calendars c
            WHERE c.id = calendar_id AND is_company_member(c.company_id, auth.uid()))
  );

-- 7. Lead fields
CREATE TABLE public.scheduling_lead_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.scheduling_calendars(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- text | phone | email | number
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sched_lead_fields_calendar ON public.scheduling_lead_fields(calendar_id);

ALTER TABLE public.scheduling_lead_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage lead_fields" ON public.scheduling_lead_fields
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.scheduling_calendars c
            WHERE c.id = calendar_id AND is_company_member(c.company_id, auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.scheduling_calendars c
            WHERE c.id = calendar_id AND is_company_member(c.company_id, auth.uid()))
  );

-- 8. Notifications config (1:1 with calendar)
CREATE TABLE public.scheduling_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL UNIQUE REFERENCES public.scheduling_calendars(id) ON DELETE CASCADE,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_instance_id UUID,
  confirmation_message TEXT,
  reminder_1day_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_1day_message TEXT,
  reminder_1hour_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_1hour_message TEXT,
  reminder_15min_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_15min_message TEXT,
  notify_on_cancel BOOLEAN NOT NULL DEFAULT true,
  notify_on_reschedule BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduling_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage notifications" ON public.scheduling_notifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.scheduling_calendars c
            WHERE c.id = calendar_id AND is_company_member(c.company_id, auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.scheduling_calendars c
            WHERE c.id = calendar_id AND is_company_member(c.company_id, auth.uid()))
  );

-- 9. Integrations config (1:1 with calendar)
CREATE TABLE public.scheduling_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL UNIQUE REFERENCES public.scheduling_calendars(id) ON DELETE CASCADE,
  call_campaign_enabled BOOLEAN NOT NULL DEFAULT false,
  call_campaign_id UUID,
  call_campaign_timing TEXT NOT NULL DEFAULT 'scheduled', -- immediate | scheduled
  video_provider TEXT, -- google_meet | zoom
  video_auto_link BOOLEAN NOT NULL DEFAULT true,
  video_include_in_confirmation BOOLEAN NOT NULL DEFAULT true,
  in_person_address TEXT,
  in_person_maps_url TEXT,
  webhook_created_url TEXT,
  webhook_created_enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_cancelled_url TEXT,
  webhook_cancelled_enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_rescheduled_url TEXT,
  webhook_rescheduled_enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_completed_url TEXT,
  webhook_completed_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduling_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage integrations" ON public.scheduling_integrations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.scheduling_calendars c
            WHERE c.id = calendar_id AND is_company_member(c.company_id, auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.scheduling_calendars c
            WHERE c.id = calendar_id AND is_company_member(c.company_id, auth.uid()))
  );

-- ============================================
-- TIMESTAMP TRIGGERS
-- ============================================

CREATE TRIGGER set_scheduling_calendars_updated_at
  BEFORE UPDATE ON public.scheduling_calendars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_scheduling_attendants_updated_at
  BEFORE UPDATE ON public.scheduling_attendants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_scheduling_notifications_updated_at
  BEFORE UPDATE ON public.scheduling_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_scheduling_integrations_updated_at
  BEFORE UPDATE ON public.scheduling_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- STORAGE BUCKET FOR ASSETS
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('scheduling-assets', 'scheduling-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read scheduling assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'scheduling-assets');

CREATE POLICY "Authenticated upload scheduling assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'scheduling-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update scheduling assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'scheduling-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated delete scheduling assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'scheduling-assets' AND auth.uid() IS NOT NULL);