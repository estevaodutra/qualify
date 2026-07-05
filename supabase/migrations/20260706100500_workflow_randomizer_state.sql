-- =====================================================
-- workflow_randomizer_state: per-node round-robin cursor
-- for the Randomizador node's round_robin mode. One row
-- per (sequence, node); the RPC below performs an atomic
-- "read current position, advance, return chosen branch"
-- under a row lock so concurrent executions never race.
-- =====================================================

CREATE TABLE public.workflow_randomizer_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  workflow_id uuid NOT NULL REFERENCES public.message_sequences(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES public.sequence_nodes(id) ON DELETE CASCADE,
  last_branch_id text,
  next_position integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, node_id)
);

CREATE INDEX idx_workflow_randomizer_state_company ON public.workflow_randomizer_state (company_id);

ALTER TABLE public.workflow_randomizer_state ENABLE ROW LEVEL SECURITY;

-- Read-only visibility for company members (e.g. future debugging UI).
-- All writes happen exclusively through the SECURITY DEFINER RPC below
-- (and via the edge function's service-role client, which bypasses RLS
-- entirely) — no direct INSERT/UPDATE policy is granted to `authenticated`.
CREATE POLICY "Company members can select workflow_randomizer_state"
  ON public.workflow_randomizer_state FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND is_company_member(company_id, auth.uid()));

GRANT ALL ON TABLE public.workflow_randomizer_state TO authenticated, service_role;

CREATE TRIGGER update_workflow_randomizer_state_updated_at
  BEFORE UPDATE ON public.workflow_randomizer_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- get_next_randomizer_branch: atomic round-robin advance.
-- SELECT ... FOR UPDATE locks the row for the duration of
-- the function's implicit transaction, so concurrent calls
-- for the same (workflow_id, node_id) serialize instead of
-- racing on a read-then-write from the edge function.
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_next_randomizer_branch(
  p_company_id uuid,
  p_sequence_id uuid,
  p_node_id uuid,
  p_branch_ids text[]
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_count int := COALESCE(array_length(p_branch_ids, 1), 0);
  v_next_position int;
  v_selected text;
BEGIN
  IF v_branch_count < 1 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.workflow_randomizer_state (company_id, workflow_id, node_id, next_position, version)
  VALUES (p_company_id, p_sequence_id, p_node_id, 0, 0)
  ON CONFLICT (workflow_id, node_id) DO NOTHING;

  SELECT next_position INTO v_next_position
  FROM public.workflow_randomizer_state
  WHERE workflow_id = p_sequence_id AND node_id = p_node_id
  FOR UPDATE;

  v_selected := p_branch_ids[(v_next_position % v_branch_count) + 1]; -- Postgres arrays are 1-indexed

  UPDATE public.workflow_randomizer_state
  SET next_position = v_next_position + 1,
      last_branch_id = v_selected,
      version = version + 1,
      updated_at = now()
  WHERE workflow_id = p_sequence_id AND node_id = p_node_id;

  RETURN v_selected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_randomizer_branch(uuid, uuid, uuid, text[]) TO authenticated, service_role;
