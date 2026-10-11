CREATE OR REPLACE FUNCTION public.enforce_publish_requirements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_becoming_published boolean;
  v_photos int;
  v_static boolean;
  v_titled boolean;
  v_m text[];
  v_city text;
  v_state text;
  v_zip text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_becoming_published := (NEW.status = 'published'::listing_status);
  ELSE
    v_becoming_published := (
      NEW.status = 'published'::listing_status
      AND OLD.status IS DISTINCT FROM 'published'::listing_status
    );
  END IF;

  IF NOT v_becoming_published THEN
    RETURN NEW;
  END IF;

  IF NEW.category IS NULL OR NEW.mode IS NULL THEN
    RAISE EXCEPTION 'publish_incomplete:category_mode' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.title IS NULL OR length(btrim(NEW.title)) < 5 THEN
    RAISE EXCEPTION 'publish_incomplete:title' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.description IS NULL OR length(btrim(NEW.description)) < 50 THEN
    RAISE EXCEPTION 'publish_incomplete:description' USING ERRCODE = 'P0001';
  END IF;

  v_photos := COALESCE(array_length(NEW.image_urls, 1), 0);
  IF v_photos < 3 THEN
    RAISE EXCEPTION 'publish_incomplete:photos' USING ERRCODE = 'P0001';
  END IF;

  -- Backfill blank structured location fields from the stored verified
  -- address before enforcing. Never overwrites a nonblank city/state and
  -- never infers a locality from title/description.
  IF NEW.city IS NULL OR btrim(COALESCE(NEW.city, '')) = ''
     OR NEW.state IS NULL OR btrim(COALESCE(NEW.state, '')) = '' THEN

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

  IF NEW.city IS NULL OR btrim(NEW.city) = '' OR NEW.state IS NULL OR btrim(NEW.state) = '' THEN
    RAISE EXCEPTION 'publish_incomplete:location' USING ERRCODE = 'P0001';
  END IF;

  v_static := NEW.category IN (
    'ghost_kitchen'::listing_category,
    'vendor_lot'::listing_category,
    'vendor_space'::listing_category
  );
  v_titled := NEW.category IN (
    'food_truck'::listing_category,
    'food_trailer'::listing_category
  );

  IF NEW.fulfillment_type IS NULL THEN
    RAISE EXCEPTION 'publish_incomplete:fulfillment' USING ERRCODE = 'P0001';
  END IF;

  IF v_static THEN
    IF NEW.fulfillment_type <> 'on_site'::fulfillment_type THEN
      RAISE EXCEPTION 'publish_incomplete:fulfillment_on_site' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.address IS NULL OR btrim(NEW.address) = '' THEN
      RAISE EXCEPTION 'publish_incomplete:address' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Pricing + payment options by mode.
  IF NEW.mode = 'sale'::listing_mode THEN
    IF COALESCE(NEW.price_sale, 0) <= 0 THEN
      RAISE EXCEPTION 'publish_incomplete:price_sale' USING ERRCODE = 'P0001';
    END IF;
    IF NOT (COALESCE(NEW.accept_paypal_checkout, false) OR COALESCE(NEW.accept_cash_payment, false)) THEN
      RAISE EXCEPTION 'publish_incomplete:payment_option' USING ERRCODE = 'P0001';
    END IF;
    IF v_titled AND (NEW.title_status IS NULL OR btrim(NEW.title_status) = '') THEN
      RAISE EXCEPTION 'publish_incomplete:title_status' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF COALESCE(NEW.price_daily, 0) <= 0
       AND COALESCE(NEW.price_weekly, 0) <= 0
       AND COALESCE(NEW.price_monthly, 0) <= 0
       AND COALESCE(NEW.price_hourly, 0) <= 0 THEN
      RAISE EXCEPTION 'publish_incomplete:price_rent' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;