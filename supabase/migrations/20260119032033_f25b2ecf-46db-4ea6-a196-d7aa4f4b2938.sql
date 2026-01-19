-- Add confirmation tracking fields to booking_requests
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS host_confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS shopper_confirmed_at timestamp with time zone;

-- Create index for efficient querying of bookings needing confirmation
CREATE INDEX IF NOT EXISTS idx_booking_requests_confirmations 
ON public.booking_requests(status, host_confirmed_at, shopper_confirmed_at) 
WHERE status = 'approved';

COMMENT ON COLUMN public.booking_requests.host_confirmed_at IS 'Timestamp when host confirmed booking ended successfully';
COMMENT ON COLUMN public.booking_requests.shopper_confirmed_at IS 'Timestamp when shopper confirmed booking ended successfully';