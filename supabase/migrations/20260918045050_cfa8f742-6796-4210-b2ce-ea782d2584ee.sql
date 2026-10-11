
CREATE POLICY "Participants read handoff evidence files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'handoff-evidence'
  AND EXISTS (
    SELECT 1 FROM public.handoff_sessions hs
    WHERE hs.id::text = (storage.foldername(name))[1]
      AND public.is_handoff_participant(hs.sale_transaction_id, hs.booking_id)
  )
);

CREATE POLICY "Participants upload handoff evidence files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'handoff-evidence'
  AND EXISTS (
    SELECT 1 FROM public.handoff_sessions hs
    WHERE hs.id::text = (storage.foldername(name))[1]
      AND hs.finalized = false
      AND public.is_handoff_participant(hs.sale_transaction_id, hs.booking_id)
  )
);
