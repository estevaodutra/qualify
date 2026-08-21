import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;

async function main() {
  const url = `${supabaseUrl}/functions/v1/temp-run-sql`;

  const dropFnSql = `DROP FUNCTION IF EXISTS public.debug_trigger_event;`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ sql: dropFnSql })
  });

  const createFnSql = `
    CREATE FUNCTION public.debug_trigger_event(p_event_id UUID)
    RETURNS text AS $$
    DECLARE
      NEW public.webhook_events%ROWTYPE;
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
      v_step TEXT := 'start';
    BEGIN
      SELECT * INTO NEW FROM public.webhook_events WHERE id = p_event_id;

      IF NEW.id IS NULL THEN
        RETURN 'Step: event not found';
      END IF;

      v_step := '1_classification_check';
      IF NEW.classification != 'identified' THEN
        RETURN 'Stopped at classification: ' || COALESCE(NEW.classification, 'null');
      END IF;

      v_step := '2_event_type_check';
      IF NEW.event_type = 'message_ack' OR NEW.event_type = 'message.ack' OR NEW.event_type = 'message_revoked' THEN
        RETURN 'Stopped at event_type: ' || NEW.event_type;
      END IF;

      v_step := '3_direction_check';
      IF NEW.direction = 'outbound' THEN
        v_direction := 'outbound';
      ELSIF NEW.direction = 'system' THEN
        v_direction := 'system';
      ELSE
        v_direction := 'inbound';
      END IF;

      v_step := '4_instance_check';
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
        RETURN 'Stopped at instance_id IS NULL';
      END IF;

      v_step := '5_group_check';
      IF NEW.chat_jid LIKE '%@g.us' OR NEW.chat_jid LIKE '%-group' OR NEW.chat_type = 'group' THEN
        RETURN 'Stopped at group check chat_jid=' || COALESCE(NEW.chat_jid, 'null') || ' type=' || COALESCE(NEW.chat_type, 'null');
      END IF;

      v_step := '6_sender_phone_check';
      IF NEW.sender_phone IS NULL AND NEW.chat_jid IS NULL THEN
        RETURN 'Stopped at sender_phone & chat_jid IS NULL';
      END IF;

      v_phone := COALESCE(NEW.sender_phone, NEW.chat_jid);
      v_name := COALESCE(NEW.sender_name, v_phone);

      v_step := '7_lead_lookup';
      SELECT id INTO v_lead_id
      FROM public.leads
      WHERE company_id = v_company_id
        AND phone = v_phone
      LIMIT 1;

      v_step := '8_conv_lookup';
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

      v_step := '9_conv_insert';
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
        UPDATE public.chat_conversations
        SET 
          contact_phone = COALESCE(contact_phone, v_phone),
          contact_name = COALESCE(contact_name, v_name),
          lead_id = COALESCE(lead_id, v_lead_id)
        WHERE id = v_conv_id;
      END IF;

      v_step := '10_msg_insert';
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

      UPDATE public.chat_conversations
      SET 
        last_message_at = COALESCE(NEW.event_timestamp, NEW.received_at),
        last_message_preview = COALESCE(v_body, CASE WHEN v_media_type IS NOT NULL THEN '[' || v_media_type || ']' ELSE '' END),
        unread_count = CASE WHEN v_direction = 'inbound' THEN unread_count + 1 ELSE unread_count END,
        is_archived = CASE WHEN v_direction = 'inbound' THEN false ELSE is_archived END,
        updated_at = NOW()
      WHERE id = v_conv_id;

      RETURN 'Success conv_id=' || v_conv_id;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN 'Error at step ' || v_step || ': ' || SQLERRM;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ sql: createFnSql })
  });

  const sql = `SELECT public.debug_trigger_event('3b6a1d85-807b-431f-8e86-1eb00ac11a49'::uuid) as result;`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ sql })
  });

  const body = await res.json();
  console.log("Debug trigger step result:", JSON.stringify(body, null, 2));
}

main().catch(console.error);
