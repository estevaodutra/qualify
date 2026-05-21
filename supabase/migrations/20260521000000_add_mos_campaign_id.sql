-- Adicionar coluna mos_campaign_id para armazenar o ID criado na MOS BR
ALTER TABLE public.ura_campaigns
  ADD COLUMN IF NOT EXISTS mos_campaign_id INT,
  ADD COLUMN IF NOT EXISTS mos_audio_name TEXT;

-- Comentarios descritivos
COMMENT ON COLUMN public.ura_campaigns.mos_campaign_id IS 'ID da campanha criada na plataforma MOS BR via POST /api/v2/tvoz/campaigns/';
COMMENT ON COLUMN public.ura_campaigns.mos_audio_name IS 'Nome do arquivo de audio registrado na MOS BR via POST /api/v2/tvoz/audio/';
