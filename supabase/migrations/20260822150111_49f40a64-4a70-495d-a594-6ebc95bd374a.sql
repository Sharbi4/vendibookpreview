CREATE OR REPLACE FUNCTION public.enforce_publish_requirements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requirements boolean;
  v_photo_count integer;
  v_is_rent boolean;
  v_is_sale boolean;
  v_is_sale_with_card boolean;
  v_has_title boolean;
  v_has_desc boolean;
  v_has_loc boolean;
  v_rental_ok boolean;
  v_sale_ok boolean;
  v_pay_ok boolean;
  v_m text[];
  v_city text;
  v_state text;
  v_zip text;
BEGIN
  IF NOT (NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published') THEN
    RETURN NEW;
  END IF;

  -- Test-listing exemption is enforced separately by
  -- enforce_no_test_listing_publish (listings has no is_test_listing column).

  v_requirements := COALESCE(NEW.publish_requirements_enabled, true);
  IF NOT v_requirements THEN
    RETURN NEW;
  END IF;

  v_photo_count := CASE WHEN NEW.image_urls IS NULL THEN 0 ELSE cardinality(NEW.image_urls) END;
  v_is_rent := (NEW.mode = 'rent');
  v_is_sale := (NEW.mode = 'sale');
  v_is_sale_with_card := (v_is_sale AND COALESCE(NEW.accept_paypal_checkout, COALESCE(NEW.accept_card_payment, false)));

  v_has_title := (btrim(COALESCE(NEW.title, '')) <> '');
  v_has_desc := (char_length(btrim(COALESCE(NEW.description, ''))) >= 50);

  -- Backfill blank structured location fields from the stored verified
  -- address before enforcing. Never overwrites a nonblank city/state and
  -- never infers a locality from title/description.
  IF NULLIF(btrim(COALESCE(NEW.city, '')), '') IS NULL
     OR NULLIF(btrim(COALESCE(NEW.state, '')), '') IS NULL THEN

    v_city := NULL; v_state := NULL; v_zip := NULL;

    IF NEW.address IS NOT NULL THEN
      -- "Street..., City, ST 12345(, USA)" — structured geocoder output.
      v_m := regexp_match(
        btrim(NEW.address),
        ',\s*([^,]+?),\s*([A-Za-z]{2})\s+(\d{5})(?:-\d{4})?\s*(?:,\s*(?:US|USA|United States))?$',
        'i');
      IF v_m IS NULL THEN
        -- "City, ST" short form stored in the address column.
        v_m := regexp_match(btrim(NEW.address), '^([^,]+),\s*([A-Za-z]{2})$', 'i');
      END IF;
      IF v_m IS NOT NULL THEN
        v_city := btrim(v_m[1]);
        v_state := upper(v_m[2]);
        v_zip := v_m[3];
      END IF;
    END IF;

    IF v_city IS NULL AND NEW.pickup_location_text IS NOT NULL THEN
      -- Approximate public location text is stored as "City, ST".
      v_m := regexp_match(btrim(NEW.pickup_location_text), '^([^,]+),\s*([A-Za-z]{2})$', 'i');
      IF v_m IS NOT NULL THEN
        v_city := btrim(v_m[1]);
        v_state := upper(v_m[2]);
      END IF;
    END IF;

    IF v_city IS NOT NULL THEN
      NEW.city := COALESCE(NULLIF(btrim(COALESCE(NEW.city, '')), ''), v_city);
      NEW.state := COALESCE(NULLIF(btrim(COALESCE(NEW.state, '')), ''), v_state);
      NEW.postal_code := COALESCE(NULLIF(btrim(COALESCE(NEW.postal_code, '')), ''), v_zip);
    END IF;
  END IF;

  v_has_loc := (
    NULLIF(btrim(COALESCE(NEW.city, '')), '') IS NOT NULL
    AND NULLIF(btrim(COALESCE(NEW.state, '')), '') IS NOT NULL
  );

  IF v_is_rent THEN
    v_rental_ok := (
      COALESCE(NEW.price_daily, 0) > 0
      OR COALESCE(NEW.price_hourly, 0) > 0
      OR COALESCE(NEW.price_weekly, 0) > 0
      OR COALESCE(NEW.price_monthly, 0) > 0
    );
  ELSE
    v_rental_ok := true;
  END IF;

  v_sale_ok := true;
  v_pay_ok := true;
  IF v_is_sale THEN
    v_sale_ok := (
      COALESCE(NEW.price_sale, 0) > 0
      AND (COALESCE(NEW.accept_cash_payment, false) OR COALESCE(NEW.accept_paypal_checkout, COALESCE(NEW.accept_card_payment, false)))
    );
    IF v_is_sale_with_card THEN
      v_pay_ok := (COALESCE(NEW.title_status, '') <> '');
    END IF;
  END IF;

  IF NOT v_has_title THEN
    RAISE EXCEPTION 'publish_incomplete:title';
  ELSIF NOT v_has_desc THEN
    RAISE EXCEPTION 'publish_incomplete:description';
  ELSIF v_photo_count < 3 THEN
    RAISE EXCEPTION 'publish_incomplete:photos';
  ELSIF NOT v_has_loc THEN
    RAISE EXCEPTION 'publish_incomplete:location';
  ELSIF v_is_rent AND NOT v_rental_ok THEN
    RAISE EXCEPTION 'publish_incomplete:pricing';
  ELSIF v_is_sale AND NOT v_sale_ok THEN
    RAISE EXCEPTION 'publish_incomplete:pricing';
  ELSIF v_is_sale_with_card AND NOT v_pay_ok THEN
    RAISE EXCEPTION 'publish_incomplete:payments';
  END IF;

  RETURN NEW;
END;
$$;