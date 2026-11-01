/* ========================================================
   MIGRATION: CONTEÚDO SEMENTE - TORNAR ACCOUNT_ID OPCIONAL
   Permite gerar e acompanhar o Conteúdo Semente da empresa
   mesmo antes de vincular uma conta do Instagram.
======================================================== */

-- 1. Permitir que account_id seja nulo na tabela de ativação
ALTER TABLE IF EXISTS public.criafy_account_activations 
  ALTER COLUMN account_id DROP NOT NULL;

-- 2. Remover a constraint unique antiga que impedia múltiplos nulos ou limitava por account_id
ALTER TABLE IF EXISTS public.criafy_account_activations 
  DROP CONSTRAINT IF EXISTS criafy_account_activations_account_unique;

-- 3. Criar índices parciais únicos: um por conta (quando houver) e um por empresa (quando não houver conta)
CREATE UNIQUE INDEX IF NOT EXISTS uq_criafy_account_activations_account 
  ON public.criafy_account_activations (account_id) 
  WHERE account_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_criafy_account_activations_company_null_account 
  ON public.criafy_account_activations (company_id) 
  WHERE account_id IS NULL;
