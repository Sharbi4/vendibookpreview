-- Harden the quick-start draft and final publish boundaries. The browser can
-- provide a friendly guided flow, but these guarantees must live in Postgres.

-- One atomic, retry-safe draft creator. The existing idempotency table avoids
-- adding an internal request key to public listing rows.
CREATE OR REPLACE FUNCTION public.create_listing_draft_idempotent(
  p_user_id uuid,
  p_idempotency_key text,
  p_mode public.listing_mode,
  p_category public.listing_category,
  p_fulfillment_type public.fulfillment_type,
  p_pickup_location_text text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL
)
RETURNS TABLE(id uuid, replayed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_id uuid;
BEGIN
  IF p_user_id IS NULL
     OR p_idempotency_key IS NULL
     OR length(btrim(p_idempotency_key)) < 16 THEN
    RAISE EXCEPTION 'invalid_draft_request' USING ERRCODE = '22023';
  END IF;

  -- Serialize the full read/create/cache transaction for this user + key.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'create-listing-draft:' || p_user_id::text || ':' || p_idempotency_key,
      0
    )
  );

  SELECT (e.response ->> 'id')::uuid
    INTO v_listing_id
  FROM public.edge_action_idempotency AS e
  WHERE e.action = 'create-listing-draft'
    AND e.idempotency_key = p_idempotency_key
    AND e.user_id = p_user_id;

  IF v_listing_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.listings AS existing
       WHERE existing.id = v_listing_id
         AND existing.host_id = p_user_id
         AND existing.deleted_at IS NULL
     ) THEN
    RETURN QUERY SELECT v_listing_id, true;
    RETURN;
  END IF;

  INSERT INTO public.listings (
    host_id,
    guest_draft_token,
    mode,
    category,
    status,
    title,
    description,
    fulfillment_type,
    address,
    pickup_location_text,
    city,
    state,
    postal_code,
    latitude,
    longitude,
    accept_paypal_checkout,
    accept_cash_payment
  )
  VALUES (
    p_user_id,
    NULL,
    p_mode,
    p_category,
    'draft'::public.listing_status,
    '',
    '',
    p_fulfillment_type,
    NULL, -- Full private street address is collected later.
    NULLIF(btrim(p_pickup_location_text), ''),
    NULLIF(btrim(p_city), ''),
    NULLIF(btrim(p_state), ''),
    NULLIF(btrim(p_postal_code), ''),
    p_latitude,
    p_longitude,
    true,  -- NOT NULL in the canonical PayPal schema.
    false
  )
  RETURNING listings.id INTO v_listing_id;

  INSERT INTO public.edge_action_idempotency (
    action,
    idempotency_key,
    user_id,
    response
  )
  VALUES (
    'create-listing-draft',
    p_idempotency_key,
    p_user_id,
    jsonb_build_object('id', v_listing_id)
  )
  ON CONFLICT (action, idempotency_key, user_id)
  DO UPDATE SET
    response = EXCLUDED.response,
    created_at = now();

  RETURN QUERY SELECT v_listing_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.create_listing_draft_idempotent(
  uuid,
  text,
  public.listing_mode,
  public.listing_category,
  public.fulfillment_type,
  text,
  text,
  text,
  text,
  numeric,
  numeric
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_listing_draft_idempotent(
  uuid,
  text,
  public.listing_mode,
  public.listing_category,
  public.fulfillment_type,
  text,
  text,
  text,
  text,
  numeric,
  numeric
) TO service_role;

-- Keep the final database gate in lockstep with the fields the current wizard
-- marks required. This blocks crafted/stale clients without adding unrelated
-- identity, payout, financing, VIN, membership, or paid-add-on gates.
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
  v_problem_count int;
  v_problem jsonb;
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

  IF NEW.city IS NULL OR btrim(NEW.city) = ''
     OR NEW.state IS NULL OR btrim(NEW.state) = ''
     OR NEW.postal_code IS NULL OR NEW.postal_code !~ '^[0-9]{5}$' THEN
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

  IF NEW.condition IS NULL OR btrim(NEW.condition) = '' THEN
    RAISE EXCEPTION 'publish_incomplete:condition' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.operational_status IS NULL OR btrim(NEW.operational_status) = '' THEN
    RAISE EXCEPTION 'publish_incomplete:operational_status' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.category = 'food_truck'::listing_category
     AND NEW.operational_status NOT IN ('runs_drives', 'runs_not_drivable', 'not_running', 'unknown') THEN
    RAISE EXCEPTION 'publish_invalid:operational_status' USING ERRCODE = 'P0001';
  ELSIF NEW.category = 'food_trailer'::listing_category
     AND NEW.operational_status NOT IN ('towable', 'not_towable', 'unknown') THEN
    RAISE EXCEPTION 'publish_invalid:operational_status' USING ERRCODE = 'P0001';
  ELSIF v_static
     AND NEW.operational_status NOT IN ('operational', 'needs_work', 'unknown') THEN
    RAISE EXCEPTION 'publish_invalid:operational_status' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.included_items IS NULL OR length(btrim(NEW.included_items)) < 3 THEN
    RAISE EXCEPTION 'publish_incomplete:included_items' USING ERRCODE = 'P0001';
  END IF;
  IF NOT COALESCE(NEW.photos_exclusions_answered, false) THEN
    RAISE EXCEPTION 'publish_incomplete:photos_exclusions' USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(COALESCE(NEW.known_problems, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'publish_invalid:known_problems' USING ERRCODE = 'P0001';
  END IF;
  v_problem_count := jsonb_array_length(COALESCE(NEW.known_problems, '[]'::jsonb));

  IF COALESCE(NEW.no_known_problems, false) THEN
    IF v_problem_count > 0 THEN
      RAISE EXCEPTION 'publish_conflict:known_problems' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF v_problem_count = 0 THEN
      RAISE EXCEPTION 'publish_incomplete:known_problems' USING ERRCODE = 'P0001';
    END IF;
    FOR v_problem IN
      SELECT value FROM jsonb_array_elements(NEW.known_problems)
    LOOP
      IF jsonb_typeof(v_problem) <> 'object'
         OR length(btrim(COALESCE(v_problem ->> 'category', ''))) = 0
         OR length(btrim(COALESCE(v_problem ->> 'note', ''))) < 3 THEN
        RAISE EXCEPTION 'publish_incomplete:known_problem_detail' USING ERRCODE = 'P0001';
      END IF;
    END LOOP;
  END IF;

  IF NEW.fulfillment_type IS NULL THEN
    RAISE EXCEPTION 'publish_incomplete:fulfillment' USING ERRCODE = 'P0001';
  END IF;
  IF v_static AND NEW.fulfillment_type <> 'on_site'::fulfillment_type THEN
    RAISE EXCEPTION 'publish_incomplete:fulfillment_on_site' USING ERRCODE = 'P0001';
  END IF;

  -- Static listings, all rentals, and sale pickup/both need a private street
  -- address. Mobile sale listings set to delivery-only may publish with city,
  -- state and ZIP, matching the seller-facing wizard.
  IF (
    v_static
    OR NEW.mode = 'rent'::listing_mode
    OR NEW.fulfillment_type IN ('pickup'::fulfillment_type, 'both'::fulfillment_type, 'on_site'::fulfillment_type)
  ) AND (NEW.address IS NULL OR btrim(NEW.address) = '') THEN
    RAISE EXCEPTION 'publish_incomplete:address' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.mode = 'sale'::listing_mode THEN
    IF COALESCE(NEW.price_sale, 0) <= 0 THEN
      RAISE EXCEPTION 'publish_incomplete:price_sale' USING ERRCODE = 'P0001';
    END IF;
    IF NOT (COALESCE(NEW.accept_paypal_checkout, false) OR COALESCE(NEW.accept_cash_payment, false)) THEN
      RAISE EXCEPTION 'publish_incomplete:payment_option' USING ERRCODE = 'P0001';
    END IF;
    IF v_titled THEN
      IF NEW.title_status IS NULL
         OR btrim(NEW.title_status) = ''
         OR NEW.title_status NOT IN ('clean', 'salvage', 'rebuilt', 'bonded', 'no_title', 'not_sure') THEN
        RAISE EXCEPTION 'publish_incomplete:title_status' USING ERRCODE = 'P0001';
      END IF;
      IF NEW.has_lien IS NULL
         OR btrim(NEW.has_lien) = ''
         OR NEW.has_lien NOT IN ('no', 'yes', 'not_sure') THEN
        RAISE EXCEPTION 'publish_incomplete:has_lien' USING ERRCODE = 'P0001';
      END IF;
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
