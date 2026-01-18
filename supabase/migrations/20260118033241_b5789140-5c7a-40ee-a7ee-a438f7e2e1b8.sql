-- Add rental_buffer_days column to listings table for hosts to set buffer time between rentals
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS rental_buffer_days integer DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN public.listings.rental_buffer_days IS 'Number of days to block before and after each booking for preparation/cleanup';