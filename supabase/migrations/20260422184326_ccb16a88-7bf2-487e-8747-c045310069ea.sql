
ALTER TABLE public.scheduling_appointments
  ADD COLUMN IF NOT EXISTS confirmation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1d_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_15m_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS call_lead_id uuid;

CREATE INDEX IF NOT EXISTS idx_sched_appts_reminders_due
  ON public.scheduling_appointments (scheduled_start)
  WHERE status = 'confirmed';

ALTER TABLE public.scheduling_global_integrations
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS refresh_token text,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_account_id text;

CREATE OR REPLACE FUNCTION public.fire_scheduling_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_should_fire boolean := false;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IN ('confirmed','cancelled','rescheduled','completed','no_show') THEN
      v_should_fire := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status IN ('confirmed','cancelled','rescheduled','completed','no_show') THEN
      v_should_fire := true;
    END IF;
  END IF;

  IF v_should_fire THEN
    PERFORM net.http_post(
      url := 'https://btvzspqcnzcslkdtddwl.supabase.co/functions/v1/scheduling-dispatch',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object(
        'appointment_id', NEW.id,
        'op', TG_OP,
        'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
        'new_status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_scheduling_appointment_changed ON public.scheduling_appointments;
CREATE TRIGGER on_scheduling_appointment_changed
AFTER INSERT OR UPDATE OF status ON public.scheduling_appointments
FOR EACH ROW
EXECUTE FUNCTION public.fire_scheduling_dispatch();
