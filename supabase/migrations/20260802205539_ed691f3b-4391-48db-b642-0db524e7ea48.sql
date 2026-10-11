ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paypal_payout_email text,
  ADD COLUMN IF NOT EXISTS paypal_payout_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS paypal_payout_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_card_publish_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Stripe Connect is retired. Vendibook now captures card payments through
  -- PayPal and records seller proceeds internally (seller_payables), so a
  -- host no longer needs a connected processor account to publish.
  -- Payout readiness is surfaced in the UI and gated at payout time instead.
  RETURN NEW;
END;
$$;