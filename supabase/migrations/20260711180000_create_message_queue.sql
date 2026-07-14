-- Configurações da fila por instância
CREATE TABLE public.instance_queue_settings (
    instance_id uuid PRIMARY KEY REFERENCES public.instances(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    is_paused boolean DEFAULT false,
    min_delay_seconds integer DEFAULT 30,
    max_delay_seconds integer DEFAULT 90,
    daily_limit integer DEFAULT 1000,
    messages_sent_today integer DEFAULT 0,
    last_reset_date date DEFAULT CURRENT_DATE,
    next_available_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.instance_queue_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view instance queue settings for their company"
    ON public.instance_queue_settings FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update instance queue settings for their company"
    ON public.instance_queue_settings FOR UPDATE
    USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Fila global de mensagens
CREATE TABLE public.message_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    instance_id uuid NOT NULL REFERENCES public.instances(id) ON DELETE CASCADE,
    
    -- Metadados da mensagem
    phone varchar(20) NOT NULL,
    message_type varchar(20) DEFAULT 'text',
    body text,
    media_url text,
    media_type text,
    is_internal boolean DEFAULT false,
    
    -- Metadados de origem para referenciar depois do envio
    source_type varchar(50), -- 'chat', 'workflow', 'prospecting', 'campaign'
    conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
    lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
    campaign_id uuid,
    node_id uuid,
    
    -- Controle de fila
    priority integer DEFAULT 50, -- 100=Chat (Alto), 50=Workflow (Normal), 20=Prospecting (Baixo)
    status varchar(20) DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed'
    scheduled_at timestamp with time zone DEFAULT now(),
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    error_message text,
    
    created_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone
);

-- Índices otimizados para o Worker buscar a próxima mensagem
CREATE INDEX idx_message_queue_pending ON public.message_queue(instance_id, status, scheduled_at, priority DESC) WHERE status = 'pending';
CREATE INDEX idx_message_queue_company ON public.message_queue(company_id);

-- Habilitar RLS
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view message queue for their company"
    ON public.message_queue FOR SELECT
    USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert message queue for their company"
    ON public.message_queue FOR INSERT
    WITH CHECK (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update message queue for their company"
    ON public.message_queue FOR UPDATE
    USING (company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid()));

-- Trigger para inicializar instance_queue_settings quando uma instância é criada
CREATE OR REPLACE FUNCTION public.initialize_instance_queue_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.instance_queue_settings (instance_id, company_id)
    VALUES (NEW.id, NEW.company_id)
    ON CONFLICT (instance_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_instance_created_init_queue
    AFTER INSERT ON public.instances
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_instance_queue_settings();

-- Backfill para instâncias existentes
INSERT INTO public.instance_queue_settings (instance_id, company_id)
SELECT id, company_id FROM public.instances WHERE company_id IS NOT NULL
ON CONFLICT (instance_id) DO NOTHING;

-- Função para processar a fila com concorrência segura (LOCK) e calcular delay
CREATE OR REPLACE FUNCTION public.process_message_queue_batch()
RETURNS TABLE (
    queue_id uuid,
    instance_id uuid,
    phone varchar,
    message_type varchar,
    body text,
    media_url text,
    media_type text,
    source_type varchar,
    conversation_id uuid,
    attempts integer,
    max_attempts integer,
    scheduled_at timestamp with time zone
) AS $$
DECLARE
    inst_rec RECORD;
    msg_rec RECORD;
    new_delay_seconds integer;
BEGIN
    -- 1. Buscar instâncias ativas que estão prontas para enviar
    FOR inst_rec IN (
        SELECT s.instance_id, s.min_delay_seconds, s.max_delay_seconds, s.messages_sent_today, s.daily_limit, s.last_reset_date
        FROM public.instance_queue_settings s
        WHERE s.is_paused = false
          AND s.next_available_at <= now()
        FOR UPDATE SKIP LOCKED
    ) LOOP
        -- Reset diário se for um novo dia
        IF inst_rec.last_reset_date < CURRENT_DATE THEN
            UPDATE public.instance_queue_settings
            SET messages_sent_today = 0, last_reset_date = CURRENT_DATE
            WHERE instance_queue_settings.instance_id = inst_rec.instance_id;
            
            inst_rec.messages_sent_today := 0;
        END IF;

        -- Checar limite diário
        IF inst_rec.messages_sent_today >= inst_rec.daily_limit THEN
            CONTINUE; -- Pula essa instância
        END IF;

        -- 2. Pegar a próxima mensagem dessa instância (prioridade mais alta primeiro)
        SELECT q.* INTO msg_rec
        FROM public.message_queue q
        WHERE q.instance_id = inst_rec.instance_id
          AND q.status = 'pending'
          AND q.scheduled_at <= now()
        ORDER BY q.priority DESC, q.scheduled_at ASC, q.created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        IF FOUND THEN
            -- Retornar a mensagem para processamento pelo worker
            queue_id := msg_rec.id;
            instance_id := msg_rec.instance_id;
            phone := msg_rec.phone;
            message_type := msg_rec.message_type;
            body := msg_rec.body;
            media_url := msg_rec.media_url;
            media_type := msg_rec.media_type;
            source_type := msg_rec.source_type;
            conversation_id := msg_rec.conversation_id;
            attempts := msg_rec.attempts;
            max_attempts := msg_rec.max_attempts;
            scheduled_at := msg_rec.scheduled_at;
            RETURN NEXT;

            -- 3. Atualizar a instância: setar novo next_available_at somando o delay aleatório
            new_delay_seconds := inst_rec.min_delay_seconds + floor(random() * (inst_rec.max_delay_seconds - inst_rec.min_delay_seconds + 1))::integer;
            
            UPDATE public.instance_queue_settings
            SET 
                next_available_at = now() + (new_delay_seconds || ' seconds')::interval,
                messages_sent_today = messages_sent_today + 1
            WHERE instance_queue_settings.instance_id = inst_rec.instance_id;

            -- O status da mensagem será setado para 'processing' aqui
            UPDATE public.message_queue
            SET status = 'processing'
            WHERE id = msg_rec.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
