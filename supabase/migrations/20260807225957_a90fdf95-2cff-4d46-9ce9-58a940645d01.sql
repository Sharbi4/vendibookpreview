-- =========================================================================
-- Add explicit PayPal checkout flag to listings
-- =========================================================================

-- New column: controls whether the PayPal logo strip and PayPal checkout
-- surface appear for this listing. Backfill from legacy accept_card_payment
-- so existing Stripe-enabled listings keep showing the PayPal strip.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS accept_paypal_checkout boolean DEFAULT true;

UPDATE public.listings
  SET accept_paypal_checkout = COALESCE(accept_card_payment, true)
  WHERE accept_paypal_checkout IS NULL;

ALTER TABLE public.listings
  ALTER COLUMN accept_paypal_checkout SET NOT NULL;

COMMENT ON COLUMN public.listings.accept_paypal_checkout IS
  'Whether this listing explicitly accepts PayPal checkout (online card/PayPal balance payments). Controls the PayPal logo strip on listing detail pages.';

-- Mark the legacy card flag as Stripe-retired so future readers understand the split.
COMMENT ON COLUMN public.listings.accept_card_payment IS
  'Legacy Stripe card flag; retained for audit history. Active online payment gate is accept_paypal_checkout.';

-- The Stripe Connect publish-enforcement trigger is already a no-op (retired).
-- Ensure it stays harmless by redefining with the new column name for completeness.
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

-- Update trigger columns to listen to the new PayPal flag instead of the legacy card flag.
DROP TRIGGER IF EXISTS trg_enforce_card_publish_eligibility ON public.listings;
CREATE TRIGGER trg_enforce_card_publish_eligibility
  BEFORE INSERT OR UPDATE OF status, accept_paypal_checkout, host_id
  ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_card_publish_eligibility();
