-- Add dispute tracking fields to booking_requests if not exists
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS dispute_opened_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS dispute_reason text,
ADD COLUMN IF NOT EXISTS dispute_status text DEFAULT NULL;

-- Create index for efficient dispute checking
CREATE INDEX IF NOT EXISTS idx_booking_requests_dispute_status ON public.booking_requests(dispute_status) WHERE dispute_status IS NOT NULL;

-- Create index for cron job performance
CREATE INDEX IF NOT EXISTS idx_booking_requests_end_date_status ON public.booking_requests(end_date, status, payment_status);

COMMENT ON COLUMN public.booking_requests.dispute_opened_at IS 'Timestamp when a dispute was opened by either party';
COMMENT ON COLUMN public.booking_requests.dispute_reason IS 'Reason provided for the dispute';
COMMENT ON COLUMN public.booking_requests.dispute_status IS 'Current dispute status: pending, resolved_host, resolved_renter, closed';