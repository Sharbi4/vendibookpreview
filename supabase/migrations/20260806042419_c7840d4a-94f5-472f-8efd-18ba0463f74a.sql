ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS kitchen_build_year integer,
  ADD COLUMN IF NOT EXISTS kitchen_build_year_unknown boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS operational_status text,
  ADD COLUMN IF NOT EXISTS title_status text,
  ADD COLUMN IF NOT EXISTS has_lien text,
  ADD COLUMN IF NOT EXISTS known_problems jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS no_known_problems boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS included_items text,
  ADD COLUMN IF NOT EXISTS photos_exclusions_answered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photos_exclusions_note text,
  ADD COLUMN IF NOT EXISTS price_negotiable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepts_offers boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_offer_amount numeric;

COMMENT ON COLUMN public.listings.kitchen_build_year IS 'Year the interior kitchen was installed/converted. Distinct from year_built (vehicle/trailer model year).';
COMMENT ON COLUMN public.listings.operational_status IS 'Category-aware readiness: runs_drives | runs_not_drivable | not_running | towable | not_towable | operational | needs_work | unknown';
COMMENT ON COLUMN public.listings.title_status IS 'clean | salvage | rebuilt | bonded | no_title | not_sure (titled assets only)';
COMMENT ON COLUMN public.listings.has_lien IS 'no | yes | not_sure';
COMMENT ON COLUMN public.listings.known_problems IS 'Array of {category, note, photo_url?} seller-disclosed issues.';
COMMENT ON COLUMN public.listings.min_offer_amount IS 'Private seller-only minimum acceptable offer. Never exposed to shoppers.';

ALTER TABLE public.listings
  ADD CONSTRAINT listings_kitchen_build_year_range
  CHECK (kitchen_build_year IS NULL OR (kitchen_build_year >= 1900 AND kitchen_build_year <= 2100)) NOT VALID;
