DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated users can upload listing videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload listing videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-videos' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Authenticated can upload listing media" ON storage.objects;
CREATE POLICY "Authenticated can upload listing media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own listing media" ON storage.objects;
CREATE POLICY "Users can update their own listing media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'listing-media' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'listing-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own listing media" ON storage.objects;
CREATE POLICY "Users can delete their own listing media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'listing-media' AND (auth.uid())::text = (storage.foldername(name))[1]);