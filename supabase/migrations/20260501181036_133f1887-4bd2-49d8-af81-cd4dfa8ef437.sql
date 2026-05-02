INSERT INTO public.leads (
  user_id, phone, name, email, custom_fields,
  active_campaign_id, active_campaign_type,
  source_type, source_campaign_id
)
SELECT DISTINCT ON (cl.user_id, cl.phone)
  cl.user_id,
  cl.phone,
  cl.name,
  cl.email,
  COALESCE(cl.custom_fields, '{}'::jsonb),
  cl.campaign_id,
  'ligacao',
  'campaign_manual',
  cl.campaign_id
FROM public.call_leads cl
WHERE cl.phone IS NOT NULL
  AND cl.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.user_id = cl.user_id AND l.phone = cl.phone
  )
ORDER BY cl.user_id, cl.phone, cl.created_at ASC
ON CONFLICT (user_id, phone) DO NOTHING;