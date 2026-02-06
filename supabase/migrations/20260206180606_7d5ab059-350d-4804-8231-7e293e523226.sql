-- Add price_monthly column to listings table for monthly rental pricing
ALTER TABLE public.listings 
ADD COLUMN price_monthly numeric NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.listings.price_monthly IS 'Monthly rental price for extended rentals';