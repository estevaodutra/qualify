-- Qualify CRM — immutable deal journey ledger and configurable pipeline lines.
-- This migration is intentionally independent from quiz journey tracking.

CREATE TABLE IF NOT EXISTS public.crm_journey_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  line_role text NOT NULL CHECK (line_role IN ('main', 'auxiliary')),
  order_index integer NOT NULL DEFAULT 0,
  entry_stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  terminal_stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, pipeline_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_journey_one_main_start
  ON public.crm_journey_lines(company_id)
  WHERE line_role = 'main' AND order_index = 0;
CREATE INDEX IF NOT EXISTS crm_journey_lines_company_order
  ON public.crm_journey_lines(company_id, line_role, order_index);

CREATE OR REPLACE FUNCTION public.crm_journey_validate_line()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_pipeline_company uuid;
BEGIN
  SELECT company_id INTO v_pipeline_company FROM public.pipelines WHERE id = NEW.pipeline_id;
  IF v_pipeline_company IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Pipeline must belong to the selected company';
  END IF;
  IF NEW.entry_stage_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages WHERE id = NEW.entry_stage_id AND pipeline_id = NEW.pipeline_id
  ) THEN
    RAISE EXCEPTION 'Entry stage must belong to its pipeline';
  END IF;
  IF NEW.terminal_stage_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pipeline_stages WHERE id = NEW.terminal_stage_id AND pipeline_id = NEW.pipeline_id
  ) THEN
    RAISE EXCEPTION 'Terminal stage must belong to its pipeline';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS crm_journey_validate_line_trg ON public.crm_journey_lines;
CREATE TRIGGER crm_journey_validate_line_trg
BEFORE INSERT OR UPDATE ON public.crm_journey_lines
FOR EACH ROW EXECUTE FUNCTION public.crm_journey_validate_line();

ALTER TABLE public.crm_journey_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_journey_lines_read ON public.crm_journey_lines;
CREATE POLICY crm_journey_lines_read ON public.crm_journey_lines
FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
DROP POLICY IF EXISTS crm_journey_lines_write ON public.crm_journey_lines;
CREATE POLICY crm_journey_lines_write ON public.crm_journey_lines
FOR ALL TO authenticated
USING (public.is_company_member(company_id, auth.uid()))
WITH CHECK (public.is_company_member(company_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.crm_journey_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('created', 'moved', 'status_changed')),
  from_pipeline_id uuid,
  from_stage_id uuid,
  to_pipeline_id uuid,
  to_stage_id uuid,
  from_status text,
  to_status text,
  from_pipeline_name text,
  from_stage_name text,
  to_pipeline_name text,
  to_stage_name text,
  actor_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS crm_journey_events_deal_time
  ON public.crm_journey_events(company_id, deal_id, occurred_at, id);
CREATE INDEX IF NOT EXISTS crm_journey_events_lead_time
  ON public.crm_journey_events(company_id, lead_id, occurred_at, id);

ALTER TABLE public.crm_journey_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_journey_events_read ON public.crm_journey_events;
CREATE POLICY crm_journey_events_read ON public.crm_journey_events
FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));
-- Deliberately no client INSERT/UPDATE/DELETE policy: the database trigger is the source of truth.

CREATE OR REPLACE FUNCTION public.crm_record_deal_journey()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_type text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_type := 'created';
  ELSIF OLD.pipeline_id IS DISTINCT FROM NEW.pipeline_id OR OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    v_type := 'moved';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    v_type := 'status_changed';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.crm_journey_events (
    company_id, deal_id, lead_id, event_type,
    from_pipeline_id, from_stage_id, to_pipeline_id, to_stage_id,
    from_status, to_status, from_pipeline_name, from_stage_name,
    to_pipeline_name, to_stage_name, actor_id
  ) VALUES (
    NEW.company_id, NEW.id, NEW.lead_id, v_type,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.pipeline_id ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.stage_id ELSE NULL END,
    NEW.pipeline_id, NEW.stage_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END, NEW.status,
    (SELECT name FROM public.pipelines WHERE id = CASE WHEN TG_OP = 'UPDATE' THEN OLD.pipeline_id ELSE NULL END),
    (SELECT name FROM public.pipeline_stages WHERE id = CASE WHEN TG_OP = 'UPDATE' THEN OLD.stage_id ELSE NULL END),
    (SELECT name FROM public.pipelines WHERE id = NEW.pipeline_id),
    (SELECT name FROM public.pipeline_stages WHERE id = NEW.stage_id),
    auth.uid()
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_record_deal_journey() FROM PUBLIC;
DROP TRIGGER IF EXISTS crm_record_deal_journey_trg ON public.deals;
CREATE TRIGGER crm_record_deal_journey_trg
AFTER INSERT OR UPDATE OF pipeline_id, stage_id, status ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.crm_record_deal_journey();

GRANT SELECT ON public.crm_journey_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_journey_lines TO authenticated;

-- Atomic, company-scoped replacement for the visual map configuration.
CREATE OR REPLACE FUNCTION public.crm_save_journey_lines(p_company_id uuid, p_lines jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_company_member(p_company_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to configure this company';
  END IF;
  IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Lines must be an array';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_lines) l WHERE l->>'line_role' = 'main') THEN
    RAISE EXCEPTION 'At least one main pipeline is required';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_lines)) >
     (SELECT count(DISTINCT l->>'pipeline_id') FROM jsonb_array_elements(p_lines) l) THEN
    RAISE EXCEPTION 'Duplicated pipeline in map';
  END IF;
  DELETE FROM public.crm_journey_lines WHERE company_id = p_company_id;
  FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO public.crm_journey_lines
      (company_id, pipeline_id, line_role, order_index, entry_stage_id, terminal_stage_id)
    VALUES (
      p_company_id,
      (item->>'pipeline_id')::uuid,
      item->>'line_role',
      (item->>'order_index')::integer,
      nullif(item->>'entry_stage_id', '')::uuid,
      nullif(item->>'terminal_stage_id', '')::uuid
    );
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_save_journey_lines(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crm_save_journey_lines(uuid, jsonb) TO authenticated;
