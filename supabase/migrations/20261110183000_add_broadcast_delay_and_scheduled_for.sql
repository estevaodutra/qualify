-- Migration: Add delay and scheduled_for for broadcast anti-ban cadence
-- Permite configurar intervalo aleatório (delay mínimo e máximo) e agenda cada lead 1 a 1

ALTER TABLE public.broadcast_campaigns 
  ADD COLUMN IF NOT EXISTS min_delay_seconds INTEGER NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS max_delay_seconds INTEGER NOT NULL DEFAULT 300;

ALTER TABLE public.broadcast_recipients
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_scheduled_for 
  ON public.broadcast_recipients(status, scheduled_for);
