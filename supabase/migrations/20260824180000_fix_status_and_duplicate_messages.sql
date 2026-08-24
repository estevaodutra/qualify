-- Migration: 20260824180000_fix_status_and_duplicate_messages.sql
-- Description: Update process_webhook_event_for_crm_chat to properly handle status events and prevent duplicates

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
  v_status_val TEXT;
BEGIN
  IF NEW.classification != 'identified' THEN
    RETURN NEW;
  END IF;

  -- 1. Se for evento de status de mensagem (delivered, read, sent, ack, failed, revoked, etc.), apenas atualizar a mensagem existente e NÃO criar nova mensagem!
  IF NEW.event_type IN (
    'message.delivered', 'message.read', 'message.sent', 'message.ack', 'message.status', 'message.poll_update',
    'message_delivered', 'message_read', 'message_sent', 'message_ack', 'message_status', 'message_revoked',
    'DeliveryCallback', 'ReadCallback', 'ConnectedCallback', 'DisconnectedCallback'
  ) OR NEW.event_subtype IN ('delivered', 'read', 'sent', 'ack', 'failed', 'status', 'revoked') THEN
    
    -- Determina o status correto
    IF NEW.event_type = 'message.read' OR NEW.event_subtype = 'read' OR NEW.event_type = 'ReadCallback' THEN
      v_status_val := 'read';
    ELSIF NEW.event_type = 'message.delivered' OR NEW.event_subtype = 'delivered' OR NEW.event_type = 'DeliveryCallback' THEN
      v_status_val := 'delivered';
    ELSIF NEW.event_type = 'message.sent' OR NEW.event_subtype = 'sent' THEN
      v_status_val := 'sent';
    ELSIF NEW.event_subtype = 'failed' OR NEW.event_subtype = 'error' THEN
      v_status_val := 'failed';
    ELSIF NEW.event_type = 'message_revoked' OR NEW.event_subtype = 'revoked' THEN
      v_status_val := 'revoked';
    ELSE
      v_status_val := COALESCE(NEW.raw_event->>'status', 'delivered');
    END IF;

    -- Atualiza status da mensagem existente se tiver message_id
    IF NEW.message_id IS NOT NULL THEN
      UPDATE public.chat_messages
      SET status = v_status_val
      WHERE message_id = NEW.message_id
         OR zaap_id = NEW.message_id
         OR message_id LIKE '%' || NEW.message_id;
    END IF;
    
    RETURN NEW;
  END IF;

  -- 2. Deduplicação estrita: se a mensagem já existe no chat_messages com o mesmo message_id, NÃO duplica!
  IF NEW.message_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.chat_messages 
    WHERE message_id = NEW.message_id
  ) THEN
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
  v_phone := REGEXP_REPLACE(v_phone, '[^0-9]', '', 'g');
  
  IF v_phone = '' THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(NEW.sender_name, NEW.chat_name, v_phone);

  -- Strictly lookup lead without auto-creating
  SELECT id INTO v_lead_id
  FROM public.leads
  WHERE company_id = v_company_id
    AND (
      phone = v_phone 
      OR phone LIKE '%' || RIGHT(v_phone, 8)
      OR (NEW.sender_lid IS NOT NULL AND lid = NEW.sender_lid)
    )
  ORDER BY created_at DESC
  LIMIT 1;

  -- Locate existing conversation strictly
  IF v_lead_id IS NOT NULL THEN
    SELECT id INTO v_conv_id
    FROM public.chat_conversations
    WHERE company_id = v_company_id
      AND instance_id = v_instance_id
      AND lead_id = v_lead_id
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    SELECT id INTO v_conv_id
    FROM public.chat_conversations
    WHERE company_id = v_company_id
      AND instance_id = v_instance_id
      AND lead_id IS NULL
      AND contact_phone = v_phone
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

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
    -- If conversation exists, sync contact info
    UPDATE public.chat_conversations
    SET 
      contact_phone = COALESCE(contact_phone, v_phone),
      contact_name = COALESCE(contact_name, v_name),
      lead_id = COALESCE(lead_id, v_lead_id)
    WHERE id = v_conv_id;
  END IF;

  v_msg_type := SPLIT_PART(NEW.event_type, '_', 1);
  
  v_body := COALESCE(
    NEW.raw_event->>'caption',
    NEW.raw_event->'body'->>'caption',
    NEW.raw_event->'body'->'payload'->>'body',
    NEW.raw_event->'payload'->>'body',
    NEW.raw_event->'body'->'text'->>'message',
    NEW.raw_event->'body'->>'message',
    NEW.raw_event->'body'->>'text',
    NEW.raw_event->>'text',
    NEW.raw_event->>'body'
  );

  IF v_msg_type IN ('image', 'video', 'audio', 'document', 'sticker', 'voice', 'video-note', 'video_note', 'ptv') THEN
    v_media_url := COALESCE(
      NEW.raw_event->>'media_url',
      NEW.raw_event->>'mediaUrl',
      NEW.raw_event->>'url',
      NEW.raw_event->>'imageUrl',
      NEW.raw_event->>'image_url',
      NEW.raw_event->>'audioUrl',
      NEW.raw_event->>'audio_url',
      NEW.raw_event->>'videoUrl',
      NEW.raw_event->>'video_url',
      NEW.raw_event->>'documentUrl',
      NEW.raw_event->>'document_url',
      NEW.raw_event->>'file_url',
      NEW.raw_event->>'fileUrl',
      NEW.raw_event->>'stickerUrl',
      NEW.raw_event->>'sticker_url',
      NEW.raw_event->'body'->>'mediaUrl',
      NEW.raw_event->'body'->>'media_url',
      NEW.raw_event->'body'->>'url',
      NEW.raw_event->'body'->>'imageUrl',
      NEW.raw_event->'body'->>'videoUrl',
      NEW.raw_event->'body'->>'audioUrl',
      NEW.raw_event->'body'->>'documentUrl'
    );
    v_media_type := CASE 
      WHEN v_msg_type IN ('audio', 'voice') THEN 'audio'
      WHEN v_msg_type IN ('video', 'video-note', 'video_note', 'ptv') THEN 'video'
      ELSE v_msg_type 
    END;
  END IF;

  IF v_body IS NULL AND v_media_type IS NOT NULL THEN
    v_body := '[' || v_media_type || ']';
  END IF;
  
  IF v_body IS NULL THEN
    v_body := '[Mensagem do WhatsApp]';
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
    sender_id,
    message_type,
    body,
    media_url,
    media_type,
    status,
    message_id,
    created_at
  )
  VALUES (
    v_company_id,
    v_conv_id,
    CASE WHEN v_direction = 'inbound' THEN 'lead' ELSE 'operator' END,
    CASE WHEN v_direction = 'outbound' THEN v_operator_id ELSE NULL END,
    COALESCE(v_media_type, 'text'),
    COALESCE(v_body, ''),
    v_media_url,
    v_media_type,
    CASE WHEN v_direction = 'inbound' THEN 'received' ELSE 'sent' END,
    NEW.message_id,
    COALESCE(NEW.event_timestamp, NEW.received_at)
  );

  -- Atualizar a conversa (last_message_at, preview, unread_count, is_archived, etc.)
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

-- Limpar mensagens duplicadas criadas indevidamente por eventos de status
DELETE FROM public.chat_messages
WHERE id IN (
  '17f4c471-643f-49d5-b9f2-af6dc8c98b4a',
  '1eaa66be-94b2-4718-bc49-dfe5a065059c'
);
