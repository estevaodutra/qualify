-- Fix RLS policy for sequence-media to use is_company_member and handle potential NULLs in is_active
-- Also avoiding direct SELECT on company_members inside the policy to avoid any RLS recursion issues

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
    auth.uid()::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'companies'
      AND public.is_company_member(NULLIF((storage.foldername(name))[2], '')::uuid, auth.uid())
    )
  )
);
