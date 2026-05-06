-- Function to cleanup old webhook events
CREATE OR REPLACE FUNCTION public.cleanup_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete events older than 24 hours
    DELETE FROM public.webhook_events
    WHERE received_at < (now() - interval '24 hours');
    
    -- Optional: Even more aggressive cleanup for unknown events (e.g., 6 hours)
    DELETE FROM public.webhook_events
    WHERE event_type = 'unknown' 
    AND received_at < (now() - interval '6 hours');

    -- Cleanup old dispatch logs (group_message_logs) - 72 hours retention
    DELETE FROM public.group_message_logs
    WHERE sent_at < (now() - interval '72 hours');
END;
$$;

-- Immediate cleanup of the 400k+ records to free up space
SELECT public.cleanup_webhook_events();

-- To ensure this runs automatically even without pg_cron, 
-- we can add a trigger to the webhook_events table that runs 
-- the cleanup occasionally (e.g., every 100 inserts)
CREATE OR REPLACE FUNCTION public.trigger_cleanup_occasionally()
RETURNS TRIGGER AS $$
BEGIN
    -- Run cleanup roughly every 100 events to keep it lightweight
    IF (SELECT count(*) % 100 FROM public.webhook_events) = 0 THEN
        PERFORM public.cleanup_webhook_events();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add the trigger
DROP TRIGGER IF EXISTS tr_cleanup_webhooks ON public.webhook_events;
CREATE TRIGGER tr_cleanup_webhooks
AFTER INSERT ON public.webhook_events
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_cleanup_occasionally();
