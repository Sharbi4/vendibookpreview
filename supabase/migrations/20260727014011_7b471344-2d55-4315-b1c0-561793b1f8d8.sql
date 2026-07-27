DROP POLICY IF EXISTS "Anyone can view blocked times" ON public.listing_blocked_times;

CREATE POLICY "Anyone can view blocked times for published listings"
ON public.listing_blocked_times
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_blocked_times.listing_id
      AND l.status = 'published'
  )
  OR auth.uid() = host_id
);