CREATE TABLE IF NOT EXISTS public.campaign_group_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.group_campaigns(id) ON DELETE CASCADE,
    group_jid TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
    process_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_message TEXT
);

-- Enable RLS
ALTER TABLE public.campaign_group_updates ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all for authenticated users (or standard policies as needed)
CREATE POLICY "Allow all for authenticated on campaign_group_updates"
ON public.campaign_group_updates
FOR ALL
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create cron job to process group updates every minute
SELECT cron.schedule(
  'process-group-updates',
  '* * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://qualify.6ksfuf.easypanel.host/functions/v1/process-group-updates',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := '{}'::jsonb
    );
  $$
);
