ALTER TABLE public.seller_paypal_accounts
  ADD COLUMN IF NOT EXISTS last_webhook_event_id text;

ALTER TABLE public.seller_paypal_accounts
  DROP CONSTRAINT IF EXISTS seller_paypal_accounts_onboarding_status_check;

ALTER TABLE public.seller_paypal_accounts
  ADD CONSTRAINT seller_paypal_accounts_onboarding_status_check
  CHECK (onboarding_status = ANY (ARRAY['link_sent','onboarding','ready','action_required','disconnected','revoked']));

CREATE INDEX IF NOT EXISTS seller_paypal_accounts_merchant_id_idx
  ON public.seller_paypal_accounts (merchant_id);