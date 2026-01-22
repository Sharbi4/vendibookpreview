-- Add columns for authorization hold flow
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS hold_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS hold_status text DEFAULT 'none';

-- Add comment for clarity
COMMENT ON COLUMN public.booking_requests.hold_expires_at IS 'When the payment authorization hold expires (typically 7 days from creation)';
COMMENT ON COLUMN public.booking_requests.hold_status IS 'Status of payment hold: none, held, captured, released, expired';