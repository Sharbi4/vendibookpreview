
-- Add dedicated city, state, postal_code columns to listings table
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text;

-- Create indexes for fast lookups on programmatic SEO pages
CREATE INDEX IF NOT EXISTS idx_listings_city ON public.listings (city);
CREATE INDEX IF NOT EXISTS idx_listings_state ON public.listings (state);
CREATE INDEX IF NOT EXISTS idx_listings_city_state ON public.listings (city, state);
CREATE INDEX IF NOT EXISTS idx_listings_postal_code ON public.listings (postal_code);

-- Backfill city/state from existing address data where possible
-- Pattern: "123 Main St, Tampa, FL 33601" or "Tampa, FL"
-- This handles common US address formats
UPDATE public.listings
SET
  city = CASE
    WHEN address IS NOT NULL AND address LIKE '%,%' THEN
      TRIM(SPLIT_PART(
        CASE
          WHEN array_length(string_to_array(address, ','), 1) >= 3 THEN SPLIT_PART(address, ',', array_length(string_to_array(address, ','), 1) - 1)
          WHEN array_length(string_to_array(address, ','), 1) = 2 THEN SPLIT_PART(address, ',', 1)
          ELSE address
        END,
        ',', 1
      ))
    ELSE NULL
  END,
  state = CASE
    WHEN address IS NOT NULL AND address LIKE '%,%' THEN
      TRIM(regexp_replace(
        SPLIT_PART(address, ',', array_length(string_to_array(address, ','), 1)),
        '\s*\d{5}(-\d{4})?\s*$', '', 'g'
      ))
    ELSE NULL
  END,
  postal_code = CASE
    WHEN address IS NOT NULL AND address ~ '\d{5}' THEN
      (regexp_match(address, '(\d{5})'))[1]
    ELSE NULL
  END
WHERE city IS NULL AND address IS NOT NULL;
