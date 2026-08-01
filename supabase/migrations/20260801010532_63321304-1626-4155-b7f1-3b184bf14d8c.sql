DROP POLICY IF EXISTS "Anyone can read listing AI media" ON public.listing_ai_media;

CREATE POLICY "Public can read AI media for published listings"
ON public.listing_ai_media FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_ai_media.listing_id
      AND (
        l.status = 'published'
        OR l.host_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
      )
  )
);