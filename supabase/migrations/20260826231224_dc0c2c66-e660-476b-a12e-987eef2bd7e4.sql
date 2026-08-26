-- 1. New normalized payment states
ALTER TYPE public.paypal_payment_status ADD VALUE IF NOT EXISTS 'authorized';
ALTER TYPE public.paypal_payment_status ADD VALUE IF NOT EXISTS 'partially_captured';
ALTER TYPE public.paypal_payment_status ADD VALUE IF NOT EXISTS 'authorization_voided';
ALTER TYPE public.paypal_payment_status ADD VALUE IF NOT EXISTS 'authorization_expired';
ALTER TYPE public.paypal_payment_status ADD VALUE IF NOT EXISTS 'deposit_paid_balance_due';

-- 2. Authorization tracking on payment_records
ALTER TABLE public.payment_records
  ADD COLUMN IF NOT EXISTS paypal_authorization_id text,
  ADD COLUMN IF NOT EXISTS authorization_status text,
  ADD COLUMN IF NOT EXISTS authorized_at timestamptz,
  ADD COLUMN IF NOT EXISTS authorization_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS authorization_honor_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS authorization_voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS captured_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_strategy text,
  ADD COLUMN IF NOT EXISTS payment_intent text NOT NULL DEFAULT 'CAPTURE';

CREATE UNIQUE INDEX IF NOT EXISTS payment_records_authorization_id_key
  ON public.payment_records (paypal_authorization_id)
  WHERE paypal_authorization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_records_open_authorizations_idx
  ON public.payment_records (authorization_expires_at)
  WHERE paypal_authorization_id IS NOT NULL AND authorization_status = 'CREATED';

-- 3. Booking-level deposit/balance surface (backward compatible defaults)
ALTER TABLE public.booking_requests
  ADD COLUMN IF NOT EXISTS payment_strategy text,
  ADD COLUMN IF NOT EXISTS balance_due_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_at timestamptz;

-- 4. Sales may rest in payment_authorized before capture
ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS payment_strategy text;

CREATE OR REPLACE FUNCTION public.enforce_sale_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  allowed text[];
BEGIN
  IF NEW.status IS NULL THEN
    RAISE EXCEPTION 'sale_transactions.status cannot be NULL';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending','pending_cash','paid') THEN
      RAISE EXCEPTION 'Invalid initial sale status: %', NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW; -- idempotent no-op
  END IF;

  allowed := CASE OLD.status
    WHEN 'pending'            THEN ARRAY['payment_authorized','paid','payment_failed','cancelled']
    WHEN 'payment_authorized' THEN ARRAY['paid','payment_failed','cancelled']
    WHEN 'pending_cash'       THEN ARRAY['paid','cancelled']
    WHEN 'payment_failed'     THEN ARRAY['pending','cancelled']
    WHEN 'paid'               THEN ARRAY['confirmed','disputed','refunded','completed']
    WHEN 'confirmed'          THEN ARRAY['completed','disputed','refunded']
    WHEN 'disputed'           THEN ARRAY['refunded','completed']
    WHEN 'completed'          THEN ARRAY['paid_out','payout_failed','disputed']
    WHEN 'payout_failed'      THEN ARRAY['completed','paid_out']
    ELSE ARRAY[]::text[]  -- terminals: paid_out, refunded, cancelled
  END;

  IF NOT (NEW.status = ANY(allowed)) THEN
    RAISE EXCEPTION 'Illegal sale transition % → % (allowed: %)',
      OLD.status, NEW.status, allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;