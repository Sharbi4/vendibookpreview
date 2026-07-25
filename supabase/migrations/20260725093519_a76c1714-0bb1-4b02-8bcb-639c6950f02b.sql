-- =========================================================================
-- SignNow e-signature foundation
-- =========================================================================

-- 1. documents ------------------------------------------------------------
CREATE TABLE public.documents (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id       uuid REFERENCES public.sale_transactions(id) ON DELETE CASCADE,
  booking_id           uuid REFERENCES public.booking_requests(id)  ON DELETE CASCADE,
  document_type        text NOT NULL CHECK (document_type IN (
                          'rental_agreement','bill_of_sale','purchase_agreement',
                          'kitchen_agreement','handoff_acknowledgment')),
  signnow_document_id  text UNIQUE,
  signnow_template_id  text,
  status               text NOT NULL DEFAULT 'draft' CHECK (status IN (
                          'draft','sent','partially_signed','completed','voided')),
  signers              jsonb NOT NULL DEFAULT '[]'::jsonb,
  signed_pdf_path      text,
  metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documents_one_parent CHECK (
    (transaction_id IS NOT NULL)::int + (booking_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX documents_transaction_idx ON public.documents(transaction_id) WHERE transaction_id IS NOT NULL;
CREATE INDEX documents_booking_idx     ON public.documents(booking_id)     WHERE booking_id     IS NOT NULL;
CREATE INDEX documents_signnow_idx     ON public.documents(signnow_document_id);

GRANT SELECT ON public.documents TO authenticated;
GRANT ALL    ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Predicate helper: is caller a participant on the linked parent?
CREATE OR REPLACE FUNCTION public.is_document_participant(_doc public.documents, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- listed as a signer with matching user_id
    EXISTS (
      SELECT 1
      FROM jsonb_array_elements(_doc.signers) s
      WHERE (s->>'user_id')::uuid = _uid
    )
    -- OR participant on the linked booking
    OR EXISTS (
      SELECT 1 FROM public.booking_requests b
      WHERE b.id = _doc.booking_id
        AND (b.host_id = _uid OR b.shopper_id = _uid)
    )
    -- OR participant on the linked sale transaction
    OR EXISTS (
      SELECT 1 FROM public.sale_transactions t
      WHERE t.id = _doc.transaction_id
        AND (t.buyer_id = _uid OR t.seller_id = _uid)
    );
$$;

CREATE POLICY documents_participant_or_admin_read
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    public.is_document_participant(documents, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER documents_touch_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. signnow_webhook_events ----------------------------------------------
CREATE TABLE public.signnow_webhook_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       text NOT NULL UNIQUE,
  event_type     text NOT NULL,
  payload        jsonb NOT NULL,
  processed_at   timestamptz,
  error          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.signnow_webhook_events TO service_role;
-- No authenticated/anon grants: webhook rows are backend-only.

ALTER TABLE public.signnow_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY signnow_webhook_events_admin_read
  ON public.signnow_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. sale_transactions.bill_of_sale_completed_at -------------------------
ALTER TABLE public.sale_transactions
  ADD COLUMN IF NOT EXISTS bill_of_sale_completed_at timestamptz;