-- Rental-only safeguards. No provider environment or sale billing changes.
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS renter_snapshot jsonb;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS payment_lock_record_id uuid;
COMMENT ON COLUMN public.booking_requests.renter_snapshot IS 'Contact/address accepted for this transaction, independent of profile and delivery address. No card data.';

-- Preserve the requested flow in BOTH pre-existing insert guards.
DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.secure_booking_request_financials()'::regprocedure) INTO definition;
  definition := replace(definition, 'NEW.is_instant_book := coalesce(l.instant_book, false);',
    'NEW.is_instant_book := coalesce(NEW.is_instant_book, false) AND coalesce(l.instant_book, false) AND public.is_seller_identity_verified(l.host_id);');
  EXECUTE definition;
END $$;
CREATE OR REPLACE FUNCTION public.guard_booking_requests_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    NEW.payment_status := 'unpaid'; NEW.deposit_status := 'pending'; NEW.hold_status := 'none';
    NEW.status := 'pending'; NEW.host_confirmed_at := NULL; NEW.payment_intent_id := NULL;
  END IF;
  NEW.is_instant_book := coalesce(NEW.is_instant_book, false) AND EXISTS (
    SELECT 1 FROM public.listings l WHERE l.id = NEW.listing_id AND l.instant_book
      AND public.is_seller_identity_verified(l.host_id));
  RETURN NEW;
END $$;

-- JSONB canonical ordering makes retries deterministic; all order-defining fields
-- participate, even when a change leaves the monetary total unchanged.
CREATE OR REPLACE FUNCTION public.rental_checkout_fingerprint(b jsonb) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
 SELECT md5(jsonb_build_array(b->'listing_id', b->'shopper_id', b->'host_id',
   b->'start_date', b->'end_date', b->'start_time', b->'end_time', b->'duration_hours',
   b->'is_hourly_booking', b->'hourly_slots', b->'slot_number', b->'slot_name',
   b->'fulfillment_selected', b->'delivery_address', b->'delivery_instructions',
   b->'is_instant_book', b->'total_price', b->'deposit_amount', b->'delivery_fee_snapshot',
   b->'renter_snapshot', b->'business_info')::text)
$$;

-- Match quoteRentalPeriod's cheapest covering daily/weekly/monthly quote.
CREATE OR REPLACE FUNCTION public.rental_period_subtotal(days integer, daily numeric, weekly numeric, monthly numeric)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE costs numeric[] := ARRAY[0::numeric]; d integer; best numeric;
BEGIN
 IF days < 1 OR days > 3660 THEN RAISE EXCEPTION 'Invalid rental duration'; END IF;
 FOR d IN 1..days LOOP
   best := NULL;
   IF daily > 0 THEN best := costs[d] + daily; END IF;
   IF weekly > 0 THEN best := least(best, costs[greatest(0,d-7)+1] + weekly); END IF;
   IF monthly > 0 THEN best := least(best, costs[greatest(0,d-30)+1] + monthly); END IF;
   IF best IS NULL THEN RAISE EXCEPTION 'Rental price unavailable'; END IF;
   costs := array_append(costs,best);
 END LOOP;
 RETURN costs[days+1];
END $$;

