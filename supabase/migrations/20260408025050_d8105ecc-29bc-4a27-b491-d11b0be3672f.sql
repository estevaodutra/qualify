
-- Step 1: Remove duplicates, keeping the oldest record per (group_campaign_id, phone)
DELETE FROM public.group_members
WHERE id NOT IN (
  SELECT DISTINCT ON (group_campaign_id, phone) id
  FROM public.group_members
  ORDER BY group_campaign_id, phone, joined_at ASC NULLS LAST, id ASC
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE public.group_members
ADD CONSTRAINT group_members_campaign_phone_unique UNIQUE (group_campaign_id, phone);
