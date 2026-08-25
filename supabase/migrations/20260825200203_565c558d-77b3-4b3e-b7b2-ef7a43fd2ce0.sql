-- Block privilege escalation via INSERT: clients must not be able to create
-- rows that already claim paid / confirmed / fulfilled state. Service-role
-- callers (edge functions, webhooks) are unaffected.

CREATE OR REPLACE FUNCTION public.guard_booking_requests_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.payment_status := 'unpaid';
  NEW.deposit_status := 'pending';
  NEW.hold_status := 'none';
  NEW.status := 'pending'::booking_status;
  NEW.host_confirmed_at := NULL;
  NEW.payment_intent_id := NULL;
  NEW.is_instant_book := COALESCE(
    (SELECT l.instant_book FROM public.listings l WHERE l.id = NEW.listing_id),
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_booking_requests_insert ON public.booking_requests;
CREATE TRIGGER trg_guard_booking_requests_insert
BEFORE INSERT ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_booking_requests_insert();


CREATE OR REPLACE FUNCTION public.guard_monetization_purchases_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.status := 'pending'::monetization_purchase_status;
  NEW.fulfillment_status := 'pending';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_monetization_purchases_insert ON public.monetization_purchases;
CREATE TRIGGER trg_guard_monetization_purchases_insert
BEFORE INSERT ON public.monetization_purchases
FOR EACH ROW EXECUTE FUNCTION public.guard_monetization_purchases_insert();


CREATE OR REPLACE FUNCTION public.guard_sale_transactions_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.status := 'pending';
  NEW.payment_intent_id := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_sale_transactions_insert ON public.sale_transactions;
CREATE TRIGGER trg_guard_sale_transactions_insert
BEFORE INSERT ON public.sale_transactions
FOR EACH ROW EXECUTE FUNCTION public.guard_sale_transactions_insert();