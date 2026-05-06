-- Add policies for Superadmins to view all logs regardless of user_id
-- This ensures transparency for platform administrators.

-- 1. Webhook Events
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'webhook_events' AND policyname = 'Superadmin can view all webhook_events'
    ) THEN
        CREATE POLICY "Superadmin can view all webhook_events"
        ON public.webhook_events FOR SELECT TO authenticated
        USING (public.is_superadmin(auth.uid()));
    END IF;
END $$;

-- 2. Group Message Logs (Dispatch Logs)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_message_logs' AND policyname = 'Superadmin can view all group_message_logs'
    ) THEN
        CREATE POLICY "Superadmin can view all group_message_logs"
        ON public.group_message_logs FOR SELECT TO authenticated
        USING (public.is_superadmin(auth.uid()));
    END IF;
END $$;

-- 3. Group Moderation Logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_moderation_logs' AND policyname = 'Superadmin can view all group_moderation_logs'
    ) THEN
        CREATE POLICY "Superadmin can view all group_moderation_logs"
        ON public.group_moderation_logs FOR SELECT TO authenticated
        USING (public.is_superadmin(auth.uid()));
    END IF;
END $$;

-- 4. Ensure API Keys are visible to Superadmin (for naming in logs)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'api_keys' AND policyname = 'Superadmin can view all api_keys'
    ) THEN
        CREATE POLICY "Superadmin can view all api_keys"
        ON public.api_keys FOR SELECT TO authenticated
        USING (public.is_superadmin(auth.uid()));
    END IF;
END $$;
