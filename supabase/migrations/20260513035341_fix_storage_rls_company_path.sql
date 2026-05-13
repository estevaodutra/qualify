-- Fix storage RLS: accept both user-path ({user_id}/...) and company-path (companies/{company_id}/...)

DROP POLICY IF EXISTS "Users can upload sequence media" ON storage.objects;

CREATE POLICY "Users can upload sequence media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sequence-media'
  AND (
    -- User-owned path: {user_id}/...
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Company path: companies/{company_id}/...
    (
      (storage.foldername(name))[1] = 'companies'
      AND EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id::text = (storage.foldername(name))[2]
          AND user_id = auth.uid()
          AND is_active = true
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can delete own sequence media" ON storage.objects;

CREATE POLICY "Users can delete own sequence media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'sequence-media'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND EXISTS (
        SELECT 1 FROM public.company_members
        WHERE company_id::text = (storage.foldername(name))[2]
          AND user_id = auth.uid()
          AND is_active = true
      )
    )
  )
);
