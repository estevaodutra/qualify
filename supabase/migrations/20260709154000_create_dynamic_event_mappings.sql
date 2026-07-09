CREATE TABLE public.dynamic_event_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source TEXT NOT NULL,
    event_subtype TEXT NOT NULL,
    mapped_type TEXT NOT NULL,
    is_ai_generated BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending_approval', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(source, event_subtype)
);

ALTER TABLE public.dynamic_event_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON public.dynamic_event_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all access for superadmins" ON public.dynamic_event_mappings FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'superadmin')
);
