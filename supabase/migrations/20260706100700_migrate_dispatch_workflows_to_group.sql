-- Migration: Migrate existing dispatch_sequence workflows to group_sequence (unified flowchart)
-- This unifies the database model so that all workflows use the message_sequences + sequence_nodes schema.

-- 1. Create matching group_campaigns for the campaigns that hold these sequences
INSERT INTO public.group_campaigns (id, user_id, company_id, name, status)
SELECT DISTINCT ds.campaign_id, ds.user_id, ds.company_id, ds.name, 'active'
FROM public.dispatch_sequences ds
JOIN public.workflow_definitions wd ON wd.source_id = ds.id AND wd.source_type = 'dispatch_sequence'
ON CONFLICT (id) DO NOTHING;

-- 2. Copy dispatch_sequences into message_sequences (reusing the same ID so references are preserved)
INSERT INTO public.message_sequences (id, user_id, company_id, group_campaign_id, name, description, trigger_type, trigger_config, active, created_at, updated_at)
SELECT 
  ds.id, 
  ds.user_id, 
  ds.company_id, 
  ds.campaign_id, 
  ds.name, 
  ds.description, 
  ds.trigger_type, 
  ds.trigger_config || '{"isGroup": false}'::jsonb, -- default to individual conversation mode
  ds.is_active, 
  ds.created_at, 
  ds.updated_at
FROM public.dispatch_sequences ds
JOIN public.workflow_definitions wd ON wd.source_id = ds.id AND wd.source_type = 'dispatch_sequence'
ON CONFLICT (id) DO NOTHING;

-- 3. Copy dispatch_sequence_steps to sequence_nodes, converting them to the unified format
INSERT INTO public.sequence_nodes (id, sequence_id, user_id, node_type, position_x, position_y, node_order, config, created_at)
SELECT 
  dss.id,
  dss.sequence_id,
  dss.user_id,
  CASE WHEN dss.step_type = 'message' THEN 'content' ELSE dss.step_type END,
  320 + dss.step_order * 260,
  150,
  dss.step_order + 1,
  CASE 
    WHEN dss.step_type = 'message' THEN 
      jsonb_build_object(
        'contentType', COALESCE(dss.message_type, 'message'),
        'content', CASE WHEN dss.message_type IN ('text', 'buttons', 'list') OR dss.message_type IS NULL THEN dss.message_content ELSE NULL END,
        'caption', CASE WHEN dss.message_type NOT IN ('text', 'buttons', 'list') AND dss.message_type IS NOT NULL THEN dss.message_content ELSE NULL END,
        'url', dss.message_media_url,
        'buttons', dss.message_buttons
      )
    WHEN dss.step_type = 'delay' THEN 
      jsonb_build_object(
        'minutes', CASE WHEN dss.delay_unit = 'minutes' THEN dss.delay_value ELSE 0 END,
        'hours', CASE WHEN dss.delay_unit = 'hours' THEN dss.delay_value ELSE 0 END,
        'days', CASE WHEN dss.delay_unit = 'days' THEN dss.delay_value ELSE 0 END
      )
    ELSE '{}'::jsonb
  END,
  dss.created_at
FROM public.dispatch_sequence_steps dss
JOIN public.workflow_definitions wd ON wd.source_id = dss.sequence_id AND wd.source_type = 'dispatch_sequence'
ON CONFLICT (id) DO NOTHING;

-- 4. Create trigger (start) nodes for the newly-migrated sequences
INSERT INTO public.sequence_nodes (id, sequence_id, user_id, node_type, position_x, position_y, node_order, config)
SELECT 
  gen_random_uuid(),
  ms.id,
  ms.user_id,
  'trigger',
  50,
  150,
  0,
  jsonb_build_object('triggerType', ms.trigger_type, 'triggerConfig', ms.trigger_config)
FROM public.message_sequences ms
JOIN public.workflow_definitions wd ON wd.source_id = ms.id AND wd.source_type = 'dispatch_sequence'
WHERE NOT EXISTS (
  SELECT 1 FROM public.sequence_nodes sn 
  WHERE sn.sequence_id = ms.id AND sn.node_type = 'trigger'
);

-- 5. Chain the sequence nodes sequentially using sequence_connections
INSERT INTO public.sequence_connections (id, sequence_id, user_id, source_node_id, target_node_id, created_at)
SELECT 
  gen_random_uuid(),
  sn1.sequence_id,
  sn1.user_id,
  sn1.id,
  sn2.id,
  now()
FROM public.sequence_nodes sn1
JOIN public.sequence_nodes sn2 ON sn1.sequence_id = sn2.sequence_id AND sn2.node_order = sn1.node_order + 1
JOIN public.workflow_definitions wd ON wd.source_id = sn1.sequence_id AND wd.source_type = 'dispatch_sequence'
WHERE NOT EXISTS (
  SELECT 1 FROM public.sequence_connections sc 
  WHERE sc.sequence_id = sn1.sequence_id 
    AND sc.source_node_id = sn1.id 
    AND sc.target_node_id = sn2.id
);

-- 6. Update workflow_definitions to point to the unified group_sequence source_type
UPDATE public.workflow_definitions 
SET source_type = 'group_sequence' 
WHERE source_type = 'dispatch_sequence';
