-- Dispute flow (2026-10-08). A dispute that closes without a full refund
-- must return the sale to where it was (paid, or one side confirmed) so the
-- handoff and confirmations can continue. Until now a disputed sale could only
-- end as refunded or completed, so "release to seller" marked undelivered
-- trucks and trailers complete.

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
    WHEN 'pending_cash'       THEN ARRAY['paid','buyer_confirmed','seller_confirmed','completed','disputed','cancelled']
    WHEN 'payment_failed'     THEN ARRAY['pending','payment_authorized','paid','cancelled']
    WHEN 'paid'               THEN ARRAY['confirmed','buyer_confirmed','seller_confirmed','disputed','refunded','completed']
    WHEN 'buyer_confirmed'    THEN ARRAY['completed','disputed','refunded']
    WHEN 'seller_confirmed'   THEN ARRAY['completed','disputed','refunded']
    WHEN 'confirmed'          THEN ARRAY['completed','disputed','refunded']
    WHEN 'disputed'           THEN ARRAY['refunded','completed','paid','buyer_confirmed','seller_confirmed']
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
