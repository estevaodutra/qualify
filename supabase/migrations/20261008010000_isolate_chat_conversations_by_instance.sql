-- Migration: 20261008010000_isolate_chat_conversations_by_instance.sql
-- Description: Ensure chat_conversations are strictly isolated by instance_id so that different WhatsApp instances never mix their message histories for the same lead.

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
  v_target_msg_id TEXT;
  v_reaction_val TEXT;
BEGIN
  IF NEW.classification != 'identified' THEN
    RETURN NEW;
  END IF;

  -- 1. Se for evento de REAÇÃO a mensagem: atualiza campo reaction na mensagem existente e NÃO cria nova mensagem!
  IF NEW.event_type IN ('message.reaction', 'message_reaction', 'reaction', 'reaction_inbound') OR NEW.event_subtype = 'reaction' THEN
    v_target_msg_id := COALESCE(
      NEW.raw_event->>'target_message_id',
      NEW.raw_event->>'targetMessageId',
      NEW.raw_event->'reaction'->>'messageId',
      NEW.raw_event->'reaction'->>'target_message_id',
      NEW.raw_event->>'message_id'
    );
    v_reaction_val := COALESCE(
      NEW.raw_event->>'reaction',
      NEW.raw_event->'reaction'->>'text',
      NEW.raw_event->'reaction'->>'emoji',
      NEW.raw_event->>'emoji',
      NEW.raw_event->>'text'
    );

    IF v_target_msg_id IS NOT NULL THEN
      UPDATE public.chat_messages
      SET 
        reaction = v_reaction_val,
        updated_at = NOW()
      WHERE message_id = v_target_msg_id;
    END IF;

    RETURN NEW;
  END IF;

  -- 2. Se for evento de STATUS (delivered, read, failed, sent, ack):
  -- Atualiza o status da mensagem no chat_messages e NÃO insere nova mensagem!
  IF NEW.event_type IN ('message.status', 'message_status', 'status', 'delivered', 'read', 'ack') 
     OR NEW.event_subtype IN ('status', 'delivered', 'read', 'sent', 'failed', 'ack') THEN

    v_target_msg_id := COALESCE(
      NEW.raw_event->>'message_id',
      NEW.raw_event->>'messageId',
      NEW.raw_event->>'id',
      NEW.message_id
    );

    v_status_val := COALESCE(
      NEW.raw_event->>'status',
      NEW.event_subtype,
      NEW.event_type
    );

    IF v_status_val IN ('delivered', 'DELIVERY_ACK') THEN
      v_status_val := 'delivered';
    ELSIF v_status_val IN ('read', 'READ_ACK', 'played') THEN
      v_status_val := 'read';
    ELSIF v_status_val IN ('sent', 'SERVER_ACK') THEN
      v_status_val := 'sent';
    ELSIF v_status_val IN ('failed', 'ERROR') THEN
      v_status_val := 'failed';
    ELSE
      v_status_val := 'sent';
    END IF;

    IF v_target_msg_id IS NOT NULL THEN
      UPDATE public.chat_messages
      SET 
        status = v_status_val,
        updated_at = NOW()
      WHERE message_id = v_target_msg_id;
    END IF;

    RETURN NEW;
  END IF;

  -- Extrai dados de mídia e mensagem
  v_body := COALESCE(
    NEW.raw_event->>'body',
    NEW.raw_event->'text'->>'message',
    NEW.raw_event->>'text',
    NEW.raw_event->'message'->>'conversation',
    NEW.raw_event->'message'->'extendedTextMessage'->>'text',
    NEW.raw_event->>'caption',
    NEW.raw_event->'image'->>'caption',
    NEW.raw_event->'video'->>'caption',
    NEW.raw_event->'document'->>'caption',
    ''
  );

  v_media_url := COALESCE(
    NEW.raw_event->>'media_url',
    NEW.raw_event->>'mediaUrl',
    NEW.raw_event->>'imageUrl',
    NEW.raw_event->>'image_url',
    NEW.raw_event->>'audioUrl',
    NEW.raw_event->>'audio_url',
    NEW.raw_event->>'videoUrl',
    NEW.raw_event->>'video_url',
    NEW.raw_event->>'documentUrl',
    NEW.raw_event->>'document_url',
    NEW.raw_event->>'stickerUrl',
    NEW.raw_event->>'sticker_url',
    NEW.raw_event->>'file_url',
    NEW.raw_event->>'url',
    NEW.raw_event->'image'->>'url',
    NEW.raw_event->'video'->>'url',
    NEW.raw_event->'audio'->>'url',
    NEW.raw_event->'document'->>'url',
    NEW.raw_event->'sticker'->>'url'
  );

  v_media_type := COALESCE(
    NEW.raw_event->>'media_type',
    NEW.raw_event->>'mediaType',
    CASE 
      WHEN NEW.event_subtype IN ('image', 'audio', 'video', 'document', 'sticker', 'voice') THEN NEW.event_subtype
      WHEN NEW.event_type IN ('image_message', 'image') THEN 'image'
      WHEN NEW.event_type IN ('audio_message', 'audio', 'voice') THEN 'audio'
      WHEN NEW.event_type IN ('video_message', 'video') THEN 'video'
      WHEN NEW.event_type IN ('document_message', 'document') THEN 'document'
      WHEN NEW.event_type IN ('sticker_message', 'sticker') THEN 'sticker'
      WHEN v_media_url IS NOT NULL THEN 'image'
      ELSE NULL
    END
  );

  -- 3. Deduplicação estrita com enriquecimento de mídia:
  -- Se a mensagem já existe no chat_messages com o mesmo message_id, atualiza mídia se estiver faltando e não duplica!
  IF NEW.message_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.chat_messages 
    WHERE message_id = NEW.message_id
  ) THEN
    IF v_media_url IS NOT NULL OR v_media_type IS NOT NULL THEN
      UPDATE public.chat_messages
      SET 
        media_url = COALESCE(chat_messages.media_url, v_media_url),
        media_type = COALESCE(chat_messages.media_type, v_media_type),
        message_type = CASE 
          WHEN (chat_messages.message_type = 'text' OR chat_messages.message_type IS NULL) AND v_media_type IS NOT NULL THEN v_media_type 
          ELSE chat_messages.message_type 
        END,
        body = CASE 
          WHEN NULLIF(TRIM(chat_messages.body), '') IS NULL AND NULLIF(TRIM(v_body), '') IS NOT NULL THEN v_body 
          ELSE chat_messages.body 
        END
      WHERE message_id = NEW.message_id;
    END IF;

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
  v_phone := REGEXP_REPLACE(v_phone, '@.*$', '');
  v_phone := REGEXP_REPLACE(v_phone, '\D', '', 'g');

  IF LENGTH(v_phone) < 8 THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(
    NEW.raw_event->>'sender_name',
    NEW.raw_event->>'from_name',
    NEW.sender_name,
    v_phone
  );

  SELECT id INTO v_lead_id
  FROM public.leads
  WHERE company_id = v_company_id
    AND REGEXP_REPLACE(phone, '\D', '', 'g') = v_phone
  ORDER BY created_at DESC
  LIMIT 1;

  -- ISOLAMENTO ESTRITO POR INSTÂNCIA:
  -- A conversa deve pertencer especificamente à instância que recebeu/enviou a mensagem
  SELECT id INTO v_conv_id
  FROM public.chat_conversations
  WHERE company_id = v_company_id
    AND instance_id = v_instance_id
    AND (
      (v_lead_id IS NOT NULL AND lead_id = v_lead_id)
      OR
      REGEXP_REPLACE(contact_phone, '\D', '', 'g') = v_phone
    )
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.chat_conversations (
      company_id,
      instance_id,
      lead_id,
      contact_phone,
      contact_name,
      status,
      last_message_at,
      unread_count
    )
    VALUES (
      v_company_id,
      v_instance_id,
      v_lead_id,
      v_phone,
      v_name,
      'open',
      COALESCE(NEW.event_timestamp, NEW.received_at),
      0
    )
    RETURNING id INTO v_conv_id;
  ELSE
    UPDATE public.chat_conversations
    SET
      instance_id = v_instance_id,
      contact_name = COALESCE(contact_name, v_name),
      lead_id = COALESCE(lead_id, v_lead_id)
    WHERE id = v_conv_id;
  END IF;

  -- Se for mídia e o corpo for nulo ou igual ao placeholder da mídia, limpa o corpo
  IF v_media_type IS NOT NULL AND (
    v_body IS NULL OR 
    v_body = '[' || v_media_type || ']' OR 
    v_body = '[' || v_msg_type || ']' OR
    v_body = '[Mensagem do WhatsApp]'
  ) THEN
    v_body := '';
  END IF;

  -- 4. Inserir mensagem no chat_messages
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

  UPDATE public.chat_conversations
  SET 
    last_message_at = COALESCE(NEW.event_timestamp, NEW.received_at),
    last_message_preview = CASE 
      WHEN NULLIF(TRIM(v_body), '') IS NOT NULL THEN v_body
      WHEN v_media_type IS NOT NULL THEN '[' || v_media_type || ']'
      ELSE '[Mensagem]'
    END,
    unread_count = CASE WHEN v_direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
    is_archived = CASE WHEN v_direction = 'inbound' THEN false ELSE is_archived END,
    updated_at = NOW()
  WHERE id = v_conv_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
