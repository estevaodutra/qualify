-- 1. Add company_id column to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. Populate company_id for existing messages
UPDATE public.chat_messages m
SET company_id = c.company_id
FROM public.chat_conversations c
WHERE m.conversation_id = c.id
  AND m.company_id IS NULL;

-- 3. Replace RLS policy with simplified one for Realtime optimization
DROP POLICY IF EXISTS "Company members can manage chat messages" ON public.chat_messages;

CREATE POLICY "Company members can manage chat messages" ON public.chat_messages
  FOR ALL TO authenticated USING (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    )
  ) WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_members WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 4. Update the trigger function to insert company_id
CREATE OR REPLACE FUNCTION public.process_webhook_event_for_crm_chat()
RETURNS TRIGGER AS $$
DECLARE
  v_conv_id UUID;
  v_lead_id UUID;
  v_body TEXT;
  v_media_url TEXT;
  v_media_type TEXT;
  v_msg_type TEXT;
  v_direction TEXT;
  v_sender_type TEXT;
  v_sender_id UUID;
  v_is_group BOOLEAN;
  v_company_id UUID;
BEGIN
  IF NEW.chat_jid IS NULL OR NEW.instance_id IS NULL OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_is_group := NEW.chat_jid LIKE '%@g.us' OR NEW.chat_jid LIKE '%-group';
  -- For CRM, ignore groups
  IF v_is_group THEN
    RETURN NEW;
  END IF;

  -- Verify it is a valid message event
  IF NOT (NEW.event_type IN (
    'text_message', 'image_message', 'video_message', 'audio_message', 
    'document_message', 'sticker_message', 'location_message', 'contact_message',
    'button_response', 'list_response'
  )) THEN
    RETURN NEW;
  END IF;

  -- Determine direction and sender type
  v_direction := COALESCE(
    NEW.raw_event->>'direction',
    CASE 
      WHEN (NEW.raw_event->'body'->>'fromMe')::boolean = true THEN 'outbound'
      WHEN (NEW.raw_event->>'fromMe')::boolean = true THEN 'outbound'
      ELSE 'inbound'
    END,
    'inbound'
  );

  IF v_direction = 'outbound' THEN
    v_sender_type := 'operator';
    v_sender_id := NEW.user_id;
  ELSE
    v_sender_type := 'lead';
  END IF;

  -- Resolve Company ID
  SELECT id INTO v_company_id FROM public.companies WHERE owner_id = NEW.user_id LIMIT 1;
  IF v_company_id IS NULL THEN
    -- Fallback: find any company the user belongs to
    SELECT company_id INTO v_company_id FROM public.company_members WHERE user_id = NEW.user_id AND is_active = true LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN NEW; -- No company to associate with
  END IF;

  -- Find or create Lead
  INSERT INTO public.leads (user_id, company_id, phone, name, status)
  VALUES (
    NEW.user_id,
    v_company_id,
    NEW.sender_phone,
    COALESCE(NEW.sender_name, NEW.sender_phone),
    'active'
  )
  ON CONFLICT (user_id, phone) DO UPDATE SET phone = EXCLUDED.phone
  RETURNING id INTO v_lead_id;

  -- Find or create Conversation
  SELECT id INTO v_conv_id
  FROM public.chat_conversations
  WHERE company_id = v_company_id
    AND lead_id = v_lead_id
    AND instance_id = NEW.instance_id;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.chat_conversations (
      company_id,
      lead_id,
      instance_id,
      status,
      last_message_at
    )
    VALUES (
      v_company_id,
      v_lead_id,
      NEW.instance_id,
      'open',
      COALESCE(NEW.event_timestamp, NEW.received_at)
    )
    ON CONFLICT DO NOTHING;
    
    -- Retrieve again in case of race condition during conversation creation
    SELECT id INTO v_conv_id
    FROM public.chat_conversations
    WHERE company_id = v_company_id
      AND lead_id = v_lead_id
      AND instance_id = NEW.instance_id;
  END IF;

  -- Extract message details
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

  v_media_url := COALESCE(
    NEW.raw_event->'body'->>'imageUrl',
    NEW.raw_event->'body'->>'videoUrl',
    NEW.raw_event->'body'->>'audioUrl',
    NEW.raw_event->'body'->>'documentUrl',
    NEW.raw_event->'body'->>'stickerUrl',
    NEW.raw_event->'body'->>'url'
  );

  v_media_type := NEW.raw_event->'body'->>'mimeType';

  -- Deduplicate messages if message_id matches
  IF EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE conversation_id = v_conv_id
      AND (message_id = NEW.message_id OR zaap_id = NEW.message_id)
  ) THEN
    RETURN NEW;
  END IF;

  -- Deduplicate operator sent messages that were already inserted optimistically by the API
  IF v_direction = 'outbound' AND EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE conversation_id = v_conv_id
      AND sender_type = 'operator'
      AND (body = v_body OR (body IS NULL AND v_body IS NULL))
      AND created_at >= NEW.received_at - INTERVAL '15 seconds'
      AND created_at <= NEW.received_at + INTERVAL '15 seconds'
  ) THEN
    UPDATE public.chat_messages
    SET message_id = NEW.message_id, zaap_id = NEW.message_id
    WHERE id = (
      SELECT id FROM public.chat_messages
      WHERE conversation_id = v_conv_id
        AND sender_type = 'operator'
        AND (body = v_body OR (body IS NULL AND v_body IS NULL))
        AND created_at >= NEW.received_at - INTERVAL '15 seconds'
        AND created_at <= NEW.received_at + INTERVAL '15 seconds'
      LIMIT 1
    );
    RETURN NEW;
  END IF;

  -- Insert message WITH company_id
  INSERT INTO public.chat_messages (
    company_id,
    conversation_id,
    sender_type,
    sender_id,
    message_type,
    body,
    media_url,
    media_type,
    status,
    zaap_id,
    message_id,
    created_at
  )
  VALUES (
    v_company_id,
    v_conv_id,
    v_sender_type,
    CASE WHEN v_sender_type = 'lead' THEN v_lead_id ELSE v_sender_id END,
    v_msg_type,
    v_body,
    v_media_url,
    v_media_type,
    'read',
    NEW.message_id,
    NEW.message_id,
    COALESCE(NEW.event_timestamp, NEW.received_at)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