CREATE OR REPLACE FUNCTION public.guard_rental_checkout_snapshot() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE changed boolean; c jsonb; rate_listing public.listings; base numeric; delivery numeric; hourly_count integer; unique_count integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    changed := public.rental_checkout_fingerprint(to_jsonb(NEW)) <> public.rental_checkout_fingerprint(to_jsonb(OLD));
    IF changed AND (OLD.payment_lock_record_id IS NOT NULL OR OLD.payment_status = 'paid' OR OLD.status <> 'pending') THEN
      RAISE EXCEPTION 'This booking is locked for payment or already approved. Contact support to change its terms.';
    END IF;
    IF OLD.payment_lock_record_id IS NOT NULL AND NEW.status IN ('declined','cancelled') AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Payment is being verified. Resolve the payment before closing this booking.';
    END IF;
    IF coalesce(auth.role(), '') <> 'service_role' THEN
      NEW.payment_lock_record_id := OLD.payment_lock_record_id;
      IF NEW.is_instant_book IS DISTINCT FROM OLD.is_instant_book THEN
        RAISE EXCEPTION 'The booking flow cannot change after submission';
      END IF;
    END IF;
    IF NOT changed THEN RETURN NEW; END IF;
  ELSE
    NEW.payment_lock_record_id := NULL;
  END IF;
  IF NEW.shopper_id = NEW.host_id THEN RAISE EXCEPTION 'You cannot book your own listing'; END IF;
  IF NEW.start_date IS NULL OR NEW.end_date IS NULL OR NEW.end_date < NEW.start_date THEN RAISE EXCEPTION 'Select valid rental dates'; END IF;
  IF NEW.fulfillment_selected IS NULL OR NEW.fulfillment_selected NOT IN ('pickup','delivery','on_site') THEN RAISE EXCEPTION 'Select fulfillment'; END IF;
  IF NEW.fulfillment_selected = 'delivery' AND nullif(trim(NEW.delivery_address), '') IS NULL THEN RAISE EXCEPTION 'Delivery address is required'; END IF;
  IF EXISTS(SELECT 1 FROM public.listings l WHERE l.id=NEW.listing_id AND coalesce(l.total_slots,1)>1 AND
     (NEW.slot_number IS NULL OR NEW.slot_number<1 OR NEW.slot_number>l.total_slots)) THEN RAISE EXCEPTION 'Select a valid space'; END IF;
  c := NEW.renter_snapshot;
  IF c IS NULL OR EXISTS(SELECT 1 FROM unnest(ARRAY['first_name','last_name','phone_number','address1','city','state','zip_code']) k WHERE nullif(trim(c->>k),'') IS NULL)
    OR c->>'state' !~ '^[A-Za-z]{2}$' OR c->>'zip_code' !~ '^[0-9]{5}(-[0-9]{4})?$'
    OR regexp_replace(c->>'phone_number','[^0-9]','','g') !~ '^1?[2-9][0-9]{2}[2-9][0-9]{6}$'
  THEN RAISE EXCEPTION 'Complete renter contact and personal address'; END IF;
  IF EXISTS(SELECT 1 FROM public.listings l WHERE l.id=NEW.listing_id AND l.category IN ('food_truck','food_trailer','ghost_kitchen')) AND
    (EXISTS(SELECT 1 FROM unnest(ARRAY['licenseType','employeeCount','intendedUse','cuisineType']) k WHERE nullif(trim(NEW.business_info->>k),'') IS NULL)
     OR (NEW.business_info->>'licenseType'='other' AND nullif(trim(NEW.business_info->>'licenseTypeOther'),'') IS NULL))
  THEN RAISE EXCEPTION 'Complete required business information'; END IF;
  SELECT * INTO rate_listing FROM public.listings WHERE id=NEW.listing_id;
  IF NEW.is_hourly_booking THEN
    IF rate_listing.price_hourly IS NULL OR jsonb_typeof(NEW.hourly_slots) IS DISTINCT FROM 'array' OR jsonb_array_length(NEW.hourly_slots)=0 THEN RAISE EXCEPTION 'Select hourly rental slots'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.hourly_slots) d WHERE jsonb_typeof(d->'slots') IS DISTINCT FROM 'array'
      OR (d->>'date')::date NOT BETWEEN NEW.start_date AND NEW.end_date) THEN RAISE EXCEPTION 'Invalid hourly rental dates'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.hourly_slots) d, jsonb_array_elements_text(d->'slots') h
      WHERE h !~ '^([01][0-9]|2[0-3]):00$') THEN RAISE EXCEPTION 'Invalid hourly rental slot'; END IF;
    SELECT count(*),count(DISTINCT (d->>'date') || ':' || h) INTO hourly_count,unique_count
      FROM jsonb_array_elements(NEW.hourly_slots) d, jsonb_array_elements_text(d->'slots') h;
    IF hourly_count=0 OR hourly_count<>unique_count THEN RAISE EXCEPTION 'Invalid or duplicate rental hours'; END IF;
    NEW.duration_hours := hourly_count;
    base := rate_listing.price_hourly * NEW.duration_hours;
  ELSE
    base := public.rental_period_subtotal(NEW.end_date-NEW.start_date+1,rate_listing.price_daily,rate_listing.price_weekly,rate_listing.price_monthly);
  END IF;
  delivery := CASE WHEN NEW.fulfillment_selected='delivery' THEN coalesce(rate_listing.delivery_fee,0) ELSE 0 END;
  NEW.delivery_fee_snapshot := CASE WHEN NEW.fulfillment_selected='delivery' THEN rate_listing.delivery_fee ELSE NULL END;
  NEW.deposit_amount := rate_listing.deposit_amount;
  NEW.total_price := round(base+delivery+round((base+delivery)*0.129,2),2);
  NEW.renter_snapshot := jsonb_build_object('first_name',c->>'first_name','last_name',c->>'last_name',
    'phone_number',c->>'phone_number','address1',c->>'address1','address2',c->>'address2',
    'city',c->>'city','state',c->>'state','zip_code',c->>'zip_code',
    'email',coalesce(nullif(auth.jwt()->>'email',''),c->>'email'));
  RETURN NEW;
