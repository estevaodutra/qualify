
-- Step 1: Delete call_logs associated with duplicate call_leads (keep the most recent lead per phone+campaign)
DELETE FROM public.call_logs
WHERE lead_id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY phone, campaign_id ORDER BY created_at DESC) AS rn
    FROM public.call_leads
  ) ranked
  WHERE rn > 1
);

-- Step 2: Delete duplicate call_leads (keep the most recent per phone+campaign)
DELETE FROM public.call_leads
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY phone, campaign_id ORDER BY created_at DESC) AS rn
    FROM public.call_leads
  ) ranked
  WHERE rn > 1
);

-- Step 3: Add UNIQUE constraint to prevent future duplicates
ALTER TABLE public.call_leads
ADD CONSTRAINT call_leads_phone_campaign_unique UNIQUE (phone, campaign_id);
