-- Square add-on fulfillment and reporting share one transaction.
-- Deploy the Square webhook routing changes before applying this migration.
-- The legacy guard ran as its owner, so current_user was never service_role.
CREATE OR REPLACE FUNCTION public.guard_monetization_purchases_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN RETURN NEW; END IF;
  NEW.status := 'pending'::public.monetization_purchase_status;
  NEW.fulfillment_status := 'pending';
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.reconcile_square_addon(
  p_attempt uuid, p_payment text, p_amount integer, p_currency text, p_details jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
#variable_conflict use_variable
DECLARE
  a public.square_billing_attempts%ROWTYPE;
  product public.monetization_products%ROWTYPE;
  purchase public.monetization_purchases%ROWTYPE;
  promo public.listing_promotions%ROWTYPE;
  ledger public.payment_records%ROWTYPE;
  purchase_id uuid;
  ledger_id uuid;
  starts timestamptz;
  ends timestamptz;
  paid timestamptz;
  title text;
  email text;
  prior jsonb;
BEGIN
  SELECT * INTO a FROM public.square_billing_attempts WHERE id=p_attempt FOR UPDATE;
  IF NOT FOUND OR a.kind <> 'addon' OR nullif(p_payment,'') IS NULL
     OR p_amount IS DISTINCT FROM a.amount_cents+a.tax_cents
     OR upper(p_currency) IS DISTINCT FROM upper(a.currency) THEN
    RAISE EXCEPTION 'Square payment does not match checkout';
  END IF;
  IF a.payment_id IS NOT NULL AND a.payment_id <> p_payment THEN
    RAISE EXCEPTION 'Different payment for checkout';
  END IF;
  IF a.status NOT IN ('pending','processing','completed') THEN
    RAISE EXCEPTION 'Checkout requires manual review';
  END IF;
  IF p_details->>'environment' IS NOT NULL AND p_details->>'environment' <> a.environment THEN
    RAISE EXCEPTION 'Square environment mismatch';
  END IF;
  IF p_details->>'reference_id' IS NOT NULL AND p_details->>'reference_id' <> a.id::text THEN
    RAISE EXCEPTION 'Square reference mismatch';
  END IF;
  SELECT * INTO product FROM public.monetization_products WHERE id=a.product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not found'; END IF;
  -- Deterministic identifiers only; listing/user alone never identify a charge.
  IF (SELECT count(*) FROM public.monetization_purchases
      WHERE id=a.purchase_id OR square_payment_id=p_payment OR idempotency_key='square:'||a.id) > 1 THEN
    RAISE EXCEPTION 'Ambiguous Square purchase';
  END IF;
  SELECT * INTO purchase FROM public.monetization_purchases
    WHERE id=a.purchase_id OR square_payment_id=p_payment OR idempotency_key='square:'||a.id FOR UPDATE;
  IF FOUND THEN
    IF purchase.user_id IS DISTINCT FROM a.user_id OR purchase.product_id IS DISTINCT FROM a.product_id
       OR purchase.listing_id IS DISTINCT FROM a.listing_id
       OR purchase.amount_cents IS DISTINCT FROM a.amount_cents OR purchase.tax_cents IS DISTINCT FROM a.tax_cents
       OR upper(purchase.currency) IS DISTINCT FROM upper(a.currency)
       OR (purchase.square_payment_id IS NOT NULL AND purchase.square_payment_id <> p_payment) THEN
      RAISE EXCEPTION 'Purchase linkage mismatch';
    END IF;
    IF purchase.status::text NOT IN ('pending','paid','fulfilled') OR purchase.refunded_at IS NOT NULL
       OR coalesce(purchase.refund_amount_cents,0)>0 OR purchase.refund_status IS NOT NULL THEN
      RAISE EXCEPTION 'Refunded or terminal purchase requires review';
    END IF;
    purchase_id := purchase.id;
  ELSIF a.status='completed' OR a.purchase_id IS NOT NULL THEN
    RAISE EXCEPTION 'Completed checkout is missing its purchase; manual review required';
  END IF;
  prior := jsonb_build_object('purchase_status',purchase.status,'fulfillment_status',purchase.fulfillment_status);
  paid := coalesce(purchase.paid_at, nullif(p_details->>'paid_at','')::timestamptz, now());
  starts := coalesce(purchase.access_starts_at, paid);
  ends := coalesce(purchase.access_ends_at, CASE WHEN product.duration_days>0 THEN starts+make_interval(days=>product.duration_days) END);
  IF a.listing_id IS NOT NULL THEN
    SELECT l.title INTO title FROM public.listings l WHERE l.id=a.listing_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  END IF;
  IF purchase_id IS NOT NULL THEN
    SELECT * INTO promo FROM public.listing_promotions WHERE listing_promotions.purchase_id=purchase.id;
    IF FOUND THEN starts := promo.starts_at; ends := promo.ends_at; END IF;
  END IF;
  IF purchase_id IS NULL THEN
    INSERT INTO public.monetization_purchases(user_id,product_id,listing_id,amount_cents,tax_cents,currency,
      status,fulfillment_status,idempotency_key,payment_provider,square_payment_id,paid_at,access_starts_at,access_ends_at)
    VALUES(a.user_id,a.product_id,a.listing_id,a.amount_cents,a.tax_cents,a.currency,
      'paid','active','square:'||a.id,'square',p_payment,paid,starts,ends) RETURNING id INTO purchase_id;
    IF a.listing_id IS NOT NULL AND product.promo_type IS NOT NULL AND product.duration_days>0 THEN
      SELECT greatest(starts,coalesce(max(ends_at),starts))+make_interval(days=>product.duration_days)
        INTO ends FROM public.listing_promotions WHERE listing_id=a.listing_id AND promo_type=product.promo_type AND active;
      INSERT INTO public.listing_promotions(listing_id,product_id,purchase_id,promo_type,starts_at,ends_at,active)
        VALUES(a.listing_id,product.id,purchase_id,product.promo_type,starts,ends,ends>now())
        ON CONFLICT (listing_id,promo_type) WHERE active=true DO UPDATE
          SET ends_at=excluded.ends_at,purchase_id=excluded.purchase_id,product_id=excluded.product_id;
    END IF;
  ELSIF promo.id IS NULL AND a.listing_id IS NOT NULL AND product.promo_type IS NOT NULL THEN
    -- A previously fulfilled promotion may have been superseded by a renewal.
    -- Never extend/recreate it on a reporting repair.
    IF purchase.access_ends_at IS NULL THEN RAISE EXCEPTION 'Missing fulfillment evidence; manual review required'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.listing_promotions WHERE listing_id=a.listing_id AND promo_type=product.promo_type AND active) THEN
      INSERT INTO public.listing_promotions(listing_id,product_id,purchase_id,promo_type,starts_at,ends_at,active)
        VALUES(a.listing_id,product.id,purchase_id,product.promo_type,starts,ends,ends>now());
    END IF;
  END IF;
  IF promo.id IS NOT NULL THEN
    -- Restore only an unexpired promotion already tied to this purchase.
    IF ends>now() AND NOT promo.active AND EXISTS (
      SELECT 1 FROM public.listing_promotions WHERE listing_id=a.listing_id
        AND promo_type=product.promo_type AND active AND id<>promo.id
    ) THEN RAISE EXCEPTION 'Conflicting active promotion'; END IF;
    UPDATE public.listing_promotions SET active=(ends>now()) WHERE id=promo.id;
  END IF;
  IF product.promo_type::text IN ('featured_7','featured_30','top_of_search') AND ends>now() THEN
    -- Do not shorten a later paid boost.
    UPDATE public.listings SET featured_enabled=true, featured_source='paid',
      featured_at=coalesce(featured_at,starts),
      featured_expires_at=greatest(coalesce(featured_expires_at,ends),ends)
      WHERE id=a.listing_id;
  END IF;
  UPDATE public.monetization_purchases SET
    status=CASE WHEN status::text='fulfilled' THEN status ELSE 'paid'::public.monetization_purchase_status END,
    fulfillment_status=CASE WHEN ends IS NOT NULL AND ends<=now() THEN 'expired' ELSE 'active' END,
    payment_provider='square',square_payment_id=p_payment,paid_at=paid,access_starts_at=starts,access_ends_at=ends,
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
      'square_attempt_id',a.id,'square_environment',a.environment,
      'square_order_id',coalesce(p_details->>'order_id',metadata->>'square_order_id'))
    WHERE id=purchase_id;
  SELECT coalesce(nullif(p_details->>'buyer_email',''),p.email) INTO email FROM public.profiles p WHERE p.id=a.user_id;
  IF (SELECT count(*) FROM public.payment_records WHERE square_payment_id=p_payment
      OR monetization_purchase_id=purchase_id OR reference='SQ-ADDON-'||a.id) > 1 THEN
    RAISE EXCEPTION 'Ambiguous Square payment record';
  END IF;
  SELECT * INTO ledger FROM public.payment_records WHERE square_payment_id=p_payment
      OR monetization_purchase_id=purchase_id OR reference='SQ-ADDON-'||a.id FOR UPDATE;
  IF FOUND THEN
    IF ledger.provider::text<>'square' OR ledger.monetization_purchase_id IS DISTINCT FROM purchase_id
       OR (ledger.square_payment_id IS NOT NULL AND ledger.square_payment_id<>p_payment)
       OR ledger.buyer_id IS DISTINCT FROM a.user_id OR ledger.listing_id IS DISTINCT FROM a.listing_id
       OR ledger.gross_amount_cents<>p_amount OR upper(ledger.currency)<>upper(a.currency)
       OR ledger.booking_request_id IS NOT NULL OR ledger.sale_transaction_id IS NOT NULL
       OR ledger.refunded_cents>0 OR ledger.payment_status::text NOT IN ('created','pending','approved','completed') THEN
      RAISE EXCEPTION 'Payment record requires manual review';
    END IF;
    ledger_id := ledger.id;
  ELSE
    INSERT INTO public.payment_records(reference,provider,transaction_type,monetization_purchase_id,listing_id,buyer_id,
      buyer_email,currency,gross_amount_cents,platform_fee_cents,tax_cents,seller_proceeds_cents,
      payment_status,internal_status,idempotency_key,square_payment_id,captured_at,captured_amount_cents,metadata)
    VALUES('SQ-ADDON-'||a.id,'square','monetization',purchase_id,a.listing_id,a.user_id,email,upper(a.currency),
      p_amount,a.amount_cents,a.tax_cents,0,'completed','fulfilled','square-addon:'||a.id,p_payment,paid,p_amount,
      jsonb_build_object('square_attempt_id',a.id,'environment',a.environment,'product_id',a.product_id,
        'product_name',product.name,'listing_title',title,'subtotal_cents',a.amount_cents,'tax_cents',a.tax_cents,
        'total_cents',p_amount,'reconciliation_before',prior))
    RETURNING id INTO ledger_id;
  END IF;
  UPDATE public.payment_records SET payment_status='completed',internal_status='fulfilled',
    square_payment_id=p_payment,square_order_id=coalesce(p_details->>'order_id',square_order_id),
    square_location_id=coalesce(p_details->>'location_id',square_location_id),
    square_receipt_url=coalesce(p_details->>'receipt_url',square_receipt_url),
    buyer_email=coalesce(buyer_email,email),captured_at=coalesce(captured_at,paid),
    captured_amount_cents=p_amount,last_reconciled_at=now(),
    fee_breakdown=jsonb_build_object('subtotal_cents',a.amount_cents,'tax_cents',a.tax_cents,'total_cents',p_amount),
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('square_attempt_id',a.id,'environment',a.environment,
      'product_id',a.product_id,'product_name',product.name,'listing_title',title,
      'subtotal_cents',a.amount_cents,'tax_cents',a.tax_cents,'total_cents',p_amount,
      'reconciled_by',coalesce(p_details->>'source','legacy_verified_fulfillment'))
    WHERE id=ledger_id;
  UPDATE public.square_billing_attempts SET status='completed',payment_id=p_payment,purchase_id=purchase_id,
    updated_at=now() WHERE id=a.id;
  RETURN ledger_id;
END $$;
REVOKE ALL ON FUNCTION public.reconcile_square_addon(uuid,text,integer,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_square_addon(uuid,text,integer,text,jsonb) TO service_role;

-- Keep existing deployed callers compatible.
CREATE OR REPLACE FUNCTION public.fulfill_square_addon(p_attempt uuid,p_payment text,p_amount integer,p_currency text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.reconcile_square_addon(p_attempt,p_payment,p_amount,p_currency,'{}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.fulfill_square_addon(uuid,text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_square_addon(uuid,text,integer,text) TO service_role;
