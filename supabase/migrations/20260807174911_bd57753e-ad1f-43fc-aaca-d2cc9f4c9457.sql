CREATE POLICY "concierge owner reads own uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'concierge-uploads'
    AND (public.is_admin(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "concierge owner uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'concierge-uploads'
    AND (public.is_admin(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "concierge owner updates own uploads" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'concierge-uploads'
    AND (public.is_admin(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text))
  WITH CHECK (bucket_id = 'concierge-uploads'
    AND (public.is_admin(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));
CREATE POLICY "concierge owner deletes own uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'concierge-uploads'
    AND (public.is_admin(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));