-- Read access for signed PDFs: match "{document_id}.pdf" to a documents row
-- and defer to the same participant/admin predicate used on documents.
CREATE POLICY "signed_documents_participants_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'signed-documents'
    AND EXISTS (
      SELECT 1
      FROM public.documents d
      WHERE storage.objects.name = d.id::text || '.pdf'
        AND (
          public.is_document_participant(d, auth.uid())
          OR public.has_role(auth.uid(), 'admin'::app_role)
        )
    )
  );

-- No INSERT/UPDATE/DELETE policies: only service_role writes, and it
-- bypasses RLS.