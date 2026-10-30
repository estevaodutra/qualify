-- =====================================================
-- Prospecting: Pipeline & Stage integration + Landline phone
-- =====================================================

-- 1. Add pipeline_id and stage_id to prospecting_campaigns
ALTER TABLE public.prospecting_campaigns
  ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prospecting_campaigns_pipeline
  ON public.prospecting_campaigns(pipeline_id);

-- 2. Add telefone_fixo column to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS telefone_fixo TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_telefone_fixo
  ON public.leads(company_id, telefone_fixo);

COMMENT ON COLUMN public.prospecting_campaigns.pipeline_id IS 'Pipeline onde os novos leads prospectados serão inseridos como deals/cards.';
COMMENT ON COLUMN public.prospecting_campaigns.stage_id IS 'Etapa da pipeline para inserção do card (se omitido, primeira etapa).';
COMMENT ON COLUMN public.leads.telefone_fixo IS 'Número de telefone fixo identificado automaticamente (se houver telefone e WhatsApp).';
