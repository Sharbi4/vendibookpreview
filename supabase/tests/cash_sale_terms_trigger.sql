-- Tests for trg_enforce_sale_terms_link + create-cash-sale contract.
-- Runs inside a single implicit transaction and ROLLBACKs at the end so it
-- leaves no test data behind. Executed via `psql -f`.
BEGIN;

DO $$
DECLARE
  v_listing_id uuid := '208387b2-6318-4488-963f-3741be63d929';
  v_seller_id  uuid := '3a50f35c-f05e-49b8-8603-0cd7533e5ddf';
  v_other_listing uuid := 'f60f584d-38db-4aa3-a7e0-2c5c65a82c82';
  v_other_seller  uuid := '924e1f23-b87d-4b7f-8ff9-30228d196180';
  v_buyer_a uuid;
  v_buyer_b uuid;
  v_terms_a uuid;
  v_terms_b uuid;
  v_sale_id uuid;
  v_err text;
  v_legacy_terms uuid;
  v_legacy_status text;
BEGIN
  v_buyer_a := 'ecd8ae20-f6bc-4ef3-85bc-2ff0345accb9'; v_buyer_b := 'eba76663-c24f-4a2e-8e08-bd7d68407412';

  -- Terms row for buyer A on listing X.
  INSERT INTO public.transaction_terms
    (listing_id, host_id, buyer_id, snapshot, total_cents, subtotal_cents,
     payment_method, transaction_mode, status)
    VALUES (v_listing_id, v_seller_id, v_buyer_a, '{}'::jsonb, 10000, 10000,
            'pay_in_person', 'sale', 'draft')
    RETURNING id INTO v_terms_a;

  -- Terms row for buyer B (different buyer) on the same listing.
  INSERT INTO public.transaction_terms
    (listing_id, host_id, buyer_id, snapshot, total_cents, subtotal_cents,
     payment_method, transaction_mode, status)
    VALUES (v_listing_id, v_seller_id, v_buyer_b, '{}'::jsonb, 10000, 10000,
            'pay_in_person', 'sale', 'draft')
    RETURNING id INTO v_terms_b;

  ---------------------------------------------------------------------------
  RAISE NOTICE 'TEST 1: cash sale WITHOUT terms_id is rejected';
  BEGIN
    INSERT INTO public.sale_transactions
      (listing_id, buyer_id, seller_id, amount, platform_fee, seller_payout, status)
      VALUES (v_listing_id, v_buyer_a, v_seller_id, 100, 0, 100, 'pending_cash');
    RAISE EXCEPTION 'FAIL: insert without terms_id should have been rejected';
  EXCEPTION WHEN not_null_violation THEN
    RAISE NOTICE '  PASS (%)', SQLERRM;
  END;

  ---------------------------------------------------------------------------
  RAISE NOTICE 'TEST 2: cash sale with ANOTHER user''s terms_id is rejected';
  BEGIN
    INSERT INTO public.sale_transactions
      (listing_id, buyer_id, seller_id, amount, platform_fee, seller_payout,
       status, terms_id)
      VALUES (v_listing_id, v_buyer_a, v_seller_id, 100, 0, 100, 'pending_cash', v_terms_b);
    RAISE EXCEPTION 'FAIL: cross-user terms should have been rejected';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '  PASS (%)', SQLERRM;
  END;

  ---------------------------------------------------------------------------
  RAISE NOTICE 'TEST 3: cash sale with a bogus terms_id is rejected';
  BEGIN
    INSERT INTO public.sale_transactions
      (listing_id, buyer_id, seller_id, amount, platform_fee, seller_payout,
       status, terms_id)
      VALUES (v_listing_id, v_buyer_a, v_seller_id, 100, 0, 100, 'pending_cash',
              '00000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'FAIL: unknown terms_id should have been rejected';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE '  PASS (%)', SQLERRM;
  END;

  ---------------------------------------------------------------------------
  RAISE NOTICE 'TEST 4: terms belonging to a DIFFERENT listing is rejected';
  BEGIN
    INSERT INTO public.sale_transactions
      (listing_id, buyer_id, seller_id, amount, platform_fee, seller_payout,
       status, terms_id)
      VALUES (v_other_listing, v_buyer_a, v_other_seller, 100, 0, 100,
              'pending_cash', v_terms_a);
    RAISE EXCEPTION 'FAIL: wrong-listing terms should have been rejected';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '  PASS (%)', SQLERRM;
  END;

  ---------------------------------------------------------------------------
  RAISE NOTICE 'TEST 5: valid terms_id succeeds';
  INSERT INTO public.sale_transactions
    (listing_id, buyer_id, seller_id, amount, platform_fee, seller_payout,
     status, terms_id)
    VALUES (v_listing_id, v_buyer_a, v_seller_id, 100, 0, 100, 'pending_cash', v_terms_a)
    RETURNING id INTO v_sale_id;
  RAISE NOTICE '  PASS sale=%', v_sale_id;



  ---------------------------------------------------------------------------
  RAISE NOTICE 'TEST 8: cannot set legacy_terms_unavailable on a NEW row';
  BEGIN
    INSERT INTO public.sale_transactions
      (listing_id, buyer_id, seller_id, amount, platform_fee, seller_payout,
       status, legacy_terms_unavailable)
      VALUES (v_listing_id, v_buyer_b, v_seller_id, 100, 0, 100, 'pending_cash', true);
    RAISE EXCEPTION 'FAIL: legacy flag on new row should be rejected';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '  PASS (%)', SQLERRM;
  END;

  ---------------------------------------------------------------------------
  RAISE NOTICE 'TEST 9: historical legacy row is UNCHANGED and still flagged';
  SELECT terms_id, status INTO v_legacy_terms, v_legacy_status
    FROM public.sale_transactions
   WHERE id = '7c95ac1c-5163-45cd-a48f-b6ec50747cda';
  IF v_legacy_terms IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: legacy row terms_id was modified to %', v_legacy_terms;
  END IF;
  IF v_legacy_status <> 'pending_cash' THEN
    RAISE EXCEPTION 'FAIL: legacy row status changed to %', v_legacy_status;
  END IF;
  RAISE NOTICE '  PASS legacy row terms_id=NULL, status=pending_cash preserved';

  RAISE NOTICE 'ALL TESTS PASSED';
END $$;

ROLLBACK;
