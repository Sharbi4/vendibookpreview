-- Make the booking-documents bucket public so admins can view documents
UPDATE storage.buckets 
SET public = true 
WHERE id = 'booking-documents';