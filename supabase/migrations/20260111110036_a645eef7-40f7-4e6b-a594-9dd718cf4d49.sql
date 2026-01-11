-- Allow anyone to view basic profile info for hosts of published listings
CREATE POLICY "Anyone can view host profiles for published listings"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.host_id = profiles.id
    AND listings.status = 'published'
  )
);