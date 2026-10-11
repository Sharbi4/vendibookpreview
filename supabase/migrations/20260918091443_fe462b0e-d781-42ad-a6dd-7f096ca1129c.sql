-- =========================================================
-- DISPUTES PHASE 1 — Vendibook case flow + disbursement freeze
-- =========================================================

CREATE TABLE IF NOT EXISTS public.dispute_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  payment_record_id uuid REFERENCES public.payment_records(id) ON DELETE SET NULL,
  seller_payable_id uuid REFERENCES public.seller_payables(id) ON DELETE SET NULL,
  sale_transaction_id uuid REFERENCES public.sale_transactions(id) ON DELETE SET NULL,
  booking_request_id uuid REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  opened_by uuid NOT NULL,
  opened_by_role text NOT NULL CHECK (opened_by_role IN ('buyer','seller','admin')),
  issue_type text NOT NULL CHECK (issue_type IN (
    'item_not_received','not_as_described','damaged_in_transit','seller_unresponsive',
    'buyer_unresponsive','walkthrough_never_happened','agreement_not_signed','other'
  )),
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open','awaiting_buyer','awaiting_seller','awaiting_admin','resolved','closed'
  )),
  outcome text CHECK (outcome IN (
    'resolved_between_parties','refunded_full','refunded_partial','released_to_seller','closed_no_action'
  )),
  resolution_reason text,
  resolved_by uuid,
  resolved_at timestamptz,
  response_deadline_at timestamptz,
  sla_due_at timestamptz,
  disbursement_frozen boolean NOT NULL DEFAULT false,
  amount_held_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  -- Phase 2 evidence package assembly: every linkable artifact lives here.
  evidence_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  listing_snapshot jsonb,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dispute_cases TO authenticated;
GRANT ALL ON public.dispute_cases TO service_role;
ALTER TABLE public.dispute_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admins read cases"
ON public.dispute_cases FOR SELECT TO authenticated
USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_dispute_cases_buyer ON public.dispute_cases (buyer_id);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_seller ON public.dispute_cases (seller_id);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_payment ON public.dispute_cases (payment_record_id);
CREATE INDEX IF NOT EXISTS idx_dispute_cases_open ON public.dispute_cases (status) WHERE status NOT IN ('resolved','closed');

-- One open case per payment at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_case_per_payment
ON public.dispute_cases (payment_record_id)
WHERE status NOT IN ('resolved','closed') AND payment_record_id IS NOT NULL;

-- ---------------------------------------------------------
-- Append-only case thread
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispute_case_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.dispute_cases(id) ON DELETE CASCADE,
  author_id uuid,
  author_role text NOT NULL CHECK (author_role IN ('buyer','seller','admin','system')),
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  visible_to_parties boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dispute_case_messages TO authenticated;
GRANT ALL ON public.dispute_case_messages TO service_role;
ALTER TABLE public.dispute_case_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and admins read case thread"
ON public.dispute_case_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dispute_cases c
    WHERE c.id = case_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR ((c.buyer_id = auth.uid() OR c.seller_id = auth.uid()) AND visible_to_parties)
      )
  )
);

CREATE INDEX IF NOT EXISTS idx_dispute_case_messages_case ON public.dispute_case_messages (case_id, created_at);

