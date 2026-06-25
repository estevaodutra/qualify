-- Garante RLS ativo na tabela de storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Correção das políticas de "group-photos" (usar owner em vez de foldername)
DROP POLICY IF EXISTS "Users can update their own group photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own group photos" ON storage.objects;

CREATE POLICY "Users can update their own group photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'group-photos' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own group photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'group-photos' AND auth.uid() = owner);


-- 2. Correção das políticas de "scheduling-assets" com isolamento corporativo
DROP POLICY IF EXISTS "Authenticated upload scheduling assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update scheduling assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete scheduling assets" ON storage.objects;

CREATE POLICY "Members can upload scheduling assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'scheduling-assets'
    AND (
      EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
          AND is_active = true
      )
      OR (storage.foldername(name))[1] IN ('logo', 'bg')
    )
  );

CREATE POLICY "Members can update scheduling assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'scheduling-assets'
    AND (
      EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
          AND is_active = true
      )
      OR auth.uid() = owner
    )
  );

CREATE POLICY "Members can delete scheduling assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'scheduling-assets'
    AND (
      EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
          AND is_active = true
      )
      OR auth.uid() = owner
    )
  );
