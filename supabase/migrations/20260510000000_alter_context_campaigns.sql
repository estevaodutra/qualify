-- Adiciona colunas que estavam faltando na tabela context_campaigns
ALTER TABLE public.context_campaigns
  ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opening_message TEXT,
  ADD COLUMN IF NOT EXISTS closing_message TEXT;

-- Recria o CHECK constraint para incluir 'first_message'
ALTER TABLE public.context_campaigns
  DROP CONSTRAINT IF EXISTS context_campaigns_trigger_type_check;

ALTER TABLE public.context_campaigns
  ADD CONSTRAINT context_campaigns_trigger_type_check
  CHECK (trigger_type IN ('manual', 'scheduled', 'keyword', 'first_message'));