END $$;
CREATE TRIGGER zz_rental_checkout_snapshot BEFORE INSERT OR UPDATE ON public.booking_requests
 FOR EACH ROW EXECUTE FUNCTION public.guard_rental_checkout_snapshot();

-- Serializes capture BEFORE contacting PayPal. An ambiguous/pending capture keeps
-- its lock; a different order can never capture until a definitive failure.
CREATE OR REPLACE FUNCTION public.claim_rental_capture(p_record uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.payment_records; b public.booking_requests;
BEGIN
  SELECT * INTO p FROM public.payment_records WHERE id=p_record;
  IF p.booking_request_id IS NULL THEN RAISE EXCEPTION 'Rental payment not found'; END IF;
  SELECT * INTO b FROM public.booking_requests WHERE id=p.booking_request_id FOR UPDATE;
  IF b.shopper_id = b.host_id OR p.buyer_id IS DISTINCT FROM b.shopper_id THEN RAISE EXCEPTION 'Invalid renter'; END IF;
  IF b.payment_status='paid' AND b.payment_lock_record_id=p_record THEN RETURN; END IF;
  IF b.payment_status='paid' OR EXISTS(SELECT 1 FROM public.payment_records WHERE booking_request_id=b.id AND payment_status='completed' AND id<>p_record) THEN
    RAISE EXCEPTION 'This booking is already paid'; END IF;
  IF b.status IN ('declined','cancelled') OR NOT (b.status='approved' OR (b.is_instant_book AND public.is_seller_identity_verified(b.host_id))) THEN
    RAISE EXCEPTION 'The host must approve before payment'; END IF;
  IF p.fee_breakdown->>'rental_fingerprint' IS DISTINCT FROM public.rental_checkout_fingerprint(to_jsonb(b)) THEN
    RAISE EXCEPTION 'Booking changed. Return to the booking payment step to create a fresh PayPal order'; END IF;
  IF b.payment_lock_record_id IS NOT NULL AND b.payment_lock_record_id<>p_record THEN
    RAISE EXCEPTION 'Another payment is being verified. Check its status before paying again'; END IF;
  UPDATE public.booking_requests SET payment_lock_record_id=p_record WHERE id=b.id;
END $$;
REVOKE ALL ON FUNCTION public.claim_rental_capture(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rental_capture(uuid) TO service_role;

-- Race-safe in-app notification key; email queue already has stable event keys.
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS booking_event_key text;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_booking_event_unique ON public.notifications(user_id,booking_event_key) WHERE booking_event_key IS NOT NULL;
-- The event endpoint owns booking notifications; old generic triggers duplicated
-- them and announced instant bookings before payment verification.
DROP TRIGGER IF EXISTS on_new_booking_request ON public.booking_requests;
DROP TRIGGER IF EXISTS on_booking_status_change ON public.booking_requests;

-- Keep the established cancellation notification; approval/decline are owned
-- by the authenticated event endpoint and must not be sent twice.
DO $$ BEGIN
 IF to_regprocedure('public.notify_booking_status_change()') IS NOT NULL THEN
   CREATE TRIGGER on_booking_status_change AFTER UPDATE ON public.booking_requests
     FOR EACH ROW WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status)
     EXECUTE FUNCTION public.notify_booking_status_change();
 END IF;
END $$;
