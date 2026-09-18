CREATE OR REPLACE FUNCTION public.enforce_sale_release_before_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _is_sale boolean;
BEGIN
  SELECT (pr.sale_transaction_id IS NOT NULL) INTO _is_sale
  FROM public.payment_records pr
  WHERE pr.id = NEW.payment_record_id;

  IF COALESCE(_is_sale, false)
     AND NEW.status IN ('payout_approved', 'payout_processing', 'payout_completed')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NOT (
       NEW.release_state IN ('ready_for_review', 'payout_recorded')
       AND NEW.walkthrough_media_id IS NOT NULL
       AND NEW.walkthrough_recorded_at IS NOT NULL
       AND NEW.signnow_document_id IS NOT NULL
       AND NEW.agreement_completed_at IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'sale payout conditions are incomplete';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_sale_release_before_payout() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS seller_payables_enforce_sale_release ON public.seller_payables;
CREATE TRIGGER seller_payables_enforce_sale_release
BEFORE UPDATE OF status ON public.seller_payables
FOR EACH ROW EXECUTE FUNCTION public.enforce_sale_release_before_payout();

UPDATE public.seller_payables sp
SET release_state = 'payout_recorded',
    conditions_completed_at = COALESCE(sp.conditions_completed_at, sp.payout_completed_at, sp.paid_at),
    updated_at = now()
FROM public.payment_records pr
WHERE pr.id = sp.payment_record_id
  AND pr.sale_transaction_id IS NOT NULL
  AND sp.status = 'payout_completed';

CREATE OR REPLACE FUNCTION public.refresh_sale_release_requirements(_payment_record_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payable public.seller_payables%ROWTYPE;
  _payment public.payment_records%ROWTYPE;
  _walkthrough public.handoff_media%ROWTYPE;
  _document public.documents%ROWTYPE;
  _next_state text;
  _completed_at timestamptz;
BEGIN
  SELECT * INTO _payable FROM public.seller_payables WHERE payment_record_id = _payment_record_id;
  IF NOT FOUND OR _payable.status = 'payout_completed' OR _payable.release_state IN ('payout_recorded', 'cancelled', 'auto_refunded') THEN RETURN; END IF;
  SELECT * INTO _payment FROM public.payment_records WHERE id = _payment_record_id;
  IF NOT FOUND OR _payment.sale_transaction_id IS NULL THEN RETURN; END IF;

  SELECT hm.* INTO _walkthrough
  FROM public.handoff_media hm
  JOIN public.handoff_sessions hs ON hs.id = hm.handoff_session_id
  WHERE hs.sale_transaction_id = _payment.sale_transaction_id
    AND hm.media_type = 'video' AND hm.storage_path IS NOT NULL AND COALESCE(hm.byte_size, 0) > 0
  ORDER BY hm.created_at DESC LIMIT 1;

  SELECT d.* INTO _document
  FROM public.documents d
  WHERE d.transaction_id = _payment.sale_transaction_id
    AND d.document_type = 'bill_of_sale' AND d.status = 'completed'
    AND d.renter_signed_at IS NOT NULL AND d.host_signed_at IS NOT NULL
    AND d.signnow_document_id IS NOT NULL
  ORDER BY d.updated_at DESC LIMIT 1;

  IF _walkthrough.id IS NOT NULL AND _document.id IS NOT NULL THEN
    _next_state := 'ready_for_review';
    _completed_at := GREATEST(_walkthrough.created_at, _document.updated_at);
  ELSIF _walkthrough.id IS NOT NULL THEN
    _next_state := 'awaiting_signatures';
    _completed_at := NULL;
  ELSE
    _next_state := 'awaiting_walkthrough';
    _completed_at := NULL;
  END IF;

  UPDATE public.seller_payables
  SET release_state = _next_state,
      conditions_deadline_at = COALESCE(conditions_deadline_at, _payment.captured_at + interval '10 days', _payment.created_at + interval '10 days'),
      walkthrough_media_id = _walkthrough.id,
      walkthrough_recorded_at = _walkthrough.created_at,
      signnow_document_id = _document.signnow_document_id,
      agreement_completed_at = CASE WHEN _document.id IS NOT NULL THEN _document.updated_at ELSE NULL END,
      conditions_completed_at = _completed_at,
      payout_eligible_at = CASE WHEN _next_state = 'ready_for_review' THEN _completed_at ELSE NULL END,
      status = CASE
        WHEN _next_state = 'ready_for_review' AND status = 'pending_release' THEN 'eligible_for_review'::public.seller_payout_status
        WHEN _next_state <> 'ready_for_review' AND status = 'eligible_for_review' THEN 'pending_release'::public.seller_payout_status
        ELSE status
      END,
      hold_reason = CASE
        WHEN _next_state = 'awaiting_walkthrough' THEN 'Waiting for a saved walkthrough video and both signatures.'
        WHEN _next_state = 'awaiting_signatures' THEN 'Waiting for both parties to sign the purchase agreement.'
        WHEN _next_state = 'ready_for_review' THEN NULL
        ELSE hold_reason
      END,
      updated_at = now()
  WHERE id = _payable.id;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_sale_release_requirements(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sale_release_requirements(uuid) TO service_role;