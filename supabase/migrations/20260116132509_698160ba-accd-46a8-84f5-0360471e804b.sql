-- Add instant_book column to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS instant_book BOOLEAN DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN public.listings.instant_book IS 'If true, bookings are charged immediately and auto-confirmed when all documents are approved. If documents are rejected, the booking is cancelled and refunded.';

-- Add is_instant_book column to booking_requests to track which bookings used instant book
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS is_instant_book BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.booking_requests.is_instant_book IS 'Indicates if this booking was made using Instant Book flow where payment is taken upfront.';

-- Create index for instant book listings
CREATE INDEX IF NOT EXISTS idx_listings_instant_book ON public.listings(instant_book) WHERE instant_book = true;