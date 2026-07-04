-- Remove permissive guest-draft policies from public.listings.
-- Guest drafts are now accessed exclusively through the guest-draft-access
-- edge function, which validates the token server-side before acting.
DROP POLICY IF EXISTS "Allow guest draft reads with token" ON public.listings;
DROP POLICY IF EXISTS "Allow guest draft updates with token" ON public.listings;
DROP POLICY IF EXISTS "Authenticated users can claim guest drafts" ON public.listings;
