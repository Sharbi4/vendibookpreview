
CREATE OR REPLACE FUNCTION public.validate_sale_transaction_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing_price numeric;
  v_listing_host  uuid;
  v_role          text := current_setting('role', true);
  v_commission    numeric;
  v_expected_amount numeric;
  v_expected_fee    numeric;
  v_expected_payout numeric;
  v_is_cash boolean;
BEGIN
  -- Service role (edge functions, webhooks) bypasses. Admins bypass.
  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Look up the real listing price + host.
  SELECT price_sale, host_id
    INTO v_listing_price, v_listing_host
    FROM public.listings
   WHERE id = NEW.listing_id;

  IF v_listing_price IS NULL THEN
    RAISE EXCEPTION 'Listing % is not available for sale', NEW.listing_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- seller_id must match the actual listing owner.
  IF NEW.seller_id IS DISTINCT FROM v_listing_host THEN
    RAISE EXCEPTION 'seller_id does not match listing owner'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Determine expected fees. Cash / pay-in-person sales are 100% free
  -- per the platform fee schedule; Stripe sales are 12.9% seller commission.
  v_is_cash := COALESCE(NEW.status, '') = 'pending_cash';
  v_commission := CASE WHEN v_is_cash THEN 0 ELSE 0.129 END;

  v_expected_amount := v_listing_price;
  v_expected_fee    := round(v_listing_price * v_commission, 2);
  v_expected_payout := round(v_listing_price - v_expected_fee, 2);

  -- Force server-computed values (ignore anything the client supplied).
  NEW.amount        := v_expected_amount;
  NEW.platform_fee  := v_expected_fee;
  NEW.seller_payout := v_expected_payout;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_sale_transaction_insert ON public.sale_transactions;
CREATE TRIGGER trg_validate_sale_transaction_insert
BEFORE INSERT ON public.sale_transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_sale_transaction_insert();
