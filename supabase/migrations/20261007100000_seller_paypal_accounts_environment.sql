-- PayPal live switch (2026-10-07). A seller's PayPal connection belongs to the
-- PayPal environment it was made in: a sandbox merchant id does not exist in
-- live, so routing a live order to it fails. Every connection so far was made
-- while Vendibook ran PayPal in sandbox. New connections record the
-- environment of the onboarding flow, and routing only uses a connection from
-- the environment Vendibook is charging in.
ALTER TABLE public.seller_paypal_accounts ADD COLUMN IF NOT EXISTS environment text;
UPDATE public.seller_paypal_accounts SET environment = 'sandbox' WHERE environment IS NULL;
ALTER TABLE public.seller_paypal_accounts ALTER COLUMN environment SET NOT NULL;
ALTER TABLE public.seller_paypal_accounts DROP CONSTRAINT IF EXISTS seller_paypal_accounts_environment_check;
ALTER TABLE public.seller_paypal_accounts
  ADD CONSTRAINT seller_paypal_accounts_environment_check CHECK (environment IN ('sandbox', 'live'));
