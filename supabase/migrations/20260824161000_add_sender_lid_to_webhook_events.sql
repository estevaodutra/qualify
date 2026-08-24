-- Migration: 20260824161000_add_sender_lid_to_webhook_events.sql
-- Description: Add sender_lid column to webhook_events for WhatsApp LID support

ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS sender_lid TEXT;
