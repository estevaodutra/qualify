-- Create phone_numbers table
CREATE TABLE public.phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  instance_id UUID REFERENCES public.instances(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'whatsapp_normal',
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'warming',
  health INTEGER NOT NULL DEFAULT 50,
  cycle_used INTEGER NOT NULL DEFAULT 0,
  cycle_total INTEGER NOT NULL DEFAULT 100,
  last_used_at TIMESTAMP WITH TIME ZONE,
  connected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX idx_phone_numbers_number ON public.phone_numbers(number);
CREATE INDEX idx_phone_numbers_user_id ON public.phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_instance_id ON public.phone_numbers(instance_id);

-- Enable RLS
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own phone_numbers" 
ON public.phone_numbers 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create own phone_numbers" 
ON public.phone_numbers 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own phone_numbers" 
ON public.phone_numbers 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own phone_numbers" 
ON public.phone_numbers 
FOR DELETE 
USING (user_id = auth.uid());