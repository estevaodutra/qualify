-- Migration: Disable automatic lead creation on inbound WhatsApp messages
-- Allows conversations to exist without a registered CRM Lead, storing contact_phone and contact_name instead.

-- 1. Make lead_id nullable and add contact fields to chat_conversations
ALTER TABLE public.chat_conversations 
  ALTER COLUMN lead_id DROP NOT NULL;

ALTER TABLE public.chat_conversations 
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_conversations_contact_phone 
  ON public.chat_conversations(company_id, contact_phone);

-- 2. Update process_webhook_event_for_crm_chat function to NOT create leads automatically
CREATE OR REPLACE FUNCTION public.process_webhook_event_for_crm_chat()
RETURNS TRIGGER AS $$
DECLARE
  v_instance_id UUID;
  v_company_id UUID;
  v_lead_id UUID := NULL;
  v_conv_id UUID;
  v_body TEXT;
  v_media_url TEXT := NULL;
  v_media_type TEXT := NULL;
  v_msg_type TEXT;
  v_direction TEXT;
  v_operator_id UUID := NULL;
  v_phone TEXT;
  v_name TEXT;
BEGIN
  IF NEW.classification != 'identified' THEN
    RETURN NEW;
  END IF;

  -- Ignorar explicitamente eventos de leitura/recebimento
  IF NEW.event_type = 'message_ack' OR NEW.event_type = 'message.ack' OR NEW.event_type = 'message_revoked' THEN
    RETURN NEW;
  END IF;

  IF NEW.direction = 'outbound' THEN
    v_direction := 'outbound';
  ELSIF NEW.direction = 'system' THEN
    v_direction := 'system';
  ELSE
    v_direction := 'inbound';
  END IF;

  IF NEW.instance_id IS NOT NULL THEN
    SELECT id, company_id INTO v_instance_id, v_company_id
    FROM public.instances
    WHERE id = NEW.instance_id;
  END IF;

  IF v_instance_id IS NULL AND NEW.external_instance_id IS NOT NULL THEN
    SELECT id, company_id INTO v_instance_id, v_company_id
    FROM public.instances
    WHERE external_instance_id = NEW.external_instance_id
    LIMIT 1;
  END IF;

  IF v_instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.chat_jid LIKE '%@g.us' OR NEW.chat_jid LIKE '%-group' OR NEW.chat_type = 'group' THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_phone IS NULL AND NEW.chat_jid IS NULL THEN
    RETURN NEW;
  END IF;

  v_phone := COALESCE(NEW.sender_phone, NEW.chat_jid);
  v_name := COALESCE(NEW.sender_name, v_phone);

  -- Lookup if lead already exists in CRM (DO NOT CREATE AUTOMATICALLY)
  SELECT id INTO v_lead_id
  FROM public.leads
  WHERE company_id = v_company_id
    AND phone = v_phone
  LIMIT 1;

  -- Locate or Insert Conversation
  SELECT id INTO v_conv_id
  FROM public.chat_conversations
  WHERE company_id = v_company_id
    AND instance_id = v_instance_id
    AND (
      (v_lead_id IS NOT NULL AND lead_id = v_lead_id) OR
      (v_lead_id IS NULL AND (contact_phone = v_phone OR (lead_id IS NULL AND contact_phone IS NULL)))
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.chat_conversations (
      company_id,
      lead_id,
      instance_id,
      contact_phone,
      contact_name,
      status,
      last_message_at,
      created_at,
      updated_at
    )
    VALUES (
      v_company_id,
      v_lead_id,
      v_instance_id,
      v_phone,
      v_name,
      'open',
      COALESCE(NEW.event_timestamp, NEW.received_at),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_conv_id;
  ELSE
    -- If conversation exists and now has a lead associated, ensure contact info is synced
    UPDATE public.chat_conversations
    SET 
      contact_phone = COALESCE(contact_phone, v_phone),
      contact_name = COALESCE(contact_name, v_name),
      lead_id = COALESCE(lead_id, v_lead_id)
    WHERE id = v_conv_id;
  END IF;

  v_msg_type := SPLIT_PART(NEW.event_type, '_', 1);
  
  v_body := COALESCE(
    NEW.raw_event->'body'->'payload'->>'body',
    NEW.raw_event->'payload'->>'body',
    NEW.raw_event->'body'->'text'->>'message',
    NEW.raw_event->'body'->>'message',
    NEW.raw_event->'body'->>'caption',
    NEW.raw_event->'body'->>'text',
    NEW.raw_event->>'text',
    NEW.raw_event->>'body'
  );

  IF v_msg_type IN ('image', 'video', 'audio', 'document', 'sticker') THEN
    v_media_url := COALESCE(
      NEW.raw_event->'body'->>'imageUrl',
      NEW.raw_event->'body'->>'videoUrl',
      NEW.raw_event->'body'->>'audioUrl',
      NEW.raw_event->'body'->>'documentUrl',
      NEW.raw_event->'body'->>'mediaUrl',
      NEW.raw_event->>'mediaUrl'
    );
    v_media_type := v_msg_type;
  END IF;

  IF v_direction = 'outbound' THEN
    SELECT operator_id INTO v_operator_id
    FROM public.chat_conversations
    WHERE id = v_conv_id;
  END IF;

  INSERT INTO public.chat_messages (
    company_id,
    conversation_id,
    sender_type,
    sender_name,
    message_type,
    body,
    media_url,
    media_type,
    created_at
  )
  VALUES (
    v_company_id,
    v_conv_id,
    CASE WHEN v_direction = 'inbound' THEN 'lead' ELSE 'operator' END,
    CASE 
      WHEN v_direction = 'inbound' THEN COALESCE(NEW.sender_name, NEW.sender_phone, 'Contato')
      ELSE 'Atendente'
    END,
    COALESCE(v_media_type, 'text'),
    COALESCE(v_body, ''),
    v_media_url,
    v_media_type,
    COALESCE(NEW.event_timestamp, NEW.received_at)
  );

  -- Atualizar a conversa (last_message_at, preview, unread_count, etc.)
  UPDATE public.chat_conversations
  SET 
    last_message_at = COALESCE(NEW.event_timestamp, NEW.received_at),
    last_message_preview = COALESCE(v_body, CASE WHEN v_media_type IS NOT NULL THEN '[' || v_media_type || ']' ELSE '' END),
    unread_count = CASE WHEN v_direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
    is_archived = CASE WHEN v_direction = 'inbound' THEN false ELSE is_archived END,
    updated_at = NOW()
  WHERE id = v_conv_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
