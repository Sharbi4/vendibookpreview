-- Add freight payment tracking for cash transactions with VendiBook freight
ALTER TABLE public.sale_transactions 
ADD COLUMN IF NOT EXISTS freight_payment_status text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS freight_payment_intent_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS freight_checkout_session_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS freight_paid_at timestamp with time zone DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.sale_transactions.freight_payment_status IS 'Status of freight payment for cash+freight transactions: pending, paid, failed';
COMMENT ON COLUMN public.sale_transactions.freight_payment_intent_id IS 'Stripe payment intent ID for freight-only payment';
COMMENT ON COLUMN public.sale_transactions.freight_checkout_session_id IS 'Stripe checkout session ID for freight-only payment';
COMMENT ON COLUMN public.sale_transactions.freight_paid_at IS 'Timestamp when freight was paid';