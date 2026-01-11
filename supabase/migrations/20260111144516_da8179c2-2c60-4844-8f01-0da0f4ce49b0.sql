-- Add latitude and longitude columns to listings table
ALTER TABLE public.listings 
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;

-- Add index for geospatial queries
CREATE INDEX idx_listings_coordinates ON public.listings (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;