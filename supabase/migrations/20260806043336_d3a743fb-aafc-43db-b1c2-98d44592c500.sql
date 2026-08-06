ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS kitchen_build_year_unknown boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_known_problems boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photos_exclusions_answered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS photos_exclusions_note text;