-- Create storage bucket for booking documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'booking-documents',
  'booking-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for booking documents
-- Renters can upload their own documents
CREATE POLICY "Renters can upload booking documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'booking-documents' AND
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id::text = (storage.foldername(name))[1]
    AND br.shopper_id = auth.uid()
  )
);

-- Renters can view their own documents
CREATE POLICY "Renters can view their booking documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'booking-documents' AND
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id::text = (storage.foldername(name))[1]
    AND br.shopper_id = auth.uid()
  )
);

-- Hosts can view documents for their listings' bookings
CREATE POLICY "Hosts can view booking documents for their listings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'booking-documents' AND
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id::text = (storage.foldername(name))[1]
    AND br.host_id = auth.uid()
  )
);

-- Renters can update (replace) their pending documents
CREATE POLICY "Renters can update their pending documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'booking-documents' AND
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id::text = (storage.foldername(name))[1]
    AND br.shopper_id = auth.uid()
  )
);

-- Renters can delete their pending documents
CREATE POLICY "Renters can delete their pending documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'booking-documents' AND
  EXISTS (
    SELECT 1 FROM public.booking_documents bd
    JOIN public.booking_requests br ON br.id = bd.booking_id
    WHERE bd.file_url LIKE '%' || storage.objects.name
    AND bd.status = 'pending'
    AND br.shopper_id = auth.uid()
  )
);