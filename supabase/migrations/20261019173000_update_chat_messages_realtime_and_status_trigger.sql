-- Migration: 20261019173000_update_chat_messages_realtime_and_status_trigger.sql
-- Description: Set replica identity full for reliable Realtime UPDATE events,
-- and enhance status update handling in process_webhook_event_for_crm_chat to capture failure reasons.

-- 1. Ensure REPLICA IDENTITY FULL for Realtime updates
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;

-- 2. Update trigger function on webhook_events
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
  v_error_reason TEXT := NULL;
BEGIN
  IF NEW.classification != 'identified' THEN
    RETURN NEW;
  END IF;

  -- 0. Ignora eventos que NÃO são mensagens de chat
  -- (entrada/saída de grupos, participantes, status de presença, atualizações de grupo, etc.)
  IF NEW.event_type IN ('group_join', 'group_leave', 'group_participants', 'group_update', 'group_settings', 'group.participant.add', 'group.participant.remove', 'presence', 'presence.update', 'chat.update') 
     OR NEW.event_subtype IN ('group_join', 'group_leave', 'join', 'leave') 
     OR (NEW.direction = 'system' AND NEW.event_type NOT IN ('system_message', 'message')) THEN
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
      WHERE message_id = v_target_msg_id
         OR zaap_id = v_target_msg_id
         OR message_id LIKE '%' || v_target_msg_id
         OR v_target_msg_id LIKE '%' || message_id;
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
      NEW.raw_event->>'action',
      NEW.event_subtype,
      NEW.event_type
    );

    IF v_status_val ILIKE '%read%' OR v_status_val IN ('read', 'READ_ACK', 'played') THEN
      v_status_val := 'read';
    ELSIF v_status_val ILIKE '%delivered%' OR v_status_val IN ('delivered', 'DELIVERY_ACK') THEN
      v_status_val := 'delivered';
    ELSIF v_status_val ILIKE '%sent%' OR v_status_val IN ('sent', 'SERVER_ACK') THEN
      v_status_val := 'sent';
    ELSIF v_status_val ILIKE '%failed%' OR v_status_val ILIKE '%error%' THEN
      v_status_val := 'failed';
    ELSE
      v_status_val := 'sent';
    END IF;

    IF v_status_val = 'failed' THEN
      v_error_reason := COALESCE(
        NEW.raw_event->>'error',
        NEW.raw_event->>'reason',
        NEW.raw_event->>'description',
        NEW.raw_event->>'message',
        NEW.processing_error
      );
    END IF;

    IF v_target_msg_id IS NOT NULL THEN
      UPDATE public.chat_messages
      SET 
        status = v_status_val,
        error_message = CASE 
          WHEN v_status_val = 'failed' AND v_error_reason IS NOT NULL THEN v_error_reason
          ELSE chat_messages.error_message
        END,
        updated_at = NOW()
      WHERE message_id = v_target_msg_id
         OR zaap_id = v_target_msg_id
         OR message_id LIKE '%' || v_target_msg_id
         OR v_target_msg_id LIKE '%' || message_id;
    END IF;

    RETURN NEW;
  END IF;

  -- Extrai dados de mídia e mensagem
  v_body := COALESCE(
    NEW.raw_event->>'text',
    NEW.raw_event->>'body',
    NEW.raw_event->>'message',
    NEW.raw_event->>'caption',
    NEW.raw_event->'message'->>'conversation',
    NEW.raw_event->'message'->'extendedTextMessage'->>'text',
    NEW.raw_event->'message'->'imageMessage'->>'caption',
    NEW.raw_event->'message'->'videoMessage'->>'caption',
    NEW.raw_event->'message'->'documentMessage'->>'caption',
    NEW.raw_event->'body'->>'text',
    NEW.raw_event->'body'->>'caption',
    NEW.raw_event->'body'->>'message',
    NEW.raw_event->'message'->>'text'
  );

  v_media_url := COALESCE(
    NEW.raw_event->>'media_url',
    NEW.raw_event->>'mediaUrl',
    NEW.raw_event->>'url',
    NEW.raw_event->>'image',
    NEW.raw_event->>'audio',
    NEW.raw_event->>'video',
    NEW.raw_event->>'document',
    NEW.raw_event->>'file_url',
    NEW.raw_event->>'fileUrl',
    NEW.raw_event->>'stickerUrl',
    NEW.raw_event->>'sticker_url',
    NEW.raw_event->>'link',
    NEW.raw_event->'body'->>'mediaUrl',
    NEW.raw_event->'body'->>'media_url',
    NEW.raw_event->'body'->>'url',
    NEW.raw_event->'body'->>'imageUrl',
    NEW.raw_event->'body'->>'audioUrl',
    NEW.raw_event->'body'->>'videoUrl',
    NEW.raw_event->'body'->>'documentUrl',
    NEW.raw_event->'media'->>'url',
    NEW.raw_event->'file'->>'url'
  );

  v_media_type := COALESCE(
    NEW.raw_event->>'media_type',
    NEW.raw_event->>'mediaType',
    NEW.raw_event->>'mimetype',
    NEW.raw_event->>'mime_type',
    NEW.raw_event->>'contentType',
    CASE
      WHEN NEW.event_type IN ('image_message', 'image') THEN 'image'
      WHEN NEW.event_type IN ('audio_message', 'audio', 'voice') THEN 'audio'
      WHEN NEW.event_type IN ('video_message', 'video') THEN 'video'
      WHEN NEW.event_type IN ('document_message', 'document') THEN 'document'
      WHEN NEW.event_type IN ('sticker_message', 'sticker') THEN 'sticker'
      WHEN v_media_url IS NOT NULL THEN 'image'
      ELSE NULL
    END
  );

  -- 3. Proteção absoluta contra mensagens vazias (sem texto e sem mídia)
  IF (v_body IS NULL OR TRIM(v_body) = '') AND v_media_url IS NULL AND NEW.event_type NOT IN ('location', 'location_message', 'contact_message') THEN
    RETURN NEW;
  END IF;

  -- 4. Deduplicação estrita com enriquecimento de mídia:
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
        END,
        updated_at = NOW()
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
    v_instance_id := NEW.instance_id;
    SELECT company_id INTO v_company_id FROM public.instances WHERE id = v_instance_id LIMIT 1;
  ELSE
    SELECT id, company_id INTO v_instance_id, v_company_id
    FROM public.instances
    WHERE external_instance_id = NEW.external_instance_id
    LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_phone := COALESCE(
    NEW.sender_phone, 
    REGEXP_REPLACE(SPLIT_PART(NEW.chat_jid, '@', 1), '\D', '', 'g')
  );

  v_name := COALESCE(
    NEW.sender_name,
    NEW.chat_name,
    NEW.raw_event->>'senderName',
    NEW.raw_event->>'pushName',
    v_phone
  );

  IF v_phone IS NOT NULL AND LENGTH(v_phone) >= 8 THEN
    SELECT id INTO v_lead_id 
    FROM public.leads 
    WHERE (company_id = v_company_id OR company_id IS NULL)
      AND (
        phone = v_phone 
        OR phone LIKE '%' || RIGHT(v_phone, 8)
        OR RIGHT(phone, 8) = RIGHT(v_phone, 8)
      )
    ORDER BY (company_id = v_company_id) DESC, created_at DESC
    LIMIT 1;
  END IF;

  -- Localizar conversa isolada ESTRITAMENTE por (company_id, instance_id)
  IF v_instance_id IS NOT NULL THEN
    IF v_lead_id IS NOT NULL THEN
      SELECT id INTO v_conv_id
      FROM public.chat_conversations
      WHERE company_id = v_company_id
        AND instance_id = v_instance_id
        AND lead_id = v_lead_id
      ORDER BY updated_at DESC
      LIMIT 1;
    END IF;

    IF v_conv_id IS NULL AND v_phone IS NOT NULL AND LENGTH(v_phone) >= 8 THEN
      SELECT c.id INTO v_conv_id
      FROM public.chat_conversations c
      JOIN public.leads l ON l.id = c.lead_id
      WHERE c.company_id = v_company_id
        AND c.instance_id = v_instance_id
        AND (
          l.phone = v_phone 
          OR l.phone LIKE '%' || RIGHT(v_phone, 8)
          OR RIGHT(l.phone, 8) = RIGHT(v_phone, 8)
        )
      ORDER BY c.updated_at DESC
      LIMIT 1;
    END IF;
  END IF;

  -- Se não encontrou conversa na instância correta, cria
  IF v_conv_id IS NULL THEN
    IF v_lead_id IS NULL THEN
      INSERT INTO public.leads (
        company_id,
        user_id,
        name,
        phone,
        status,
        created_at,
        updated_at
      ) VALUES (
        v_company_id,
        NEW.user_id,
        v_name,
        v_phone,
        'lead',
        NOW(),
        NOW()
      )
      RETURNING id INTO v_lead_id;
    END IF;

    INSERT INTO public.chat_conversations (
      company_id,
      lead_id,
      instance_id,
      status,
      last_message_preview,
      last_message_at,
      unread_count,
      created_at,
      updated_at
    ) VALUES (
      v_company_id,
      v_lead_id,
      v_instance_id,
      'open',
      LEFT(COALESCE(NULLIF(v_body, ''), '[' || COALESCE(v_media_type, 'Mídia') || ']'), 100),
      COALESCE(NEW.event_timestamp, NOW()),
      CASE WHEN v_direction = 'inbound' THEN 1 ELSE 0 END,
      NOW(),
      NOW()
    )
    ON CONFLICT (company_id, lead_id, instance_id) 
    DO UPDATE SET
      last_message_preview = EXCLUDED.last_message_preview,
      last_message_at = EXCLUDED.last_message_at,
      unread_count = CASE 
        WHEN v_direction = 'inbound' THEN chat_conversations.unread_count + 1 
        ELSE chat_conversations.unread_count 
      END,
      updated_at = NOW()
    RETURNING id INTO v_conv_id;
  ELSE
    UPDATE public.chat_conversations
    SET
      last_message_preview = LEFT(COALESCE(NULLIF(v_body, ''), '[' || COALESCE(v_media_type, 'Mídia') || ']'), 100),
      last_message_at = COALESCE(NEW.event_timestamp, NOW()),
      unread_count = CASE 
        WHEN v_direction = 'inbound' THEN unread_count + 1 
        ELSE unread_count 
      END,
      lead_id = COALESCE(chat_conversations.lead_id, v_lead_id),
      updated_at = NOW()
    WHERE id = v_conv_id;
  END IF;

  v_msg_type := CASE
    WHEN NEW.event_type IN ('image_message', 'image') OR v_media_type = 'image' THEN 'image'
    WHEN NEW.event_type IN ('audio_message', 'audio', 'voice') OR v_media_type = 'audio' THEN 'audio'
    WHEN NEW.event_type IN ('video_message', 'video') OR v_media_type = 'video' THEN 'video'
    WHEN NEW.event_type IN ('document_message', 'document') OR v_media_type = 'document' THEN 'document'
    WHEN NEW.event_type IN ('sticker_message', 'sticker') OR v_media_type = 'sticker' THEN 'sticker'
    ELSE 'text'
  END;

  IF v_direction = 'outbound' THEN
    SELECT user_id INTO v_operator_id FROM public.instances WHERE id = v_instance_id LIMIT 1;
  END IF;

  -- 5. Inserir mensagem no chat_messages
  INSERT INTO public.chat_messages (
    conversation_id,
    company_id,
    sender_type,
    sender_id,
    message_type,
    body,
    media_url,
    media_type,
    status,
    is_internal,
    zaap_id,
    message_id,
    created_at,
    updated_at
  ) VALUES (
    v_conv_id,
    v_company_id,
    CASE 
      WHEN v_direction = 'outbound' THEN 'operator'
      WHEN v_direction = 'system' THEN 'system'
      ELSE 'lead'
    END,
    CASE 
      WHEN v_direction = 'outbound' THEN v_operator_id
      ELSE v_lead_id
    END,
    v_msg_type,
    v_body,
    v_media_url,
    v_media_type,
    CASE 
      WHEN v_direction = 'inbound' THEN 'received'
      ELSE 'sent'
    END,
    false,
    COALESCE(NEW.raw_event->>'zaap_id', NEW.raw_event->>'id', NEW.message_id),
    COALESCE(NEW.message_id, NEW.raw_event->>'id', NEW.raw_event->>'message_id'),
    COALESCE(NEW.event_timestamp, NOW()),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
