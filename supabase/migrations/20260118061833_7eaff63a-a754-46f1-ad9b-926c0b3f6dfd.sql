-- Add payout tracking columns to booking_requests
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS payout_processed boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payout_processed_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payout_transfer_id text DEFAULT NULL;

-- Create index for efficient payout queries
CREATE INDEX IF NOT EXISTS idx_booking_requests_payout_pending 
ON public.booking_requests (status, payment_status, payout_processed, end_date) 
WHERE status = 'completed' AND payment_status = 'paid' AND payout_processed IS NULL;