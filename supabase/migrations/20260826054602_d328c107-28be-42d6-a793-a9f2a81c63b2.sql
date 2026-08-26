ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'custom_requirement';
ALTER TYPE public.document_status ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE public.document_status ADD VALUE IF NOT EXISTS 'waived';

ALTER TABLE public.listing_required_documents
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS instructions text,
  ADD COLUMN IF NOT EXISTS requirement_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.listing_required_documents
  DROP CONSTRAINT IF EXISTS listing_required_documents_listing_id_document_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS listing_required_documents_unique_idx
  ON public.listing_required_documents (listing_id, document_type, coalesce(lower(title), ''));

ALTER TABLE public.booking_documents
  ADD COLUMN IF NOT EXISTS requirement_id uuid REFERENCES public.listing_required_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_notes text;

CREATE INDEX IF NOT EXISTS idx_booking_documents_requirement
  ON public.booking_documents (requirement_id);

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS agreement_version text,
  ADD COLUMN IF NOT EXISTS requirements_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS terms_id uuid REFERENCES public.transaction_terms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS renter_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS host_signed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_documents_terms ON public.documents (terms_id);