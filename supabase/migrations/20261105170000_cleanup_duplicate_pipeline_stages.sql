-- Remove duplicate pipeline stages within the same pipeline
DO $$
DECLARE
  v_dup RECORD;
  v_keep_id UUID;
BEGIN
  FOR v_dup IN 
    SELECT pipeline_id, lower(trim(name)) as stage_name, count(*) as cnt
    FROM public.pipeline_stages
    WHERE pipeline_id IS NOT NULL
    GROUP BY pipeline_id, lower(trim(name))
    HAVING count(*) > 1
  LOOP
    -- Pick stage to keep: priority for stage with deals, then oldest
    SELECT s.id INTO v_keep_id
    FROM public.pipeline_stages s
    LEFT JOIN public.deals d ON d.stage_id = s.id
    WHERE s.pipeline_id = v_dup.pipeline_id 
      AND lower(trim(s.name)) = v_dup.stage_name
    GROUP BY s.id, s.created_at
    ORDER BY count(d.id) DESC, s.created_at ASC
    LIMIT 1;

    -- Re-link deals
    UPDATE public.deals
    SET stage_id = v_keep_id
    WHERE stage_id IN (
      SELECT id FROM public.pipeline_stages
      WHERE pipeline_id = v_dup.pipeline_id 
        AND lower(trim(name)) = v_dup.stage_name
        AND id != v_keep_id
    );

    -- Re-link leads
    UPDATE public.leads
    SET pipeline_stage_id = v_keep_id
    WHERE pipeline_stage_id IN (
      SELECT id FROM public.pipeline_stages
      WHERE pipeline_id = v_dup.pipeline_id 
        AND lower(trim(name)) = v_dup.stage_name
        AND id != v_keep_id
    );

    -- Delete duplicate stages
    DELETE FROM public.pipeline_stages
    WHERE pipeline_id = v_dup.pipeline_id 
      AND lower(trim(name)) = v_dup.stage_name
      AND id != v_keep_id;
  END LOOP;
END;
$$;
