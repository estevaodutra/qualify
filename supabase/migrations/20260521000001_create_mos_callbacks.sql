-- criar tabela de callbacks da MOS BR
CREATE TABLE IF NOT EXISTS public.mos_callbacks (
  id BIGSERIAL PRIMARY KEY,
  ura_campaign_id UUID REFERENCES public.ura_campaigns(id) ON DELETE SET NULL,
  mos_campaign_id INT NOT NULL,
  dtmf VARCHAR(10),
  phone VARCHAR(20),
  status VARCHAR(20),
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
