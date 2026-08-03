-- 1. booking_requests: freeze financial columns for participant updates
CREATE OR REPLACE FUNCTION public.trg_guard_booking_request_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

  IF NEW.total_price          IS DISTINCT FROM OLD.total_price          THEN RAISE EXCEPTION 'total_price is not user-editable'; END IF;
  IF NEW.deposit_amount       IS DISTINCT FROM OLD.deposit_amount       THEN RAISE EXCEPTION 'deposit_amount is not user-editable'; END IF;
  IF NEW.deposit_status       IS DISTINCT FROM OLD.deposit_status       THEN RAISE EXCEPTION 'deposit_status is not user-editable'; END IF;
  IF NEW.deposit_charge_id    IS DISTINCT FROM OLD.deposit_charge_id    THEN RAISE EXCEPTION 'deposit_charge_id is not user-editable'; END IF;
  IF NEW.payment_status       IS DISTINCT FROM OLD.payment_status       THEN RAISE EXCEPTION 'payment_status is not user-editable'; END IF;
  IF NEW.payment_intent_id    IS DISTINCT FROM OLD.payment_intent_id    THEN RAISE EXCEPTION 'payment_intent_id is not user-editable'; END IF;
  IF NEW.checkout_session_id  IS DISTINCT FROM OLD.checkout_session_id  THEN RAISE EXCEPTION 'checkout_session_id is not user-editable'; END IF;
  IF NEW.paid_at              IS DISTINCT FROM OLD.paid_at              THEN RAISE EXCEPTION 'paid_at is not user-editable'; END IF;
  IF NEW.payout_processed     IS DISTINCT FROM OLD.payout_processed     THEN RAISE EXCEPTION 'payout_processed is not user-editable'; END IF;
  IF NEW.payout_processed_at  IS DISTINCT FROM OLD.payout_processed_at  THEN RAISE EXCEPTION 'payout_processed_at is not user-editable'; END IF;
  IF NEW.payout_transfer_id   IS DISTINCT FROM OLD.payout_transfer_id   THEN RAISE EXCEPTION 'payout_transfer_id is not user-editable'; END IF;
  IF NEW.payout_hold_until    IS DISTINCT FROM OLD.payout_hold_until    THEN RAISE EXCEPTION 'payout_hold_until is not user-editable'; END IF;
  IF NEW.payout_hold_reason   IS DISTINCT FROM OLD.payout_hold_reason   THEN RAISE EXCEPTION 'payout_hold_reason is not user-editable'; END IF;
  IF NEW.payout_hold_set_by   IS DISTINCT FROM OLD.payout_hold_set_by   THEN RAISE EXCEPTION 'payout_hold_set_by is not user-editable'; END IF;
  IF NEW.delivery_fee_snapshot IS DISTINCT FROM OLD.delivery_fee_snapshot THEN RAISE EXCEPTION 'delivery_fee_snapshot is not user-editable'; END IF;
  IF NEW.payment_provider     IS DISTINCT FROM OLD.payment_provider     THEN RAISE EXCEPTION 'payment_provider is not user-editable'; END IF;
  IF NEW.listing_id           IS DISTINCT FROM OLD.listing_id           THEN RAISE EXCEPTION 'listing_id is not user-editable'; END IF;
  IF NEW.host_id              IS DISTINCT FROM OLD.host_id              THEN RAISE EXCEPTION 'host_id is not user-editable'; END IF;
  IF NEW.shopper_id           IS DISTINCT FROM OLD.shopper_id           THEN RAISE EXCEPTION 'shopper_id is not user-editable'; END IF;

  -- Shoppers may only cancel; they cannot approve/complete their own booking.
  IF auth.uid() = OLD.shopper_id AND auth.uid() <> OLD.host_id
     AND NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status <> 'cancelled'::booking_status THEN
    RAISE EXCEPTION 'shoppers may only cancel a booking request';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_booking_request_user_update ON public.booking_requests;
CREATE TRIGGER guard_booking_request_user_update
BEFORE UPDATE ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_guard_booking_request_user_update();

-- 2. offers: freeze amounts and ownership for participant updates
CREATE OR REPLACE FUNCTION public.trg_guard_offer_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

  IF NEW.listing_id   IS DISTINCT FROM OLD.listing_id   THEN RAISE EXCEPTION 'listing_id is not user-editable'; END IF;
  IF NEW.buyer_id     IS DISTINCT FROM OLD.buyer_id     THEN RAISE EXCEPTION 'buyer_id is not user-editable'; END IF;
  IF NEW.seller_id    IS DISTINCT FROM OLD.seller_id    THEN RAISE EXCEPTION 'seller_id is not user-editable'; END IF;
  IF NEW.offer_amount IS DISTINCT FROM OLD.offer_amount THEN RAISE EXCEPTION 'offer_amount is not editable after submission'; END IF;

  -- Buyers may only cancel their own pending offer.
  IF auth.uid() = OLD.buyer_id AND auth.uid() <> OLD.seller_id THEN
    IF NEW.counter_amount IS DISTINCT FROM OLD.counter_amount
       OR NEW.counter_message IS DISTINCT FROM OLD.counter_message
       OR NEW.counter_expires_at IS DISTINCT FROM OLD.counter_expires_at
       OR NEW.seller_response IS DISTINCT FROM OLD.seller_response THEN
      RAISE EXCEPTION 'buyers cannot modify seller response fields';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('cancelled', 'accepted', 'declined') THEN
      RAISE EXCEPTION 'invalid buyer status transition';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_offer_user_update ON public.offers;
CREATE TRIGGER guard_offer_user_update
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.trg_guard_offer_user_update();

-- 3. Add WITH CHECK clauses so rows cannot be re-assigned out of the caller's scope
DROP POLICY IF EXISTS "Hosts can respond to booking requests" ON public.booking_requests;
CREATE POLICY "Hosts can respond to booking requests"
ON public.booking_requests FOR UPDATE TO authenticated
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Shoppers can cancel their pending requests" ON public.booking_requests;
CREATE POLICY "Shoppers can cancel their pending requests"
ON public.booking_requests FOR UPDATE TO authenticated
USING (auth.uid() = shopper_id AND status = 'pending'::booking_status)
WITH CHECK (auth.uid() = shopper_id);

DROP POLICY IF EXISTS "Sellers can respond to offers" ON public.offers;
CREATE POLICY "Sellers can respond to offers"
ON public.offers FOR UPDATE TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers can cancel pending offers" ON public.offers;
CREATE POLICY "Buyers can cancel pending offers"
ON public.offers FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id AND status = 'pending'::text)
WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can update their confirmation" ON public.sale_transactions;
CREATE POLICY "Buyers can update their confirmation"
ON public.sale_transactions FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id AND status = ANY (ARRAY['pending_cash'::text, 'paid'::text, 'seller_confirmed'::text]))
WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Sellers can update their confirmation" ON public.sale_transactions;
CREATE POLICY "Sellers can update their confirmation"
ON public.sale_transactions FOR UPDATE TO authenticated
USING (auth.uid() = seller_id AND status = ANY (ARRAY['pending_cash'::text, 'paid'::text, 'buyer_confirmed'::text]))
WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Admins can update transactions for dispute resolution" ON public.sale_transactions;
CREATE POLICY "Admins can update transactions for dispute resolution"
ON public.sale_transactions FOR UPDATE TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));