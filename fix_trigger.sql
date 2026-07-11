CREATE OR REPLACE FUNCTION public.process_webhook_event_for_crm_chat()
RETURNS TRIGGER AS $$
DECLARE
  v_instance_id UUID;
  v_company_id UUID;
  v_lead_id UUID;
  v_conv_id UUID;
  v_body TEXT;
  v_media_url TEXT := NULL;
  v_media_type TEXT := NULL;
  v_msg_type TEXT;
  v_direction TEXT;
  v_operator_id UUID := NULL;
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

  IF NEW.sender_phone IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_direction = 'inbound' THEN
    INSERT INTO public.leads (user_id, company_id, phone, name, status)
    VALUES (
      NEW.user_id,
      v_company_id,
      NEW.sender_phone,
      COALESCE(NEW.sender_name, NEW.sender_phone),
      'active'
    )
    ON CONFLICT (user_id, phone) DO UPDATE SET 
      phone = EXCLUDED.phone,
      name = CASE 
               WHEN public.leads.name = public.leads.phone AND EXCLUDED.name != EXCLUDED.phone THEN EXCLUDED.name 
               ELSE public.leads.name 
             END
    RETURNING id INTO v_lead_id;
  ELSE
    SELECT id INTO v_lead_id
    FROM public.leads
    WHERE company_id = v_company_id
      AND phone = NEW.chat_jid
    LIMIT 1;
    
    IF v_lead_id IS NULL THEN
      INSERT INTO public.leads (user_id, company_id, phone, name, status)
      VALUES (
        NEW.user_id,
        v_company_id,
        NEW.chat_jid,
        NEW.chat_jid,
        'active'
      )
      ON CONFLICT (user_id, phone) DO UPDATE SET 
        phone = EXCLUDED.phone,
        name = CASE 
                 WHEN public.leads.name = public.leads.phone AND EXCLUDED.name != EXCLUDED.phone THEN EXCLUDED.name 
                 ELSE public.leads.name 
               END
      RETURNING id INTO v_lead_id;
    END IF;
  END IF;

  SELECT id INTO v_conv_id
  FROM public.chat_conversations
  WHERE company_id = v_company_id
    AND lead_id = v_lead_id
    AND instance_id = v_instance_id;

  IF v_conv_id IS NULL THEN
    INSERT INTO public.chat_conversations (
      company_id,
      lead_id,
      instance_id,
      status,
      last_message_at,
      created_at,
      updated_at
    )
    VALUES (
      v_company_id,
      v_lead_id,
      v_instance_id,
      'open',
      COALESCE(NEW.event_timestamp, NEW.received_at),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_conv_id;
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
      NEW.raw_event->>'mediaUrl'
    );
    v_media_type := NEW.event_subtype;
    
    IF v_body IS NULL THEN
      v_body := '[' || UPPER(v_msg_type) || ']';
    END IF;
  END IF;

  IF v_direction = 'outbound' THEN
    v_operator_id := NEW.user_id;
  END IF;

  IF v_body IS NULL AND NEW.raw_event->>'mimetype' IS NOT NULL THEN
    v_body := '[Mídia]';
  END IF;
  
  IF v_body IS NULL THEN
    v_body := '[Mensagem do WhatsApp]';
  END IF;

  INSERT INTO public.chat_messages (
    company_id, -- AQUI ESTA A CORRECAO DO REALTIME
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
    v_company_id, -- AQUI ESTA A CORRECAO DO REALTIME
    v_conv_id,
    CASE WHEN v_direction = 'inbound' THEN 'lead' ELSE 'operator' END,
    CASE WHEN v_direction = 'outbound' THEN v_operator_id ELSE NULL END,
    v_msg_type,
    v_body,
    v_media_url,
    v_media_type,
    CASE WHEN v_direction = 'inbound' THEN 'received' ELSE 'sent' END,
    NEW.message_id,
    COALESCE(NEW.event_timestamp, NEW.received_at)
  );

  UPDATE public.chat_conversations
  SET last_message_preview = v_body,
      last_message_at = COALESCE(NEW.event_timestamp, NEW.received_at),
      unread_count = CASE WHEN v_direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
      updated_at = NOW()
  WHERE id = v_conv_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro no process_webhook_event_for_crm_chat: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajustar a mensagem "Teste 19" (e outras recentes) que foram criadas com o company_id errado pelo script anterior:
UPDATE public.chat_messages m
SET company_id = c.company_id
FROM public.chat_conversations c
WHERE m.conversation_id = c.id
  AND m.company_id != c.company_id;
