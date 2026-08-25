ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS source_listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legacy_pickup_contact_text text;

CREATE INDEX IF NOT EXISTS idx_listings_source_listing_id
  ON public.listings(source_listing_id)
  WHERE source_listing_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_listings_one_derived_per_source
  ON public.listings(source_listing_id)
  WHERE source_listing_id IS NOT NULL AND deleted_at IS NULL;

-- Preserve phone-looking values that were stored in the public pickup text.
UPDATE public.listings l
SET legacy_pickup_contact_text = l.pickup_location_text,
    pickup_location_text = NULL
WHERE l.pickup_location_text IS NOT NULL
  AND btrim(l.pickup_location_text) ~ '^\+?1?\s*\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4}$';

-- Backfill the owner's private profile phone only when it is empty.
UPDATE public.profiles p
SET phone_number = sub.phone
FROM (
  SELECT DISTINCT ON (host_id) host_id, btrim(legacy_pickup_contact_text) AS phone
  FROM public.listings
  WHERE legacy_pickup_contact_text IS NOT NULL
  ORDER BY host_id, updated_at DESC
) sub
WHERE p.id = sub.host_id
  AND (p.phone_number IS NULL OR btrim(p.phone_number) = '');