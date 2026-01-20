-- The current RLS policies for listing_blocked_dates:
-- 1. "Hosts can view their blocked dates" - SELECT where auth.uid() = host_id
-- 2. "Anyone can view blocked dates for published listings" - SELECT for published listings
-- These should work correctly, but let's ensure the public policy doesn't require auth

-- Drop and recreate the public viewing policy to ensure it works for anonymous users too
DROP POLICY IF EXISTS "Anyone can view blocked dates for published listings" ON public.listing_blocked_dates;

CREATE POLICY "Anyone can view blocked dates for published listings"
ON public.listing_blocked_dates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM listings
    WHERE listings.id = listing_blocked_dates.listing_id
    AND listings.status = 'published'
  )
);

-- Also ensure the host can view their blocked dates even on draft listings
DROP POLICY IF EXISTS "Hosts can view their blocked dates" ON public.listing_blocked_dates;

CREATE POLICY "Hosts can view their blocked dates"
ON public.listing_blocked_dates
FOR SELECT
TO authenticated
USING (auth.uid() = host_id);