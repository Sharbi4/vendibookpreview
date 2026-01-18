-- Add deposit_amount to listings table for rental security deposits
ALTER TABLE public.listings 
ADD COLUMN deposit_amount numeric NULL;

-- Add deposit tracking fields to booking_requests
ALTER TABLE public.booking_requests
ADD COLUMN deposit_amount numeric NULL,
ADD COLUMN deposit_status text NULL DEFAULT 'pending',
ADD COLUMN deposit_charge_id text NULL,
ADD COLUMN deposit_refunded_at timestamptz NULL,
ADD COLUMN deposit_refund_notes text NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.listings.deposit_amount IS 'Security deposit amount required for rentals';
COMMENT ON COLUMN public.booking_requests.deposit_status IS 'Status: pending, charged, refunded, forfeited';
COMMENT ON COLUMN public.booking_requests.deposit_charge_id IS 'Stripe charge ID for the deposit';
COMMENT ON COLUMN public.booking_requests.deposit_refunded_at IS 'When the deposit was refunded';
COMMENT ON COLUMN public.booking_requests.deposit_refund_notes IS 'Notes about refund or forfeiture reason';