
-- Clean up duplicate active call_logs: keep only the most recent per (lead_id, campaign_id)
DELETE FROM public.call_logs
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY lead_id, campaign_id 
        ORDER BY created_at DESC
      ) AS rn
    FROM public.call_logs
    WHERE call_status IN ('scheduled', 'ready', 'dialing', 'ringing', 'answered', 'in_progress')
      AND lead_id IS NOT NULL
      AND campaign_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);
