
-- 1) booking_documents — renter can update content of a pending doc, but
-- cannot promote it to approved or write reviewer fields.
DROP POLICY IF EXISTS "Renters can update pending documents" ON public.booking_documents;
CREATE POLICY "Renters can update pending documents"
ON public.booking_documents
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id = booking_documents.booking_id
      AND br.shopper_id = auth.uid()
  )
)
WITH CHECK (
  status = 'pending'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
  AND rejection_reason IS NULL
  AND EXISTS (
    SELECT 1 FROM public.booking_requests br
    WHERE br.id = booking_documents.booking_id
      AND br.shopper_id = auth.uid()
  )
);

-- 2) sale_transactions — buyer/seller can confirm receipt/shipment on their
-- own row, but cannot touch financial or shipping fields. We enforce this
-- with a trigger because RLS WITH CHECK cannot compare old vs new values.
CREATE OR REPLACE FUNCTION public.trg_guard_sale_transaction_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  -- Service role and admins bypass this guard entirely.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  SELECT public.is_admin(auth.uid()) INTO is_admin_user;
  IF is_admin_user THEN
    RETURN NEW;
  END IF;

  -- For everyone else, refuse changes to financial / logistics columns.
  IF NEW.amount            IS DISTINCT FROM OLD.amount            THEN RAISE EXCEPTION 'amount is not user-editable'; END IF;
  IF NEW.platform_fee      IS DISTINCT FROM OLD.platform_fee      THEN RAISE EXCEPTION 'platform_fee is not user-editable'; END IF;
  IF NEW.seller_payout     IS DISTINCT FROM OLD.seller_payout     THEN RAISE EXCEPTION 'seller_payout is not user-editable'; END IF;
  IF NEW.shipping_amount   IS DISTINCT FROM OLD.shipping_amount   THEN RAISE EXCEPTION 'shipping_amount is not user-editable'; END IF;
  IF NEW.shipping_carrier  IS DISTINCT FROM OLD.shipping_carrier  THEN RAISE EXCEPTION 'shipping_carrier is not user-editable'; END IF;
  IF NEW.tracking_number   IS DISTINCT FROM OLD.tracking_number   THEN RAISE EXCEPTION 'tracking_number is not user-editable'; END IF;
  IF NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id THEN RAISE EXCEPTION 'stripe_payment_intent_id is not user-editable'; END IF;
  IF NEW.buyer_id          IS DISTINCT FROM OLD.buyer_id          THEN RAISE EXCEPTION 'buyer_id is not user-editable'; END IF;
  IF NEW.seller_id         IS DISTINCT FROM OLD.seller_id         THEN RAISE EXCEPTION 'seller_id is not user-editable'; END IF;
  IF NEW.listing_id        IS DISTINCT FROM OLD.listing_id        THEN RAISE EXCEPTION 'listing_id is not user-editable'; END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_sale_transaction_user_update ON public.sale_transactions;
CREATE TRIGGER trg_guard_sale_transaction_user_update
BEFORE UPDATE ON public.sale_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_guard_sale_transaction_user_update();
