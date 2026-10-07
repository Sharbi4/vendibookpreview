-- Lifecycle guards from the 2026-10-07 post-purchase / post-rental audit.
--
-- 1. Sale payouts: refresh_sale_release_requirements only recognised the old
--    'bill_of_sale' document, but sales now sign a 'purchase_sale_agreement'.
--    Once both parties signed, the payable stayed "awaiting signatures" and
--    admins could never approve the payout.
-- 2. Paid rentals: a host could set a paid booking to declined / cancelled /
--    pending directly, which frees the dates and keeps the renter's money with
--    no refund. Paid bookings now change status only through Vendibook's server
--    functions (cancel-booking refunds through Square). A host may still mark a
--    paid booking completed once its end date has passed.
-- 3. Video walkthrough audit events the app already writes were rejected by the
--    event_type check and silently lost.

CREATE OR REPLACE FUNCTION public.refresh_sale_release_requirements(_payment_record_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND d.document_type IN ('bill_of_sale', 'purchase_sale_agreement', 'purchase_agreement')
    AND d.status = 'completed'
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
      conditions_deadline_at = CASE
        WHEN dispute_frozen_at IS NOT NULL THEN NULL
        ELSE COALESCE(conditions_deadline_at, _payment.captured_at + interval '10 days', _payment.created_at + interval '10 days')
      END,
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
        WHEN dispute_frozen_at IS NOT NULL THEN 'Seller payment is paused while a Vendibook case is open.'
        WHEN _next_state = 'awaiting_walkthrough' THEN 'Waiting for a saved walkthrough video and both signatures.'
        WHEN _next_state = 'awaiting_signatures' THEN 'Waiting for both parties to sign the purchase agreement.'
        WHEN _next_state = 'ready_for_review' THEN NULL
        ELSE hold_reason
      END,
      updated_at = now()
  WHERE id = _payable.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_paid_booking_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR OLD.payment_status IS DISTINCT FROM 'paid' THEN
    RETURN NEW;
  END IF;
  IF coalesce(auth.role(), '') = 'service_role' OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- Approving a paid request keeps the dates booked; nothing to refund.
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'completed' AND OLD.status = 'approved' AND OLD.end_date < current_date THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'This booking is paid. Cancel it from the booking page so the renter is refunded.'
    USING ERRCODE = 'check_violation';
END;
$function$;

DROP TRIGGER IF EXISTS guard_paid_booking_status ON public.booking_requests;
CREATE TRIGGER guard_paid_booking_status
  BEFORE UPDATE OF status ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_paid_booking_status();

ALTER TABLE public.video_walkthrough_events DROP CONSTRAINT IF EXISTS video_walkthrough_events_event_type_check;
ALTER TABLE public.video_walkthrough_events ADD CONSTRAINT video_walkthrough_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'requested', 'scheduled', 'rescheduled', 'cancelled', 'buyer_joined', 'seller_joined',
    'host_joined', 'renter_joined', 'completed', 'no_show', 'access_granted', 'participant_left',
    'recording_started', 'recording_access_link_issued'
  ]));
