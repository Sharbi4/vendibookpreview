-- Create storage bucket for listing videos (public access for display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-videos', 
  'listing-videos', 
  true,
  104857600, -- 100MB limit per video
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/mov']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view videos (public bucket)
CREATE POLICY "Anyone can view listing videos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'listing-videos');

-- Allow authenticated users to upload videos
CREATE POLICY "Authenticated users can upload listing videos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'listing-videos' 
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own videos
CREATE POLICY "Users can update their own listing videos" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'listing-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own listing videos" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'listing-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);