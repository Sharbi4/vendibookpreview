-- Unlisted listings: hidden from every discovery surface (homepage, search,
-- city/category pages, related listings, sitemap, product feeds, digests)
-- while the direct link, checkout and booking keep working. Used for PayPal /
-- Square sandbox certification listings so testers can transact on a real
-- listing without it showing to the public.
--
-- Only admins and server code (service role) may set it: a host-set unlisted
-- flag would let a scam listing hide from monitoring while being shared by
-- direct link off-platform. Non-admin writes are silently reverted, the same
-- pattern as protect_listing_monetized_fields.
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS unlisted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.unlisted IS
  'Admin-only. Hidden from discovery surfaces; direct link and checkout still work.';

CREATE OR REPLACE FUNCTION public.protect_listing_unlisted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') IS DISTINCT FROM 'service_role'
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.unlisted := false;
    ELSE
      NEW.unlisted := OLD.unlisted;
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS protect_listing_unlisted ON public.listings;
CREATE TRIGGER protect_listing_unlisted
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_listing_unlisted();
