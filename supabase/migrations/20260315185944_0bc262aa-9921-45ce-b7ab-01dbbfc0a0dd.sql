ALTER TABLE public.pirate_campaigns
  ADD COLUMN capture_link text,
  ADD COLUMN profile_photo_url text,
  ADD COLUMN profile_name text,
  ADD COLUMN profile_description text,
  ADD COLUMN profile_status text,
  ADD COLUMN offer_text text,
  ADD COLUMN payment_link text,
  ADD COLUMN destination_type text NOT NULL DEFAULT 'webhook',
  ADD COLUMN destination_sequence_id uuid,
  ADD COLUMN destination_campaign_id uuid;