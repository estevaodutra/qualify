-- ============================================
-- CHAT CRM (Unified Inbox) SCHEMA MIGRATION
-- ============================================

-- 1. Create pipeline_stages table
CREATE TABLE public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pipeline_stages_company ON public.pipeline_stages(company_id);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view stages" ON public.pipeline_stages 
  FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Company admins can manage stages" ON public.pipeline_stages 
  FOR ALL TO authenticated USING (public.is_company_admin(company_id, auth.uid())) WITH CHECK (public.is_company_admin(company_id, auth.uid()));

-- Insert default stages for existing companies
INSERT INTO public.pipeline_stages (company_id, name, color, order_index)
SELECT id, 'Novo', '#94a3b8', 0 FROM public.companies ON CONFLICT DO NOTHING;
INSERT INTO public.pipeline_stages (company_id, name, color, order_index)
SELECT id, 'Contactado', '#38bdf8', 1 FROM public.companies ON CONFLICT DO NOTHING;
INSERT INTO public.pipeline_stages (company_id, name, color, order_index)
SELECT id, 'Qualificado', '#6366f1', 2 FROM public.companies ON CONFLICT DO NOTHING;
INSERT INTO public.pipeline_stages (company_id, name, color, order_index)
SELECT id, 'Proposta', '#f59e0b', 3 FROM public.companies ON CONFLICT DO NOTHING;
INSERT INTO public.pipeline_stages (company_id, name, color, order_index)
SELECT id, 'Fechado', '#22c55e', 4 FROM public.companies ON CONFLICT DO NOTHING;

-- 2. Add columns to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pipeline_stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;

-- Populate company_id on existing leads based on user's default company
UPDATE public.leads 
SET company_id = (SELECT id FROM public.companies WHERE owner_id = leads.user_id LIMIT 1) 
WHERE company_id IS NULL;

-- Update Leads RLS to support company access
DROP POLICY IF EXISTS "Users can manage own leads" ON public.leads;

CREATE POLICY "Company members can manage leads" ON public.leads
  FOR ALL TO authenticated USING (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
  ) WITH CHECK (
    (company_id IS NOT NULL AND public.is_company_member(company_id, auth.uid())) OR (company_id IS NULL AND user_id = auth.uid())
  );

-- 3. Create chat_conversations table
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.instances(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open', -- open | in_progress | waiting | resolved
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  waiting_since TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chat_conv_company_lead_inst UNIQUE (company_id, lead_id, instance_id)
);

CREATE INDEX idx_chat_conversations_company ON public.chat_conversations(company_id);
CREATE INDEX idx_chat_conversations_lead ON public.chat_conversations(lead_id);
CREATE INDEX idx_chat_conversations_operator ON public.chat_conversations(operator_id);
CREATE INDEX idx_chat_conversations_status ON public.chat_conversations(status);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage conversations" ON public.chat_conversations
  FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- lead | operator | system
  sender_id UUID, -- References profiles(id) or leads(id)
  message_type TEXT NOT NULL DEFAULT 'text', -- text | image | video | audio | document | location | contact
  body TEXT,
  media_url TEXT,
  media_type TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- pending | sent | delivered | read
  is_internal BOOLEAN NOT NULL DEFAULT false,
  zaap_id TEXT,
  message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage chat messages" ON public.chat_messages
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND public.is_company_member(c.company_id, auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND public.is_company_member(c.company_id, auth.uid())
    )
  );

-- 5. Create chat_templates table (Quick replies)
CREATE TABLE public.chat_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chat_templates_shortcut_unique UNIQUE (company_id, shortcut)
);

CREATE INDEX idx_chat_templates_company ON public.chat_templates(company_id);

ALTER TABLE public.chat_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view templates" ON public.chat_templates
  FOR SELECT TO authenticated USING (public.is_company_member(company_id, auth.uid()));

CREATE POLICY "Company members can manage templates" ON public.chat_templates
  FOR ALL TO authenticated USING (public.is_company_member(company_id, auth.uid())) WITH CHECK (public.is_company_member(company_id, auth.uid()));

-- 6. Create chat_attribution_history table
CREATE TABLE public.chat_attribution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chat_attribution_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view attribution history" ON public.chat_attribution_history
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND public.is_company_member(c.company_id, auth.uid())
    )
  );

-- 7. Trigger to auto-update conversation status/preview on new message
CREATE OR REPLACE FUNCTION public.handle_chat_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversations
  SET last_message_preview = CASE 
        WHEN NEW.is_internal THEN '[Nota Interna] ' || COALESCE(NEW.body, '[Mídia]')
        ELSE COALESCE(NEW.body, '[Mídia]')
      END,
      last_message_at = NEW.created_at,
      unread_count = CASE 
        WHEN NEW.sender_type = 'lead' THEN unread_count + 1 
        ELSE unread_count 
      END,
      waiting_since = CASE 
        WHEN NEW.sender_type = 'lead' AND waiting_since IS NULL THEN NEW.created_at
        WHEN NEW.sender_type = 'operator' THEN NULL
        ELSE waiting_since
      END
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_chat_message_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_chat_message_insert();

-- 8. Webhook event trigger to auto-create and populate Chat CRM from incoming WhatsApp events
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

  -- Insert message
  INSERT INTO public.chat_messages (
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

CREATE TRIGGER trg_webhook_events_to_chat
  AFTER INSERT ON public.webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.process_webhook_event_for_crm_chat();

-- 9. Enable Realtime Publications
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_stages;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;
