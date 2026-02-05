-- Create headers storage bucket for profile header images
INSERT INTO storage.buckets (id, name, public)
VALUES ('headers', 'headers', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for headers bucket
CREATE POLICY "Users can view all headers"
ON storage.objects FOR SELECT
USING (bucket_id = 'headers');

CREATE POLICY "Users can upload their own headers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'headers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own headers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'headers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own headers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'headers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);