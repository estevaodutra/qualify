-- Fix storage RLS for superadmins
-- Allows superadmins to upload and delete files in sequence-media and scheduling-assets buckets,
-- bypassing the strict company_members check which fails if they aren't explicitly added to the company.

-- 1. sequence-media
DROP POLICY IF EXISTS "Users can upload sequence media" ON storage.objects;

CREATE POLICY "Users can upload sequence media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'sequence-media'
  AND (
    public.is_superadmin(auth.uid())
    OR auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND public.is_company_member(NULLIF((storage.foldername(name))[2], '')::uuid, auth.uid())
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
    public.is_superadmin(auth.uid())
    OR auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND public.is_company_member(NULLIF((storage.foldername(name))[2], '')::uuid, auth.uid())
    )
  )
);

-- 2. scheduling-assets
DROP POLICY IF EXISTS "Members can upload scheduling assets" ON storage.objects;

CREATE POLICY "Members can upload scheduling assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'scheduling-assets'
    AND (
      public.is_superadmin(auth.uid())
      OR public.is_company_member(NULLIF((storage.foldername(name))[1], '')::uuid, auth.uid())
      OR (storage.foldername(name))[1] IN ('logo', 'bg')
    )
  );

DROP POLICY IF EXISTS "Members can update scheduling assets" ON storage.objects;

CREATE POLICY "Members can update scheduling assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'scheduling-assets'
    AND (
      public.is_superadmin(auth.uid())
      OR public.is_company_member(NULLIF((storage.foldername(name))[1], '')::uuid, auth.uid())
      OR auth.uid() = owner
    )
  );

DROP POLICY IF EXISTS "Members can delete scheduling assets" ON storage.objects;

CREATE POLICY "Members can delete scheduling assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'scheduling-assets'
    AND (
      public.is_superadmin(auth.uid())
      OR public.is_company_member(NULLIF((storage.foldername(name))[1], '')::uuid, auth.uid())
      OR auth.uid() = owner
    )
  );
