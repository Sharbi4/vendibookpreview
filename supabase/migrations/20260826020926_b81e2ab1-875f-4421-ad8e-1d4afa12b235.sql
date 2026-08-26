CREATE OR REPLACE FUNCTION public.guard_booking_requests_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_privileged boolean;
BEGIN
  v_privileged := (auth.role() = 'service_role')
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'));

  IF v_privileged THEN
    RETURN NEW;
  END IF;

  -- Server-derived payment/settlement state is never client-writable.
  NEW.payment_status    := OLD.payment_status;
  NEW.deposit_status    := OLD.deposit_status;
  NEW.hold_status       := OLD.hold_status;
  NEW.payout_processed  := OLD.payout_processed;
  NEW.payout_processed_at := OLD.payout_processed_at;
  NEW.payment_intent_id := OLD.payment_intent_id;
  NEW.host_platform_fee := OLD.host_platform_fee;
  NEW.tax_amount        := OLD.tax_amount;
  NEW.is_instant_book   := OLD.is_instant_book;

  -- Completion confirmations are set-once and only by the matching party.
  IF NEW.host_confirmed_at IS DISTINCT FROM OLD.host_confirmed_at THEN
    IF OLD.host_confirmed_at IS NOT NULL OR auth.uid() IS DISTINCT FROM OLD.host_id THEN
      NEW.host_confirmed_at := OLD.host_confirmed_at;
    ELSE
      NEW.host_confirmed_at := now();
    END IF;
  END IF;

  IF NEW.shopper_confirmed_at IS DISTINCT FROM OLD.shopper_confirmed_at THEN
    IF OLD.shopper_confirmed_at IS NOT NULL OR auth.uid() IS DISTINCT FROM OLD.shopper_id THEN
      NEW.shopper_confirmed_at := OLD.shopper_confirmed_at;
    ELSE
      NEW.shopper_confirmed_at := now();
    END IF;
  END IF;

  -- Once paid, the priced terms of the booking are frozen client-side.
  IF OLD.payment_status = 'paid' THEN
    NEW.total_price    := OLD.total_price;
    NEW.deposit_amount := OLD.deposit_amount;
    NEW.start_date     := OLD.start_date;
    NEW.end_date       := OLD.end_date;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_booking_requests_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_booking_requests_update ON public.booking_requests;
CREATE TRIGGER trg_guard_booking_requests_update
BEFORE UPDATE ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_booking_requests_update();


CREATE OR REPLACE FUNCTION public.guard_sale_transactions_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_privileged boolean;
BEGIN
  v_privileged := (auth.role() = 'service_role')
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'));

  IF v_privileged THEN
    RETURN NEW;
  END IF;

  -- Money and payment references are server-derived only.
  NEW.amount                 := OLD.amount;
  NEW.platform_fee           := OLD.platform_fee;
  NEW.seller_payout          := OLD.seller_payout;
  NEW.fee_rate_pct           := OLD.fee_rate_pct;
  NEW.promo_code_id          := OLD.promo_code_id;
  NEW.promo_discount         := OLD.promo_discount;
  NEW.pro_discount           := OLD.pro_discount;
  NEW.delivery_fee           := OLD.delivery_fee;
  NEW.freight_cost           := OLD.freight_cost;
  NEW.payment_intent_id      := OLD.payment_intent_id;
  NEW.checkout_session_id    := OLD.checkout_session_id;
  NEW.payment_provider       := OLD.payment_provider;
  NEW.freight_payment_status := OLD.freight_payment_status;
  NEW.freight_payment_intent_id   := OLD.freight_payment_intent_id;
  NEW.freight_checkout_session_id := OLD.freight_checkout_session_id;
  NEW.freight_paid_at        := OLD.freight_paid_at;
  NEW.payout_completed_at    := OLD.payout_completed_at;
  NEW.transfer_id            := OLD.transfer_id;
  NEW.terms_id               := OLD.terms_id;

  -- Shipping/tracking is an admin-recorded fact, not a buyer/seller claim.
  NEW.shipping_status          := OLD.shipping_status;
  NEW.tracking_number          := OLD.tracking_number;
  NEW.carrier                  := OLD.carrier;
  NEW.tracking_url             := OLD.tracking_url;
  NEW.shipped_at               := OLD.shipped_at;
  NEW.estimated_delivery_date  := OLD.estimated_delivery_date;
  NEW.delivered_at             := OLD.delivered_at;
  NEW.shipping_notes           := OLD.shipping_notes;

  -- Confirmations are set-once and only by the matching party.
  IF NEW.buyer_confirmed_at IS DISTINCT FROM OLD.buyer_confirmed_at THEN
    IF OLD.buyer_confirmed_at IS NOT NULL OR auth.uid() IS DISTINCT FROM OLD.buyer_id THEN
      NEW.buyer_confirmed_at := OLD.buyer_confirmed_at;
    ELSE
      NEW.buyer_confirmed_at := now();
    END IF;
  END IF;

  IF NEW.seller_confirmed_at IS DISTINCT FROM OLD.seller_confirmed_at THEN
    IF OLD.seller_confirmed_at IS NOT NULL OR auth.uid() IS DISTINCT FROM OLD.seller_id THEN
      NEW.seller_confirmed_at := OLD.seller_confirmed_at;
    ELSE
      NEW.seller_confirmed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_sale_transactions_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_sale_transactions_update ON public.sale_transactions;
CREATE TRIGGER trg_guard_sale_transactions_update
BEFORE UPDATE ON public.sale_transactions
FOR EACH ROW EXECUTE FUNCTION public.guard_sale_transactions_update();