-- ---------------------------------------------------------
-- Append-only financial audit trail
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dispute_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.dispute_cases(id) ON DELETE CASCADE,
  seller_payable_id uuid REFERENCES public.seller_payables(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  actor_id uuid,
  actor_role text,
  from_state text,
  to_state text,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dispute_case_events TO authenticated;
GRANT ALL ON public.dispute_case_events TO service_role;
ALTER TABLE public.dispute_case_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read case audit trail"
ON public.dispute_case_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_dispute_case_events_case ON public.dispute_case_events (case_id, created_at);

-- Immutability: statements and audit rows can never be altered or removed.
CREATE OR REPLACE FUNCTION public.dispute_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'dispute records are append-only';
END;
$$;
REVOKE ALL ON FUNCTION public.dispute_append_only() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS dispute_case_messages_append_only ON public.dispute_case_messages;
CREATE TRIGGER dispute_case_messages_append_only
BEFORE UPDATE OR DELETE ON public.dispute_case_messages
FOR EACH ROW EXECUTE FUNCTION public.dispute_append_only();

DROP TRIGGER IF EXISTS dispute_case_events_append_only ON public.dispute_case_events;
CREATE TRIGGER dispute_case_events_append_only
BEFORE UPDATE OR DELETE ON public.dispute_case_events
FOR EACH ROW EXECUTE FUNCTION public.dispute_append_only();

CREATE OR REPLACE FUNCTION public.dispute_cases_touch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.dispute_cases_touch() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS dispute_cases_set_updated_at ON public.dispute_cases;
CREATE TRIGGER dispute_cases_set_updated_at
BEFORE UPDATE ON public.dispute_cases
FOR EACH ROW EXECUTE FUNCTION public.dispute_cases_touch();

-- =========================================================
-- Disbursement freeze on seller_payables
-- =========================================================
ALTER TABLE public.seller_payables
  ADD COLUMN IF NOT EXISTS dispute_case_id uuid REFERENCES public.dispute_cases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dispute_frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline_remaining_seconds integer;

CREATE INDEX IF NOT EXISTS idx_seller_payables_frozen
  ON public.seller_payables (dispute_frozen_at)
  WHERE dispute_frozen_at IS NOT NULL;

-- Fail closed: no payout may advance while a freeze marker is present.
CREATE OR REPLACE FUNCTION public.block_payout_while_disputed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.dispute_frozen_at IS NOT NULL
     AND NEW.status IN ('payout_approved', 'payout_processing', 'payout_completed')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    RAISE EXCEPTION 'payout frozen by an open Vendibook case';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.block_payout_while_disputed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS seller_payables_block_while_disputed ON public.seller_payables;
CREATE TRIGGER seller_payables_block_while_disputed
BEFORE UPDATE OF status ON public.seller_payables
FOR EACH ROW EXECUTE FUNCTION public.block_payout_while_disputed();

-- Freeze: pause the 10-day clock, preserving the time that was left.
CREATE OR REPLACE FUNCTION public.freeze_payable_for_case(_payable_id uuid, _case_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _p public.seller_payables%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.seller_payables WHERE id = _payable_id FOR UPDATE;
  IF NOT FOUND OR _p.dispute_frozen_at IS NOT NULL THEN RETURN; END IF;

  UPDATE public.seller_payables
  SET dispute_case_id = _case_id,
      dispute_frozen_at = now(),
      deadline_remaining_seconds = CASE
        WHEN _p.conditions_deadline_at IS NULL THEN NULL
        ELSE GREATEST(0, EXTRACT(EPOCH FROM (_p.conditions_deadline_at - now()))::integer)
      END,
      conditions_deadline_at = NULL,
      hold_reason = 'Seller payment is paused while a Vendibook case is open.',
      updated_at = now()
  WHERE id = _payable_id;
END;
$$;
REVOKE ALL ON FUNCTION public.freeze_payable_for_case(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.freeze_payable_for_case(uuid, uuid) TO service_role;

-- Unfreeze: resume the clock with exactly the time that remained.
CREATE OR REPLACE FUNCTION public.unfreeze_payable_for_case(_payable_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _p public.seller_payables%ROWTYPE;
BEGIN
  SELECT * INTO _p FROM public.seller_payables WHERE id = _payable_id FOR UPDATE;
  IF NOT FOUND OR _p.dispute_frozen_at IS NULL THEN RETURN; END IF;

  UPDATE public.seller_payables
  SET dispute_frozen_at = NULL,
      dispute_case_id = NULL,
      conditions_deadline_at = CASE
        WHEN _p.deadline_remaining_seconds IS NULL THEN NULL
        ELSE now() + make_interval(secs => _p.deadline_remaining_seconds)
      END,
      deadline_remaining_seconds = NULL,
      hold_reason = NULL,
      updated_at = now()
  WHERE id = _payable_id;
END;
$$;
REVOKE ALL ON FUNCTION public.unfreeze_payable_for_case(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unfreeze_payable_for_case(uuid) TO service_role;

-- The release refresher must never restart a paused clock.
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
$$;
REVOKE ALL ON FUNCTION public.refresh_sale_release_requirements(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sale_release_requirements(uuid) TO service_role;