
CREATE OR REPLACE FUNCTION public.get_call_leads_counts(p_campaign_ids uuid[])
RETURNS TABLE(campaign_id uuid, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cl.campaign_id, count(*) as cnt
  FROM call_leads cl
  WHERE cl.campaign_id = ANY(p_campaign_ids)
  GROUP BY cl.campaign_id;
$$;

CREATE OR REPLACE FUNCTION public.get_call_logs_counts(p_campaign_ids uuid[])
RETURNS TABLE(campaign_id uuid, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cl.campaign_id, count(*) as cnt
  FROM call_logs cl
  WHERE cl.campaign_id = ANY(p_campaign_ids)
  GROUP BY cl.campaign_id;
$$;
