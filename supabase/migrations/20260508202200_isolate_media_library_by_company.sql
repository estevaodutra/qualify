-- Adicionar company_id à tabela user_media_library
ALTER TABLE public.user_media_library ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_user_media_library_company ON public.user_media_library(company_id);

-- Atualizar RLS para isolamento por empresa
-- Primeiro removemos as políticas antigas
DROP POLICY IF EXISTS "Users can view own media" ON public.user_media_library;
DROP POLICY IF EXISTS "Users can insert own media" ON public.user_media_library;
DROP POLICY IF EXISTS "Users can delete own media" ON public.user_media_library;

-- Criamos novas políticas baseadas na empresa
CREATE POLICY "Members can view company media" ON public.user_media_library
  FOR SELECT TO authenticated
  USING (is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can insert company media" ON public.user_media_library
  FOR INSERT TO authenticated
  WITH CHECK (is_company_member(company_id, auth.uid()));

CREATE POLICY "Members can delete company media" ON public.user_media_library
  FOR DELETE TO authenticated
  USING (is_company_member(company_id, auth.uid()));

-- Manter política de segurança para o dono (opcional, mas recomendado para transição)
CREATE POLICY "Users can still see their own uploads" ON public.user_media_library
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
