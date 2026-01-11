-- Add payment tracking fields to booking_requests
ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed')),
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Create index for payment lookups
CREATE INDEX IF NOT EXISTS idx_booking_requests_checkout_session ON public.booking_requests(checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_payment_intent ON public.booking_requests(payment_intent_id);