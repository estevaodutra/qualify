-- Migration: 20261020120000_create_instance_connection_logs_and_fix_disconnect.sql
-- Description: Cria tabela de histórico de conexões/desconexões e remove trigger destrutivo

-- 1. Remover o trigger destrutivo que apagava external_instance_id e phone ao desconectar
DROP TRIGGER IF EXISTS trg_instance_status_change ON public.instances;
DROP FUNCTION IF EXISTS public.handle_instance_status_change();

-- 2. Criar a tabela de histórico de conexões de instâncias
CREATE TABLE IF NOT EXISTS public.instance_connection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.instances(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name text,
  phone text,
  external_instance_id text,
  previous_status text,
  new_status text NOT NULL,
  event_type text NOT NULL, -- 'connected' | 'disconnected' | 'waiting connection'
  reason text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_instance_conn_logs_instance_id ON public.instance_connection_logs(instance_id);
CREATE INDEX IF NOT EXISTS idx_instance_conn_logs_created_at ON public.instance_connection_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instance_conn_logs_company_id ON public.instance_connection_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_instance_conn_logs_event_type ON public.instance_connection_logs(event_type);

-- RLS
ALTER TABLE public.instance_connection_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmin full access on instance_connection_logs" ON public.instance_connection_logs;
CREATE POLICY "Superadmin full access on instance_connection_logs"
  ON public.instance_connection_logs
  FOR ALL
  TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

DROP POLICY IF EXISTS "Service role full access on instance_connection_logs" ON public.instance_connection_logs;
CREATE POLICY "Service role full access on instance_connection_logs"
  ON public.instance_connection_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Company members can read instance connection logs" ON public.instance_connection_logs;
CREATE POLICY "Company members can read instance connection logs"
  ON public.instance_connection_logs
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT cm.company_id FROM public.company_members cm WHERE cm.user_id = auth.uid()
    )
  );

-- 3. Adicionar publicação Realtime para a tabela de histórico
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'instance_connection_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.instance_connection_logs;
  END IF;
END $$;

-- 4. Função e trigger para gravar qualquer mudança de status no histórico
CREATE OR REPLACE FUNCTION public.handle_log_instance_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_company_name text := NULL;
  v_event_type text;
  v_reason text;
  v_phone text;
  v_ext_id text;
BEGIN
  -- Apenas executa se for INSERT ou se o status mudou no UPDATE
  IF (TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status) THEN
    RETURN NEW;
  END IF;

  -- Obter nome da empresa associada
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO v_company_name FROM public.companies WHERE id = NEW.company_id;
  END IF;

  -- Determinar tipo de evento e descrição amigável
  IF NEW.status = 'connected' THEN
    v_event_type := 'connected';
    v_reason := 'Instância conectada ao WhatsApp com sucesso';
  ELSIF NEW.status = 'disconnected' THEN
    v_event_type := 'disconnected';
    v_reason := 'Instância desconectada';
  ELSIF NEW.status = 'waiting connection' THEN
    v_event_type := 'waiting connection';
    v_reason := 'Aguardando leitura de QR Code ou conexão';
  ELSE
    v_event_type := NEW.status;
    v_reason := 'Status alterado para ' || NEW.status;
  END IF;

  -- Preservar telefone e external_id
  v_phone := COALESCE(NULLIF(NEW.phone, ''), (CASE WHEN TG_OP = 'UPDATE' THEN NULLIF(OLD.phone, '') ELSE NULL END), '');
  v_ext_id := COALESCE(NEW.external_instance_id, (CASE WHEN TG_OP = 'UPDATE' THEN OLD.external_instance_id ELSE NULL END));

  INSERT INTO public.instance_connection_logs (
    instance_id,
    instance_name,
    company_id,
    company_name,
    phone,
    external_instance_id,
    previous_status,
    new_status,
    event_type,
    reason,
    details,
    created_at
  ) VALUES (
    NEW.id,
    NEW.name,
    NEW.company_id,
    v_company_name,
    v_phone,
    v_ext_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    v_event_type,
    v_reason,
    jsonb_build_object(
      'provider', NEW.provider,
      'payment_status', NEW.payment_status,
      'trigger_op', TG_OP
    ),
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_instance_status_change ON public.instances;
CREATE TRIGGER trg_log_instance_status_change
  AFTER INSERT OR UPDATE ON public.instances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_log_instance_status_change();
