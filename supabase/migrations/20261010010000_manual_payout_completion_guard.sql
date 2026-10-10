-- Manual release only. Direct provider settlements recorded at INSERT are
-- historical facts, not new transfers, and must not be paid a second time.
CREATE OR REPLACE FUNCTION public.enforce_marketplace_completion_before_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment public.payment_records%ROWTYPE;
  _booking public.booking_requests%ROWTYPE;
  _sale_status text;
BEGIN
  IF NEW.status NOT IN ('eligible_for_review', 'payout_approved', 'payout_processing', 'payout_completed')
     OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _payment FROM public.payment_records WHERE id = NEW.payment_record_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Linked payment could not be verified'; END IF;

  IF _payment.booking_request_id IS NOT NULL OR _payment.transaction_type = 'rental' THEN
    SELECT * INTO _booking FROM public.booking_requests
      WHERE id = _payment.booking_request_id FOR SHARE;
    IF NOT FOUND OR _booking.status IS DISTINCT FROM 'completed'
       OR _booking.payment_status IS DISTINCT FROM 'paid' THEN
      RAISE EXCEPTION 'Rental must be completed and paid before payout release';
    END IF;
    IF COALESCE(_booking.dispute_status, 'none') NOT IN ('none', 'closed', 'resolved')
       OR _booking.payout_hold_until > now() THEN
      RAISE EXCEPTION 'Rental payout is blocked by a dispute or hold';
    END IF;
  END IF;

  IF _payment.sale_transaction_id IS NOT NULL OR _payment.transaction_type = 'sale' THEN
    SELECT status::text INTO _sale_status FROM public.sale_transactions
      WHERE id = _payment.sale_transaction_id FOR SHARE;
    IF NOT FOUND OR _sale_status IS NULL OR _sale_status IN ('disputed', 'refunded', 'cancelled') THEN
      RAISE EXCEPTION 'Sale status does not permit payout release';
    END IF;
    -- IS NOT TRUE is deliberate: SQL NULL must fail closed too.
    IF (NEW.release_state IN ('ready_for_review', 'payout_recorded')
        AND NEW.walkthrough_media_id IS NOT NULL
        AND NEW.walkthrough_recorded_at IS NOT NULL
        AND NEW.signnow_document_id IS NOT NULL
        AND NEW.agreement_completed_at IS NOT NULL) IS NOT TRUE THEN
      RAISE EXCEPTION 'Saved sale walkthrough and both signatures are required before payout release';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_marketplace_completion_before_payout() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS seller_payables_enforce_completion ON public.seller_payables;
CREATE TRIGGER seller_payables_enforce_completion
BEFORE UPDATE OF status ON public.seller_payables
FOR EACH ROW EXECUTE FUNCTION public.enforce_marketplace_completion_before_payout();
