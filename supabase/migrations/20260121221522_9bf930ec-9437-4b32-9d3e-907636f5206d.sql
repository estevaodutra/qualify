-- Add media fields to group_messages table
ALTER TABLE public.group_messages
ADD COLUMN media_url TEXT DEFAULT NULL,
ADD COLUMN media_type TEXT DEFAULT NULL,
ADD COLUMN media_caption TEXT DEFAULT NULL;

COMMENT ON COLUMN public.group_messages.media_url IS 'URL do arquivo de mídia (imagem, vídeo, áudio, documento)';
COMMENT ON COLUMN public.group_messages.media_type IS 'Tipo da mídia: image, video, audio, document, sticker';
COMMENT ON COLUMN public.group_messages.media_caption IS 'Legenda opcional para a mídia';