-- Regression tests for the publish-time structured-location backfill in
-- trg_enforce_publish_requirements. Runs in a single transaction and
-- ROLLBACKs at the end so it leaves no test data behind. Executed via psql -f.
BEGIN;

DO $$
DECLARE
  v_listing uuid := 'c0ffee00-0000-4000-8000-000000000001';
  v_host    uuid := 'c0ffee00-0000-4000-8000-000000000002';
  v_city    text;
  v_state   text;
  v_zip     text;
  v_err     text;
BEGIN
  ---------------------------------------------------------------------------
  RAISE NOTICE 'TEST 1: blank city/state are backfilled from the stored structured address at publish';
  INSERT INTO public.listings
    (id, host_id, mode, category, status, title, description, image_urls,
     fulfillment_type, address, city, state, postal_code,
     price_sale, accept_paypal_checkout, title_status)
  VALUES
    (v_listing, v_host, 'sale', 'food_truck', 'draft',
     'Regression test truck',
     'A sufficiently long description for the publish gate to accept this listing row.',
     ARRAY['https://example.com/1.jpg','https://example.com/2.jpg','https://example.com/3.jpg'],
     'pickup', '2435 Shoal Creek Rd, Colbert, GA 30628', NULL, NULL, NULL,
     10000, true, 'clean');

  UPDATE public.listings SET status = 'published' WHERE id = v_listing;

  SELECT city, state, postal_code INTO v_city, v_state, v_zip
    FROM public.listings WHERE id = v_listing;

  IF v_city IS DISTINCT FROM 'Colbert' OR v_state IS DISTINCT FROM 'GA' OR v_zip IS DISTINCT FROM '30628' THEN
    RAISE EXCEPTION 'FAIL: expected backfilled Colbert/GA/30628, got %/%/%', v_city, v_state, v_zip;
  END IF;
  RAISE NOTICE '  PASS (%, %, %)', v_city, v_state, v_zip;

  ---------------------------------------------------------------------------
  RAISE NOTICE 'TEST 2: a nonblank city is never overwritten by the backfill';
  UPDATE public.listings
     SET status = 'paused', city = 'Colbert', state = 'GA',
         address = '999 Somewhere Else, Athens, GA 30601'
   WHERE id = v_listing;
  UPDATE public.listings SET status = 'published' WHERE id = v_listing;

  SELECT city, postal_code INTO v_city, v_zip FROM public.listings WHERE id = v_listing;
  IF v_city IS DISTINCT FROM 'Colbert' OR v_zip IS DISTINCT FROM '30628' THEN
    RAISE EXCEPTION 'FAIL: existing city/postal were overwritten (% / %)', v_city, v_zip;
  END IF;
  RAISE NOTICE '  PASS (city/postal preserved: %, %)', v_city, v_zip;

  ---------------------------------------------------------------------------
  RAISE NOTICE 'TEST 3: publish still fails when no parseable location exists anywhere';
  UPDATE public.listings
     SET status = 'paused', city = NULL, state = NULL, postal_code = NULL,
         address = 'somewhere vague', pickup_location_text = NULL
   WHERE id = v_listing;
  BEGIN
    UPDATE public.listings SET status = 'published' WHERE id = v_listing;
    RAISE EXCEPTION 'FAIL: publish should have been rejected without any location';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err <> 'publish_incomplete:location' THEN RAISE; END IF;
    RAISE NOTICE '  PASS (%)', v_err;
  END;

  ---------------------------------------------------------------------------
  RAISE NOTICE 'TEST 4: "City, ST" pickup text backfills city/state when address is unstructured';
  UPDATE public.listings
     SET address = 'somewhere vague', pickup_location_text = 'Bethlehem, GA'
   WHERE id = v_listing;
  UPDATE public.listings SET status = 'published' WHERE id = v_listing;

  SELECT city, state INTO v_city, v_state FROM public.listings WHERE id = v_listing;
  IF v_city IS DISTINCT FROM 'Bethlehem' OR v_state IS DISTINCT FROM 'GA' THEN
    RAISE EXCEPTION 'FAIL: expected Bethlehem/GA from pickup text, got %/%', v_city, v_state;
  END IF;
  RAISE NOTICE '  PASS (%, %)', v_city, v_state;

  RAISE NOTICE 'ALL LOCATION BACKFILL TESTS PASSED';
END $$;

ROLLBACK;
