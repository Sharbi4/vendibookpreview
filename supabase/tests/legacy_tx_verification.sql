-- Legacy Transaction Verification — invariant tests for txn 7c95ac1c-…
-- Guards that the lightweight resolution (admin_note + preserved state)
-- has not been silently mutated. Run alongside cash_sale_terms_trigger.sql.
--
-- Usage: psql -v ON_ERROR_STOP=1 -f supabase/tests/legacy_tx_verification.sql

DO $$
DECLARE
  v_tx public.sale_transactions;
  v_listing public.listings;
  v_note_count int;
  v_terms_count int;
  v_outreach_buyer int;
  v_outreach_seller int;
BEGIN
  SELECT * INTO v_tx FROM public.sale_transactions
    WHERE id = '7c95ac1c-5163-45cd-a48f-b6ec50747cda';

  IF v_tx.terms_id IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: legacy tx terms_id was populated (should stay NULL): %', v_tx.terms_id;
  END IF;
  IF NOT v_tx.legacy_terms_unavailable THEN
    RAISE EXCEPTION 'FAIL: legacy_terms_unavailable flag was cleared';
  END IF;
  IF v_tx.status <> 'pending_cash' THEN
    RAISE EXCEPTION 'FAIL: legacy tx status changed to %', v_tx.status;
  END IF;
  IF v_tx.amount <> 349.98 THEN
    RAISE EXCEPTION 'FAIL: legacy tx amount changed to %', v_tx.amount;
  END IF;
  IF v_tx.buyer_confirmed_at IS NOT NULL
     OR v_tx.seller_confirmed_at IS NOT NULL
     OR v_tx.payout_completed_at IS NOT NULL
     OR v_tx.payment_intent_id IS NOT NULL
     OR v_tx.transfer_id IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: legacy tx has fabricated payment / confirmation fields';
  END IF;
  IF v_tx.created_at <> '2026-07-05 05:22:14.713934+00'::timestamptz THEN
    RAISE EXCEPTION 'FAIL: legacy tx created_at was rewritten to %', v_tx.created_at;
  END IF;
  RAISE NOTICE 'PASS legacy transaction row preserved verbatim';

  -- 2) No synthetic transaction_terms snapshot exists for this sale.
  SELECT count(*) INTO v_terms_count FROM public.transaction_terms
    WHERE sale_transaction_id = '7c95ac1c-5163-45cd-a48f-b6ec50747cda'
       OR (listing_id = v_tx.listing_id AND buyer_id = v_tx.buyer_id);
  IF v_terms_count > 0 THEN
    RAISE EXCEPTION 'FAIL: a transaction_terms snapshot exists for the legacy tx (count=%). No terms may be reconstructed.', v_terms_count;
  END IF;
  RAISE NOTICE 'PASS no reconstructed transaction_terms exist for legacy tx';

  -- 3) Listing preserved (still published, price unchanged, same host).
  SELECT * INTO v_listing FROM public.listings
    WHERE id = '98b799f7-067e-4b11-b912-828ef2878837';
  IF v_listing.status <> 'published' THEN
    RAISE EXCEPTION 'FAIL: listing status changed to %', v_listing.status;
  END IF;
  IF v_listing.price_sale <> 349.98 THEN
    RAISE EXCEPTION 'FAIL: listing price_sale changed to %', v_listing.price_sale;
  END IF;
  IF v_listing.host_id <> v_tx.seller_id THEN
    RAISE EXCEPTION 'FAIL: listing host_id changed';
  END IF;
  RAISE NOTICE 'PASS listing preserved (published, $349.98, same host)';

  -- 4) Exactly one legacy-verification admin_note exists for this tx.
  SELECT count(*) INTO v_note_count FROM public.admin_notes
    WHERE entity_type='sale_transaction'
      AND entity_id='7c95ac1c-5163-45cd-a48f-b6ec50747cda'::uuid
      AND note LIKE 'LEGACY TRANSACTION VERIFICATION%';
  IF v_note_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: expected exactly 1 legacy-verification admin_note, found %', v_note_count;
  END IF;
  RAISE NOTICE 'PASS admin_note exists (count=1)';

  -- 5) Outreach records: one attempt to each stored email exists in email_send_log.
  --    Buyer address is on the suppression list (prior bounce), so its send was
  --    correctly recorded as `suppressed` — a suppressed row still counts as
  --    "outreach attempted" for audit purposes, but not as a customer response.
  SELECT count(*) INTO v_outreach_buyer FROM public.email_send_log
    WHERE recipient_email='wwwjeffreybrooks042@gmail.com'
      AND template_name='generic-notice'
      AND created_at > '2026-07-10 21:00'::timestamptz;
  SELECT count(*) INTO v_outreach_seller FROM public.email_send_log
    WHERE recipient_email='atladmom421@gmail.com'
      AND template_name='generic-notice'
      AND created_at > '2026-07-10 21:00'::timestamptz;
  IF v_outreach_buyer < 1 THEN
    RAISE EXCEPTION 'FAIL: no outreach row for buyer';
  END IF;
  IF v_outreach_seller < 1 THEN
    RAISE EXCEPTION 'FAIL: no outreach row for seller';
  END IF;
  RAISE NOTICE 'PASS outreach recorded (buyer rows=%, seller rows=%)', v_outreach_buyer, v_outreach_seller;

  -- 6) No reviews were unlocked for this listing on the strength of this tx.
  IF EXISTS (SELECT 1 FROM public.reviews WHERE listing_id = v_listing.id) THEN
    RAISE EXCEPTION 'FAIL: reviews exist for the legacy listing — should remain locked';
  END IF;
  RAISE NOTICE 'PASS no reviews unlocked';

  RAISE NOTICE 'ALL LEGACY-VERIFICATION INVARIANTS HOLD';
END $$;
