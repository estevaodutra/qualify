
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-photos', 'group-photos', true);

CREATE POLICY "Authenticated users can upload group photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'group-photos');

CREATE POLICY "Anyone can view group photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'group-photos');

CREATE POLICY "Users can update their own group photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'group-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own group photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'group-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
