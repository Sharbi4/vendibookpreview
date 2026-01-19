-- Drop and recreate the INSERT policy for listing-images with proper auth check
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;

CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-images');

-- Do the same for listing-videos
DROP POLICY IF EXISTS "Authenticated users can upload listing videos" ON storage.objects;

CREATE POLICY "Authenticated users can upload listing videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-videos');