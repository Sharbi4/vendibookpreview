ALTER TABLE public.seller_payables
  ADD COLUMN IF NOT EXISTS release_state text,
  ADD COLUMN IF NOT EXISTS conditions_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS walkthrough_media_id uuid REFERENCES public.handoff_media(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS walkthrough_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS signnow_document_id text,
  ADD COLUMN IF NOT EXISTS agreement_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS conditions_completed_at timestamptz;

ALTER TABLE public.seller_payables
  DROP CONSTRAINT IF EXISTS seller_payables_release_state_check;
ALTER TABLE public.seller_payables
  ADD CONSTRAINT seller_payables_release_state_check CHECK (
    release_state IS NULL OR release_state IN (
      'paid', 'awaiting_walkthrough', 'awaiting_signatures',
      'ready_for_review', 'payout_recorded', 'cancelled', 'auto_refunded'
    )
  );

CREATE INDEX IF NOT EXISTS seller_payables_release_deadline_idx
  ON public.seller_payables (conditions_deadline_at)
  WHERE release_state IN ('awaiting_walkthrough', 'awaiting_signatures');

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
  SELECT * INTO _payable
  FROM public.seller_payables
  WHERE payment_record_id = _payment_record_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT * INTO _payment
  FROM public.payment_records
  WHERE id = _payment_record_id;
  IF NOT FOUND OR _payment.sale_transaction_id IS NULL THEN RETURN; END IF;

  IF _payable.release_state IN ('payout_recorded', 'cancelled', 'auto_refunded') THEN RETURN; END IF;

  SELECT hm.* INTO _walkthrough
  FROM public.handoff_media hm
  JOIN public.handoff_sessions hs ON hs.id = hm.handoff_session_id
  WHERE hs.sale_transaction_id = _payment.sale_transaction_id
    AND hm.media_type = 'video'
    AND hm.storage_path IS NOT NULL
    AND COALESCE(hm.byte_size, 0) > 0
  ORDER BY hm.created_at DESC
  LIMIT 1;

  SELECT d.* INTO _document
  FROM public.documents d
  WHERE d.transaction_id = _payment.sale_transaction_id
    AND d.document_type = 'bill_of_sale'
    AND d.status = 'completed'
    AND d.renter_signed_at IS NOT NULL
    AND d.host_signed_at IS NOT NULL
    AND d.signnow_document_id IS NOT NULL
  ORDER BY d.updated_at DESC
  LIMIT 1;

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
      conditions_deadline_at = COALESCE(
        conditions_deadline_at,
        _payment.captured_at + interval '10 days',
        _payment.created_at + interval '10 days'
      ),
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

CREATE OR REPLACE FUNCTION public.initialize_sale_release_requirements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment public.payment_records%ROWTYPE;
BEGIN
  SELECT * INTO _payment FROM public.payment_records WHERE id = NEW.payment_record_id;
  IF _payment.sale_transaction_id IS NOT NULL AND NEW.release_state IS NULL THEN
    NEW.release_state := 'awaiting_walkthrough';
    NEW.conditions_deadline_at := COALESCE(_payment.captured_at, _payment.created_at) + interval '10 days';
    NEW.payout_eligible_at := NULL;
    NEW.hold_reason := 'Waiting for a saved walkthrough video and both signatures.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seller_payables_initialize_sale_release ON public.seller_payables;
CREATE TRIGGER seller_payables_initialize_sale_release
BEFORE INSERT ON public.seller_payables
FOR EACH ROW EXECUTE FUNCTION public.initialize_sale_release_requirements();

CREATE OR REPLACE FUNCTION public.refresh_release_from_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _payment_id uuid;
BEGIN
  IF NEW.transaction_id IS NOT NULL AND NEW.document_type = 'bill_of_sale' THEN
    SELECT id INTO _payment_id FROM public.payment_records
    WHERE sale_transaction_id = NEW.transaction_id
    ORDER BY created_at DESC LIMIT 1;
    IF _payment_id IS NOT NULL THEN
      PERFORM public.refresh_sale_release_requirements(_payment_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_refresh_sale_release ON public.documents;
CREATE TRIGGER documents_refresh_sale_release
AFTER INSERT OR UPDATE OF status, renter_signed_at, host_signed_at, signnow_document_id
ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.refresh_release_from_document();

CREATE OR REPLACE FUNCTION public.refresh_release_from_handoff_media()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale_id uuid;
  _payment_id uuid;
BEGIN
  IF NEW.media_type <> 'video' OR NEW.storage_path IS NULL OR COALESCE(NEW.byte_size, 0) <= 0 THEN
    RETURN NEW;
  END IF;
  SELECT sale_transaction_id INTO _sale_id
  FROM public.handoff_sessions WHERE id = NEW.handoff_session_id;
  IF _sale_id IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO _payment_id FROM public.payment_records
  WHERE sale_transaction_id = _sale_id
  ORDER BY created_at DESC LIMIT 1;
  IF _payment_id IS NOT NULL THEN
    PERFORM public.refresh_sale_release_requirements(_payment_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handoff_media_refresh_sale_release ON public.handoff_media;
CREATE TRIGGER handoff_media_refresh_sale_release
AFTER INSERT OR UPDATE OF storage_path, media_type, byte_size
ON public.handoff_media
FOR EACH ROW EXECUTE FUNCTION public.refresh_release_from_handoff_media();

CREATE OR REPLACE FUNCTION public.sync_release_state_from_payout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'payout_completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.release_state := 'payout_recorded';
  ELSIF NEW.status = 'fully_refunded' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.release_state := 'auto_refunded';
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.release_state := 'cancelled';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seller_payables_sync_release_state ON public.seller_payables;
CREATE TRIGGER seller_payables_sync_release_state
BEFORE UPDATE OF status ON public.seller_payables
FOR EACH ROW EXECUTE FUNCTION public.sync_release_state_from_payout();

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT sp.payment_record_id
    FROM public.seller_payables sp
    JOIN public.payment_records pr ON pr.id = sp.payment_record_id
    WHERE pr.sale_transaction_id IS NOT NULL
  LOOP
    PERFORM public.refresh_sale_release_requirements(r.payment_record_id);
  END LOOP;
END;
$$;