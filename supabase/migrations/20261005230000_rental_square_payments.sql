-- Rental bookings pay through Square (marketplace pattern): the renter pays the
-- host's own Square account and Vendibook keeps its share as app_fee_money.
-- Sale checkout and every other PayPal flow are untouched.
--
-- Reuses the existing booking and payment model (booking_requests,
-- payment_records, payment_ledger_entries, seller_payables). No second
-- booking table and no second payment table. Depends on
-- 20260919180000_rental_checkout_integrity.sql (claim_rental_capture,
-- rental_checkout_fingerprint, payment_lock_record_id).

-- 1. Provider value. Square billing already writes 'square' to payment rows.
ALTER TYPE public.payment_provider ADD VALUE IF NOT EXISTS 'square';

-- 2. Square identifiers on the shared payment record.
ALTER TABLE public.payment_records
  ADD COLUMN IF NOT EXISTS square_payment_id text,
  ADD COLUMN IF NOT EXISTS square_order_id text,
  ADD COLUMN IF NOT EXISTS square_location_id text,
  ADD COLUMN IF NOT EXISTS square_merchant_id text,
  ADD COLUMN IF NOT EXISTS square_receipt_url text,
  ADD COLUMN IF NOT EXISTS app_fee_cents integer;
CREATE UNIQUE INDEX IF NOT EXISTS payment_records_square_payment_id_key
  ON public.payment_records (square_payment_id) WHERE square_payment_id IS NOT NULL;
COMMENT ON COLUMN public.payment_records.app_fee_cents IS
  'Square marketplace: amount sent to Vendibook as app_fee_money (platform fee + tax held for remittance + refundable deposit). The rest settles directly in the host''s Square account.';

-- 3. Host Square connections (OAuth). Tokens are AES-GCM encrypted by the edge
-- function with SQUARE_TOKEN_ENCRYPTION_KEY and never readable by clients.
CREATE TABLE IF NOT EXISTS public.square_seller_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  environment text NOT NULL CHECK (environment IN ('sandbox', 'production')),
  merchant_id text NOT NULL,
  location_id text,
  location_name text,
  business_name text,
  currency text NOT NULL DEFAULT 'USD',
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'needs_reconnect', 'revoked')),
  connected_at timestamptz NOT NULL DEFAULT now(),
  refreshed_at timestamptz,
  revoked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, environment)
);
CREATE INDEX IF NOT EXISTS square_seller_accounts_merchant_idx
  ON public.square_seller_accounts (merchant_id, environment);
ALTER TABLE public.square_seller_accounts ENABLE ROW LEVEL SECURITY;
-- No client policies on purpose: hosts read their status via
-- get_my_square_connection(); only the service role touches tokens.
REVOKE ALL ON public.square_seller_accounts FROM anon, authenticated;
GRANT ALL ON public.square_seller_accounts TO service_role;

CREATE TABLE IF NOT EXISTS public.square_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL,
  environment text NOT NULL,
  return_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  used_at timestamptz
);
ALTER TABLE public.square_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.square_oauth_states FROM anon, authenticated;
GRANT ALL ON public.square_oauth_states TO service_role;

-- 4. Webhook idempotency for rental/marketplace events.
CREATE TABLE IF NOT EXISTS public.square_webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  merchant_id text,
  object_id text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  outcome text,
  error text
);
ALTER TABLE public.square_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.square_webhook_events FROM anon, authenticated;
GRANT ALL ON public.square_webhook_events TO service_role;

-- 5. Host-facing status, without any token material.
CREATE OR REPLACE FUNCTION public.get_my_square_connection()
RETURNS TABLE (environment text, status text, merchant_id text, location_name text,
               business_name text, connected_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.environment, a.status, a.merchant_id, a.location_name, a.business_name, a.connected_at
  FROM public.square_seller_accounts a
  WHERE a.user_id = auth.uid()
  ORDER BY a.updated_at DESC
$$;
REVOKE ALL ON FUNCTION public.get_my_square_connection() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_square_connection() TO authenticated;

-- 6. One booking per checkout attempt. The browser keeps a key per
-- listing + dates; a retry after refresh, back navigation or a double click
-- finds the existing row instead of inserting a duplicate request.
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS client_request_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS booking_requests_client_request_key_uniq
  ON public.booking_requests (shopper_id, client_request_key) WHERE client_request_key IS NOT NULL;

-- 7. Serialize availability checks per listing. The conflict triggers count
-- overlapping rows but take no lock, so two simultaneous requests for the same
-- dates could both pass. "a01_" fires before check_booking_conflicts and
-- validate_booking_availability_trigger (BEFORE triggers run in name order);
-- the transaction-scoped lock makes the second insert wait and then see the
-- first one.
CREATE OR REPLACE FUNCTION public.lock_listing_availability()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.listing_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('booking_availability:' || NEW.listing_id::text, 0));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS a01_lock_listing_availability ON public.booking_requests;
CREATE TRIGGER a01_lock_listing_availability
  BEFORE INSERT OR UPDATE OF start_date, end_date, status, slot_number, hourly_slots, listing_id
  ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.lock_listing_availability();

-- 8. A paid booking keeps payment_lock_record_id forever, and the snapshot
-- guard refused every cancel/decline while a lock existed, so a paid rental
-- could be refunded at the provider but never marked cancelled. Only block
-- closing while a payment is still being verified.
DO $$
DECLARE definition text;
BEGIN
  IF to_regprocedure('public.guard_rental_checkout_snapshot()') IS NULL THEN RETURN; END IF;
  SELECT pg_get_functiondef('public.guard_rental_checkout_snapshot()'::regprocedure) INTO definition;
  definition := replace(definition,
    'IF OLD.payment_lock_record_id IS NOT NULL AND NEW.status IN (''declined'',''cancelled'')',
    'IF OLD.payment_lock_record_id IS NOT NULL AND OLD.payment_status NOT IN (''paid'',''refunded'') AND NEW.status IN (''declined'',''cancelled'')');
  EXECUTE definition;
END $$;

-- 9. Provider-neutral wording for the capture claim (was PayPal-specific).
DO $$
DECLARE definition text;
BEGIN
  IF to_regprocedure('public.claim_rental_capture(uuid)') IS NULL THEN RETURN; END IF;
  SELECT pg_get_functiondef('public.claim_rental_capture(uuid)'::regprocedure) INTO definition;
  definition := replace(definition,
    'Booking changed. Return to the booking payment step to create a fresh PayPal order',
    'Booking changed. Return to the booking payment step and pay again');
  EXECUTE definition;
END $$;
