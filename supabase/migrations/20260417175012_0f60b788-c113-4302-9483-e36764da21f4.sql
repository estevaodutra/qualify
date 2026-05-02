ALTER TABLE public.group_execution_lists 
ADD COLUMN IF NOT EXISTS webhook_params jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.group_execution_lists.webhook_params IS 'Parâmetros adicionais em JSON para mesclar ao payload do webhook, com suporte a variáveis {{lead.phone}}, {{campaign.id}}, etc.';