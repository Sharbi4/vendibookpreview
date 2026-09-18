-- Document kinds: keep every historical value, add the new package kinds.
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_document_type_check CHECK (
  document_type = ANY (ARRAY[
    'rental_agreement','bill_of_sale','purchase_agreement','kitchen_agreement','handoff_acknowledgment',
    'purchase_sale_agreement','sale_handoff_condition_acknowledgment','rental_checkin_condition_report',
    'rental_checkout_condition_report','transaction_amendment','delivery_handoff_acknowledgment'
  ])
);

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS template_version text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS partially_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS supersedes_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS superseded_by_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

-- One live document per kind per parent. Amendments are intentionally exempt.
CREATE UNIQUE INDEX IF NOT EXISTS documents_one_live_per_transaction
  ON public.documents (transaction_id, document_type)
  WHERE transaction_id IS NOT NULL
    AND document_type <> 'transaction_amendment'
    AND status <> 'voided'
    AND superseded_by_document_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS documents_one_live_per_booking
  ON public.documents (booking_id, document_type)
  WHERE booking_id IS NOT NULL
    AND document_type <> 'transaction_amendment'
    AND status <> 'voided'
    AND superseded_by_document_id IS NULL;

-- Completed documents are immutable records: never regenerate over them and
-- never rewrite the signed content they represent.
CREATE OR REPLACE FUNCTION public.documents_completed_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  rank_old int;
  rank_new int;
BEGIN
  rank_old := CASE OLD.status WHEN 'draft' THEN 0 WHEN 'sent' THEN 1 WHEN 'partially_signed' THEN 2 ELSE 3 END;
  rank_new := CASE NEW.status WHEN 'draft' THEN 0 WHEN 'sent' THEN 1 WHEN 'partially_signed' THEN 2 ELSE 3 END;
  IF rank_new < rank_old THEN
    NEW.status := OLD.status;
  END IF;

  IF OLD.status = 'completed' THEN
    NEW.document_type := OLD.document_type;
    NEW.signnow_document_id := OLD.signnow_document_id;
    NEW.signnow_template_id := OLD.signnow_template_id;
    NEW.agreement_version := OLD.agreement_version;
    NEW.template_version := OLD.template_version;
    NEW.snapshot := OLD.snapshot;
    NEW.terms_id := OLD.terms_id;
    NEW.transaction_id := OLD.transaction_id;
    NEW.booking_id := OLD.booking_id;
    NEW.completed_at := COALESCE(OLD.completed_at, NEW.completed_at);
    IF OLD.signed_pdf_path IS NOT NULL THEN
      NEW.signed_pdf_path := OLD.signed_pdf_path;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_completed_immutable_trg ON public.documents;
CREATE TRIGGER documents_completed_immutable_trg
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.documents_completed_immutable();

-- Versioned template registry: never overwrite a template an existing
-- document was generated from.
ALTER TABLE public.signnow_templates
  ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT '1',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.signnow_templates DROP CONSTRAINT IF EXISTS signnow_templates_status_check;
ALTER TABLE public.signnow_templates ADD CONSTRAINT signnow_templates_status_check
  CHECK (status = ANY (ARRAY['active','retired']));

ALTER TABLE public.signnow_templates DROP CONSTRAINT IF EXISTS signnow_templates_pkey;
ALTER TABLE public.signnow_templates ADD CONSTRAINT signnow_templates_pkey PRIMARY KEY (kind, version);

CREATE UNIQUE INDEX IF NOT EXISTS signnow_templates_one_active_per_kind
  ON public.signnow_templates (kind)
  WHERE status = 'active';