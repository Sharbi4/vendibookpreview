-- Add attachment columns to booking_messages table
ALTER TABLE public.booking_messages 
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_name TEXT,
ADD COLUMN attachment_type TEXT;

-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments', 
  'message-attachments', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for message attachments
-- Users can upload to their own folder
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view attachments for bookings they're part of
CREATE POLICY "Users can view message attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND (
    EXISTS (
      SELECT 1 FROM booking_messages bm
      JOIN booking_requests br ON br.id = bm.booking_id
      WHERE bm.attachment_url LIKE '%' || storage.objects.name || '%'
      AND (br.host_id = auth.uid() OR br.shopper_id = auth.uid())
    )
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);