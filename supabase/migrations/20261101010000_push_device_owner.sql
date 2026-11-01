-- A browser endpoint must belong to only one active user at a time.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY endpoint ORDER BY updated_at DESC, id DESC) AS position
  FROM public.push_subscriptions
  WHERE revoked_at IS NULL
)
UPDATE public.push_subscriptions AS subscription
SET revoked_at = now()
FROM ranked
WHERE subscription.id = ranked.id AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_one_active_endpoint
ON public.push_subscriptions (endpoint) WHERE revoked_at IS NULL;

CREATE OR REPLACE FUNCTION public.revoke_previous_push_device_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.push_subscriptions
  SET revoked_at = now()
  WHERE endpoint = NEW.endpoint AND user_id <> NEW.user_id AND revoked_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_device_owner_on_insert ON public.push_subscriptions;
CREATE TRIGGER push_device_owner_on_insert
BEFORE INSERT ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.revoke_previous_push_device_owner();
