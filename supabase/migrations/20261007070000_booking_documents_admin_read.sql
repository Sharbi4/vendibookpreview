-- Admins review renter documents (insurance, licenses) but had no storage
-- read policy on the private booking-documents bucket, so the admin review
-- screen could not open the files. Renters and hosts already have their own
-- folder-scoped policies.
DROP POLICY IF EXISTS "Admins can view booking documents" ON storage.objects;
CREATE POLICY "Admins can view booking documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'booking-documents' AND public.has_role(auth.uid(), 'admin'::app_role));
