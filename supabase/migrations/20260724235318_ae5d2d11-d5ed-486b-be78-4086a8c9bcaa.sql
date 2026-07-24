
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_full_name boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_public_location boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_verified_badge boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_member_since boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_listings_count boolean NOT NULL DEFAULT true;
