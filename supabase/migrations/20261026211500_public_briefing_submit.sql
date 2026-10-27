-- Função pública para o cliente preencher o briefing do Manual de Marca 7D uma única vez
CREATE OR REPLACE FUNCTION public.sprint_os_submit_briefing(
  p_token TEXT,
  p_responses JSONB,
  p_mark_completed BOOLEAN DEFAULT false,
  p_client_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id UUID;
  v_workspace_row RECORD;
  v_data JSONB;
  v_brand_manual JSONB;
  v_fields JSONB;
  v_new_fields JSONB := '[]'::jsonb;
  v_field RECORD;
  v_field_id TEXT;
  v_response TEXT;
  v_public_config JSONB;
  v_updated_count INT := 0;
BEGIN
  -- 1. Validar link de compartilhamento
  SELECT s.workspace_id INTO v_workspace_id
  FROM sprint_os_share_links s
  WHERE s.token = p_token
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > now());

  IF v_workspace_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link inválido ou expirado');
  END IF;

  -- 2. Carregar workspace
  SELECT id, data INTO v_workspace_row
  FROM sprint_os_workspaces
  WHERE id = v_workspace_id AND archived_at IS NULL;

  IF v_workspace_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workspace não encontrado');
  END IF;

  v_data := v_workspace_row.data;
  v_brand_manual := COALESCE(v_data->'brandManual', '{}'::jsonb);
  v_fields := COALESCE(v_brand_manual->'fields', '[]'::jsonb);
  v_public_config := COALESCE(v_brand_manual->'publicShareConfig', '{}'::jsonb);

  -- 3. Atualizar cada campo que veio em p_responses
  FOR v_field IN SELECT * FROM jsonb_array_elements(v_fields) LOOP
    v_field_id := v_field.value->>'id';
    IF p_responses ? v_field_id THEN
      v_response := p_responses->>v_field_id;
      v_new_fields := v_new_fields || jsonb_build_array(
        v_field.value || jsonb_build_object(
          'response', v_response,
          'status', CASE WHEN length(trim(COALESCE(v_response, ''))) > 0 THEN 'completed' ELSE 'pending' END,
          'lastUpdatedAt', to_jsonb(now()::text)
        )
      );
      v_updated_count := v_updated_count + 1;
    ELSE
      v_new_fields := v_new_fields || jsonb_build_array(v_field.value);
    END IF;
  END LOOP;

  -- 4. Atualizar config de compartilhamento
  IF p_mark_completed THEN
    v_public_config := v_public_config || jsonb_build_object(
      'status', 'completed',
      'allowReopen', false,
      'completedAt', now()::text,
      'submittedBy', COALESCE(p_client_name, 'Cliente')
    );
  END IF;

  v_public_config := v_public_config || jsonb_build_object('lastAnsweredAt', now()::text);

  v_brand_manual := v_brand_manual || jsonb_build_object(
    'fields', v_new_fields,
    'publicShareConfig', v_public_config,
    'lastUpdatedAt', now()::text,
    'lastUpdatedBy', COALESCE(p_client_name, 'Cliente (Link Público)')
  );

  v_data := v_data || jsonb_build_object('brandManual', v_brand_manual);

  -- 5. Salvar de volta na tabela
  UPDATE sprint_os_workspaces
  SET data = v_data, updated_at = now()
  WHERE id = v_workspace_id;

  RETURN jsonb_build_object(
    'success', true,
    'updatedFieldsCount', v_updated_count,
    'status', v_public_config->>'status',
    'completedAt', v_public_config->>'completedAt'
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.sprint_os_submit_briefing(TEXT, JSONB, BOOLEAN, TEXT) TO anon, authenticated;
