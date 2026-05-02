UPDATE public.leads l
SET source_name = cc.name
FROM public.call_campaigns cc
WHERE l.source_type = 'campaign_manual'
  AND l.source_campaign_id = cc.id
  AND (l.source_name IS NULL OR l.source_name = '');