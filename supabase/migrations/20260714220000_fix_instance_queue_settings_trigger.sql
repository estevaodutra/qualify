-- Fix RLS violation when creating instance by running trigger as SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.initialize_instance_queue_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.instance_queue_settings (instance_id, company_id)
    VALUES (NEW.id, NEW.company_id)
    ON CONFLICT (instance_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
