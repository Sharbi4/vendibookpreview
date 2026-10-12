-- Regression test against the identified historical checkout. Always rolls back.
-- Run AFTER installing migration in a staging DB containing the affected checkout.
BEGIN;
DO $test$
DECLARE
  a public.square_billing_attempts%ROWTYPE;
  original_end timestamptz;
  record_id uuid;
  first_id uuid;
  test_attempt uuid := gen_random_uuid();
  test_payment text := 'rollback-test-'||gen_random_uuid();
BEGIN
  SELECT * INTO a FROM public.square_billing_attempts WHERE id='96e10e24-08ec-4ccf-a24a-f00e99ab0e40';
  SELECT ends_at INTO original_end FROM public.listing_promotions WHERE purchase_id=a.purchase_id;
  record_id := public.reconcile_square_addon(a.id,a.payment_id,a.amount_cents+a.tax_cents,a.currency,'{}');
  IF NOT EXISTS (SELECT 1 FROM public.monetization_purchases WHERE id=a.purchase_id AND status='paid' AND fulfillment_status='active') THEN RAISE EXCEPTION 'repair failed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_records WHERE id=record_id AND gross_amount_cents=5160 AND tax_cents=260 AND provider='square' AND payment_status='completed' AND monetization_purchase_id=a.purchase_id) THEN RAISE EXCEPTION 'ledger failed'; END IF;
  first_id:=record_id;
  record_id:=public.reconcile_square_addon(a.id,a.payment_id,a.amount_cents+a.tax_cents,a.currency,'{}');
  IF record_id<>first_id OR (SELECT ends_at FROM public.listing_promotions WHERE purchase_id=a.purchase_id) IS DISTINCT FROM original_end THEN RAISE EXCEPTION 'replay extended promotion'; END IF;
  BEGIN
    PERFORM public.reconcile_square_addon(a.id,a.payment_id,1,a.currency,'{}');
    RAISE EXCEPTION 'BAD: mismatch accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='BAD: mismatch accepted' THEN RAISE; END IF; END;
  BEGIN
    PERFORM public.reconcile_square_addon(a.id,'different-payment',5160,a.currency,'{}');
    RAISE EXCEPTION 'BAD: different payment accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='BAD: different payment accepted' THEN RAISE; END IF; END;
  BEGIN
    PERFORM public.reconcile_square_addon(a.id,a.payment_id,5160,'EUR','{}');
    RAISE EXCEPTION 'BAD: currency accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='BAD: currency accepted' THEN RAISE; END IF; END;
  BEGIN
    PERFORM public.reconcile_square_addon(a.id,a.payment_id,5160,'USD','{"environment":"sandbox"}');
    RAISE EXCEPTION 'BAD: environment accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='BAD: environment accepted' THEN RAISE; END IF; END;
  IF has_function_privilege('authenticated','public.reconcile_square_addon(uuid,text,integer,text,jsonb)','execute')
    OR has_function_privilege('anon','public.reconcile_square_addon(uuid,text,integer,text,jsonb)','execute') THEN RAISE EXCEPTION 'RPC permissions failed'; END IF;
  UPDATE public.monetization_purchases SET status='refunded',refund_status='full' WHERE id=a.purchase_id;
  BEGIN
    PERFORM public.reconcile_square_addon(a.id,a.payment_id,5160,'USD','{}');
    RAISE EXCEPTION 'BAD: refund reactivated';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='BAD: refund reactivated' THEN RAISE; END IF; END;
  INSERT INTO public.square_billing_attempts(id,user_id,product_id,listing_id,environment,kind,amount_cents,tax_cents,currency)
    VALUES(test_attempt,a.user_id,a.product_id,a.listing_id,'sandbox','addon',4900,260,'USD');
  record_id:=public.reconcile_square_addon(test_attempt,test_payment,5160,'USD','{"environment":"sandbox"}');
  IF NOT EXISTS (SELECT 1 FROM public.payment_records r JOIN public.monetization_purchases p ON p.id=r.monetization_purchase_id
      WHERE r.id=record_id AND p.status='paid' AND p.fulfillment_status='active' AND p.access_ends_at=(SELECT ends_at FROM public.listing_promotions WHERE purchase_id=p.id)) THEN RAISE EXCEPTION 'initial fulfillment failed'; END IF;
  first_id:=public.reconcile_square_addon(test_attempt,test_payment,5160,'USD','{"environment":"sandbox"}');
  IF first_id<>record_id THEN RAISE EXCEPTION 'initial replay duplicated ledger'; END IF;
END $test$;
ROLLBACK;
