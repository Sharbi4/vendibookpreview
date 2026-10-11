-- Server-side enforcement of booking financial fields at INSERT time.
-- The UPDATE guard (trg_guard_booking_request_user_update) already locks these
-- columns after creation; this closes the INSERT gap so a shopper cannot forge
-- total_price, delivery_fee_snapshot, deposit_amount, or host fee fields.
-- Values are recomputed from the listing exactly like src/lib/commissions.ts
-- calculateRentalFees() (12.9% renter service fee), mirroring the existing
-- validate_sale_transaction_insert() pattern.

CREATE OR REPLACE FUNCTION public.validate_booking_request_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role          text := current_setting('role', true);
  v_price_daily   numeric;
  v_price_weekly  numeric;
  v_price_hourly  numeric;
  v_delivery_fee  numeric;
  v_deposit       numeric;
  v_host          uuid;
  v_days          integer;
  v_weeks         integer;
  v_rem           integer;
  v_base          numeric;
  v_delivery      numeric;
  v_subtotal      numeric;
  v_renter_fee    numeric;
BEGIN
  -- Edge functions / payment webhooks (service role) are authoritative and
  -- may legitimately set custom amounts (e.g. concierge-negotiated totals).
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Defense in depth alongside the RLS WITH CHECK: a shopper can only create
  -- a booking for themselves.
  IF auth.uid() IS NULL OR NEW.shopper_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'shopper_id must match the authenticated user'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT price_daily, price_weekly, price_hourly, delivery_fee, deposit_amount, host_id
    INTO v_price_daily, v_price_weekly, v_price_hourly, v_delivery_fee, v_deposit, v_host
    FROM public.listings
   WHERE id = NEW.listing_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing % not found', NEW.listing_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Host is always the listing owner, never client-supplied.
  NEW.host_id := v_host;

  -- Host-side fee fields are computed by payment capture (service role);
  -- they must never be seeded by the client.
  NEW.host_platform_fee := NULL;
  NEW.host_fee_rate_pct := NULL;

  -- Deposit is whatever the host configured on the listing.
  NEW.deposit_amount := v_deposit;

  -- Delivery fee snapshot comes from the listing, not the client.
  IF NEW.fulfillment_selected = 'delivery' THEN
    NEW.delivery_fee_snapshot := v_delivery_fee;
    v_delivery := COALESCE(v_delivery_fee, 0);
  ELSE
    NEW.delivery_fee_snapshot := NULL;
    v_delivery := 0;
  END IF;

  -- Recompute the renter total from listing prices + 12.9% service fee.
  v_base := NULL;
  IF COALESCE(NEW.is_hourly_booking, false) AND v_price_hourly IS NOT NULL
     AND COALESCE(NEW.duration_hours, 0) > 0 THEN
    v_base := NEW.duration_hours * v_price_hourly;
  ELSIF v_price_daily IS NOT NULL AND NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    v_days := (NEW.end_date::date - NEW.start_date::date) + 1;
    IF v_days >= 1 THEN
      v_weeks := v_days / 7;  -- integer division
      v_rem   := v_days % 7;
      IF v_price_weekly IS NOT NULL AND v_weeks > 0 THEN
        v_base := v_weeks * v_price_weekly + v_rem * v_price_daily;
      ELSE
        v_base := v_days * v_price_daily;
      END IF;
    END IF;
  END IF;

  IF v_base IS NOT NULL THEN
    v_subtotal   := round(v_base + v_delivery, 2);
    v_renter_fee := round(v_subtotal * 0.129, 2);
    -- Force the server-computed total; ignore anything the client supplied.
    NEW.total_price := round(v_subtotal + v_renter_fee, 2);
  ELSIF COALESCE(NEW.total_price, 0) < 0 THEN
    RAISE EXCEPTION 'total_price cannot be negative'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_booking_request_insert ON public.booking_requests;
CREATE TRIGGER trg_validate_booking_request_insert
  BEFORE INSERT ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_request_insert();