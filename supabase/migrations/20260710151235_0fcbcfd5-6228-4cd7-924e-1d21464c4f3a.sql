
-- Users manage files scoped to their own uid folder in support-ticket-attachments.
CREATE POLICY "Users read own support attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'support-ticket-attachments'
    AND (public.is_admin(auth.uid()) OR auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "Users upload own support attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'support-ticket-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own support attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'support-ticket-attachments'
    AND (public.is_admin(auth.uid()) OR auth.uid()::text = (storage.foldername(name))[1])
  );
