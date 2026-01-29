-- Add featured listing fields to listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS featured_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS featured_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS featured_expires_at timestamp with time zone;

-- Add index for querying featured listings
CREATE INDEX IF NOT EXISTS idx_listings_featured ON public.listings (featured_enabled, featured_expires_at) WHERE featured_enabled = true;