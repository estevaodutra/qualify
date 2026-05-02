-- Criar bucket público para mídia de sequências
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sequence-media',
  'sequence-media',
  true,
  104857600,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/3gpp', 'video/quicktime',
    'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/wav',
    'application/pdf', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
);

-- RLS: Usuários autenticados podem fazer upload
CREATE POLICY "Users can upload sequence media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sequence-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: Qualquer um pode visualizar (público)
CREATE POLICY "Anyone can view sequence media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sequence-media');

-- RLS: Usuários podem deletar seus próprios arquivos
CREATE POLICY "Users can delete own sequence media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sequence-media' AND auth.uid()::text = (storage.foldername(name))[1]);