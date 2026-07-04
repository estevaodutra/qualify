-- =====================================================
-- Populate workflow_definitions from the existing engines.
-- Everything lands in "Sem pasta" (folder_id NULL) -- never
-- auto-create folders named after a channel/type; that's a
-- badge, not an organizational unit.
-- =====================================================

INSERT INTO public.workflow_definitions (company_id, folder_id, name, description, status, source_type, source_id, trigger_type, created_by, created_at, updated_at)
SELECT ds.company_id, NULL, ds.name, ds.description, CASE WHEN ds.is_active THEN 'active' ELSE 'draft' END,
  'dispatch_sequence', ds.id, ds.trigger_type, ds.user_id, ds.created_at, ds.updated_at
FROM public.dispatch_sequences ds
ON CONFLICT (source_type, source_id) DO NOTHING;

INSERT INTO public.workflow_definitions (company_id, folder_id, name, description, status, source_type, source_id, trigger_type, created_by, created_at, updated_at)
SELECT ms.company_id, NULL, ms.name, ms.description, CASE WHEN ms.active THEN 'active' ELSE 'draft' END,
  'group_sequence', ms.id, ms.trigger_type, ms.user_id, ms.created_at, ms.updated_at
FROM public.message_sequences ms
ON CONFLICT (source_type, source_id) DO NOTHING;

INSERT INTO public.workflow_definitions (company_id, folder_id, name, description, status, source_type, source_id, trigger_type, created_by, created_at, updated_at)
SELECT cc.company_id, NULL, cc.name, NULL, CASE WHEN cc.is_active THEN 'active' ELSE 'draft' END,
  'context_campaign', cc.id, cc.trigger_type, cc.user_id, cc.created_at, cc.updated_at
FROM public.context_campaigns cc
ON CONFLICT (source_type, source_id) DO NOTHING;

INSERT INTO public.workflow_definitions (company_id, folder_id, name, description, status, source_type, source_id, trigger_type, created_by, created_at, updated_at)
SELECT pc.company_id, NULL, pc.name, pc.description,
  CASE WHEN pc.status = 'active' THEN 'active' WHEN pc.status = 'paused' THEN 'paused' ELSE 'draft' END,
  'pirate_campaign', pc.id, NULL, pc.user_id, pc.created_at, pc.updated_at
FROM public.pirate_campaigns pc
ON CONFLICT (source_type, source_id) DO NOTHING;

INSERT INTO public.workflow_definitions (company_id, folder_id, name, description, status, source_type, source_id, trigger_type, created_by, created_at, updated_at)
SELECT call.company_id, NULL, call.name, call.description,
  CASE WHEN call.status = 'active' THEN 'active' WHEN call.status = 'paused' THEN 'paused' ELSE 'draft' END,
  'call_campaign', call.id, NULL, call.user_id, call.created_at, call.updated_at
FROM public.call_campaigns call
ON CONFLICT (source_type, source_id) DO NOTHING;
