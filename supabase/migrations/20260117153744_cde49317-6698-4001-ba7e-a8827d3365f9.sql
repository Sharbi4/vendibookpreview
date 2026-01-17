-- Add payment method columns for sale listings
ALTER TABLE public.listings
ADD COLUMN accept_cash_payment boolean DEFAULT false,
ADD COLUMN accept_card_payment boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.listings.accept_cash_payment IS 'Whether the seller accepts cash/in-person payments';
COMMENT ON COLUMN public.listings.accept_card_payment IS 'Whether the seller accepts card payments via Stripe';