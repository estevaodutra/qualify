ALTER TABLE public.instances ADD COLUMN payment_status TEXT DEFAULT NULL;
ALTER TABLE public.instances ADD COLUMN expiration_date TIMESTAMPTZ DEFAULT NULL;