-- Backfill missing poll_messages from successful group_message_logs
-- Restores poll registrations that failed silently due to UNIQUE constraint violations on empty message_id
INSERT INTO public.poll_messages (
  user_id, message_id, zaap_id, node_id, sequence_id,
  campaign_id, group_jid, instance_id, question_text,
  options, option_actions, sent_at
)
SELECT DISTINCT ON (COALESCE(NULLIF(gml.external_message_id, ''), gml.zaap_id))
  gml.user_id,
  COALESCE(NULLIF(gml.external_message_id, ''), gml.zaap_id) AS message_id,
  gml.zaap_id,
  (gml.payload->'node'->>'id')::uuid AS node_id,
  gml.sequence_id,
  gml.group_campaign_id AS campaign_id,
  gml.group_jid,
  gml.instance_id,
  COALESCE(sn.config->>'question', sn.config->>'label', '') AS question_text,
  COALESCE(sn.config->'options', '[]'::jsonb) AS options,
  COALESCE(sn.config->'optionActions', '{}'::jsonb) AS option_actions,
  gml.sent_at
FROM public.group_message_logs gml
JOIN public.sequence_nodes sn ON sn.id = (gml.payload->'node'->>'id')::uuid
WHERE gml.node_type = 'poll'
  AND gml.status = 'sent'
  AND gml.zaap_id IS NOT NULL
  AND gml.group_campaign_id IS NOT NULL
  AND gml.sequence_id IS NOT NULL
  AND gml.instance_id IS NOT NULL
  AND gml.payload->'node'->>'id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.poll_messages pm
    WHERE pm.message_id = gml.external_message_id
       OR pm.message_id = gml.zaap_id
       OR pm.zaap_id = gml.zaap_id
  )
ORDER BY COALESCE(NULLIF(gml.external_message_id, ''), gml.zaap_id), gml.sent_at DESC
ON CONFLICT (message_id) DO NOTHING;