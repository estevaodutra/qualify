import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;

async function main() {
  const url = `${supabaseUrl}/functions/v1/temp-run-sql`;

  const dropFnSql = `DROP FUNCTION IF EXISTS public.process_webhook_event_for_crm_chat_test;`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ sql: dropFnSql })
  });

  const createFnSql = `
    CREATE FUNCTION public.process_webhook_event_for_crm_chat_test(p_event_id UUID)
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
    BEGIN
      SELECT * INTO NEW FROM public.webhook_events WHERE id = p_event_id;

      IF NEW.id IS NULL THEN
        RETURN 'Event not found';
      END IF;

      IF NEW.classification != 'identified' THEN
        RETURN 'Stopped at classification';
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

      v_phone := COALESCE(NEW.sender_phone, NEW.chat_jid);
      v_name := COALESCE(NEW.sender_name, v_phone);

      SELECT id INTO v_lead_id
      FROM public.leads
      WHERE company_id = v_company_id
        AND phone = v_phone
      LIMIT 1;

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
        'lead',
        NULL,
        'text',
        'oi test',
        NULL,
        NULL,
        'received',
        NEW.message_id,
        COALESCE(NEW.event_timestamp, NEW.received_at)
      );

      RETURN 'Success conv_id=' || v_conv_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ sql: createFnSql })
  });

  const sql = `SELECT public.process_webhook_event_for_crm_chat_test('548ba482-e0e3-4c83-8c20-f0a7e4ae9353'::uuid) as result;`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    body: JSON.stringify({ sql })
  });

  const body = await res.json();
  console.log("Direct function call result:", JSON.stringify(body, null, 2));
}

main().catch(console.error);
