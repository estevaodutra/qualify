-- Tabela para catálogo de arquivos do usuário (Drive Central)
CREATE TABLE public.user_media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Metadados do arquivo
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  
  -- Classificação
  media_type TEXT NOT NULL,
  mime_type TEXT,
  
  -- Métricas
  file_size INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Evitar duplicatas
  UNIQUE(user_id, storage_path)
);

-- RLS
ALTER TABLE public.user_media_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own media" ON public.user_media_library
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own media" ON public.user_media_library
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own media" ON public.user_media_library
  FOR DELETE USING (user_id = auth.uid());

-- Índices
CREATE INDEX idx_user_media_library_user ON public.user_media_library(user_id);
CREATE INDEX idx_user_media_library_type ON public.user_media_library(user_id, media_type);